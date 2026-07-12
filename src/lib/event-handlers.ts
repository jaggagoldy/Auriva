// Registers the platform's event subscribers (Epic C: Shared Event Platform).
// Imported once for its side effects, from src/instrumentation.ts, so the
// registry is populated before any request can call publishEvent().

import prisma from "@/lib/prisma";
import { eventRegistry, type AppEvent } from "@/lib/events";
import { isPilotOrganization } from "@/lib/pilot-orgs";
import { createNotificationOnce, resolvePatientPhone, type NotificationType } from "@/services/notification-service";
import { sendGenericSms } from "@/lib/sms";

const AUDITED_EVENT_TYPES = [
  "appointment.booked",
  "appointment.rescheduled",
  "appointment.cancelled",
  "appointment.checked_in",
  "prescription.ready",
  "invoice.generated",
  "payment.received",
  "staff.invited",
  // Release 1.2 Sprint 1 (PAT-1): these two lifecycle points previously had
  // no event emission at all (added in billing-service.ts/lab-service.ts as
  // part of this sprint) — extending the audit trail to them is the same
  // "reuse the existing audit mechanism" move Sprint 2 (OBS-3) made for
  // login/logout/profile-edits, not a new mechanism.
  "invoice.issued",
  "lab_order.resulted",
  "appointment.completed",
  // B3 (Release 1.2 Batch 2): the reminder-due event never existed before —
  // extending the audit trail to it the same way the three additions above
  // did.
  "appointment.reminder_due",
] as const;

function summarize(event: AppEvent): string {
  const payload = event.payload;
  if (payload && typeof payload === "object") {
    return JSON.stringify(payload).slice(0, 500);
  }
  return String(payload ?? "");
}

/**
 * Writes every audited business event to the same Audit_Logs table the
 * Organization Platform (Sprint 3) already uses for org/staff changes — this
 * extends that trail to appointment, billing and invitation events, which
 * previously had no audit record at all.
 */
async function auditLogHandler(event: AppEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organization_id: event.organizationId,
      actor_user_id: event.actorId ?? null,
      action: event.eventType,
      detail: summarize(event),
    },
  });
}

/**
 * Deliberately-failing handler, subscribed only to a synthetic test event
 * type. Exists so the retry/backoff/dead-letter path can be exercised for
 * real (via /admin/events "Simulate failure" or the event-platform tests)
 * instead of only being provable by reading the code.
 */
async function flakyTestHandler(): Promise<void> {
  throw new Error("Simulated handler failure (system.test.flaky)");
}

function formatWhen(date: Date): string {
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const APPOINTMENT_NOTIFICATION_COPY: Record<
  "appointment.booked" | "appointment.rescheduled" | "appointment.cancelled" | "appointment.reminder_due",
  { type: NotificationType; title: string; message: (doctorName: string, when: string) => string }
> = {
  "appointment.booked": {
    type: "appointment_booked",
    title: "Appointment confirmed",
    message: (doctorName, when) => `Your appointment with Dr. ${doctorName} on ${when} is confirmed.`,
  },
  "appointment.rescheduled": {
    type: "appointment_rescheduled",
    title: "Appointment rescheduled",
    message: (doctorName, when) => `Your appointment with Dr. ${doctorName} has been moved to ${when}.`,
  },
  "appointment.cancelled": {
    type: "appointment_cancelled",
    title: "Appointment cancelled",
    message: (doctorName, when) => `Your appointment with Dr. ${doctorName} on ${when} has been cancelled.`,
  },
  // B3 (Release 1.2 Batch 2): reuses the exact same handler/copy-table
  // pattern as the three triggers above — the only thing new is the
  // *publisher* (the time-based sweep in appointment-reminder-service.ts),
  // not the notification-generation mechanism itself.
  "appointment.reminder_due": {
    type: "appointment_reminder",
    title: "Appointment reminder",
    message: (doctorName, when) => `Reminder: your appointment with Dr. ${doctorName} is on ${when}.`,
  },
};

/**
 * PAT-1 (Release 1.2 Sprint 1): in-app notification generation for the
 * appointment lifecycle. Gated by the pilot-organization allow-list (§3 of
 * the Sprint 1 packet) — an organization not on the list produces no
 * notification, silently, not an error.
 */
async function appointmentNotificationHandler(event: AppEvent): Promise<void> {
  if (!isPilotOrganization(event.organizationId)) return;
  const copy =
    APPOINTMENT_NOTIFICATION_COPY[event.eventType as keyof typeof APPOINTMENT_NOTIFICATION_COPY];
  if (!copy) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id: event.entityId },
    select: {
      id: true,
      patient_id: true,
      scheduled_time: true,
      doctor: { select: { full_name: true } },
    },
  });
  if (!appointment) return;

  await createNotificationOnce({
    sourceEventId: event.eventId,
    patientProfileId: appointment.patient_id,
    type: copy.type,
    title: copy.title,
    message: copy.message(appointment.doctor.full_name, formatWhen(appointment.scheduled_time)),
    relatedEntityId: appointment.id,
  });
}

/** PAT-1: notification for a newly-issued invoice. */
async function invoiceIssuedNotificationHandler(event: AppEvent): Promise<void> {
  if (!isPilotOrganization(event.organizationId)) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: event.entityId },
    select: { id: true, patient_id: true, invoice_number: true, total: true },
  });
  if (!invoice) return;

  await createNotificationOnce({
    sourceEventId: event.eventId,
    patientProfileId: invoice.patient_id,
    type: "invoice_issued",
    title: "New invoice",
    message: `Invoice ${invoice.invoice_number} for ₹${invoice.total} has been issued.`,
    relatedEntityId: invoice.id,
  });
}

/** PAT-1: notification for a lab result becoming available. */
async function labResultNotificationHandler(event: AppEvent): Promise<void> {
  if (!isPilotOrganization(event.organizationId)) return;

  const labOrder = await prisma.labOrder.findUnique({
    where: { id: event.entityId },
    select: { id: true, patient_id: true },
  });
  if (!labOrder) return;

  await createNotificationOnce({
    sourceEventId: event.eventId,
    patientProfileId: labOrder.patient_id,
    type: "lab_result_ready",
    title: "Lab result ready",
    message: "Your lab result is ready to view.",
    relatedEntityId: labOrder.id,
  });
}

/**
 * PAT-2: prompts the patient to leave feedback once their visit is
 * complete. `relatedEntityId` is the appointment id — the frontend uses it
 * to link the prompt straight to that appointment's review submission.
 */
async function reviewPromptNotificationHandler(event: AppEvent): Promise<void> {
  if (!isPilotOrganization(event.organizationId)) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id: event.entityId },
    select: { id: true, patient_id: true, doctor: { select: { full_name: true } } },
  });
  if (!appointment) return;

  await createNotificationOnce({
    sourceEventId: event.eventId,
    patientProfileId: appointment.patient_id,
    type: "review_prompt",
    title: "How was your visit?",
    message: `Let us know how your visit with Dr. ${appointment.doctor.full_name} went.`,
    relatedEntityId: appointment.id,
  });
}

/**
 * B3 (Release 1.2 Batch 2): SMS delivery for exactly two triggers — booking
 * confirmation and the reminder-due event — reusing the same copy table and
 * the same doctor/scheduled-time lookup as the in-app handler above, and the
 * existing SMS abstraction (src/lib/sms) for delivery. Deliberately a
 * separate handler, not folded into appointmentNotificationHandler: each
 * handler does one delivery channel, matching the existing
 * AuditLogHandler/NotificationHandler separation, and the Event Platform's
 * own per-handler retry/DLQ (src/lib/events.ts dispatchHandler) already
 * gives this exactly-once delivery — no separate idempotency bookkeeping
 * needed here, unlike createNotificationOnce's extra defense-in-depth
 * (that one persists a row; this one doesn't).
 */
async function smsDeliveryHandler(event: AppEvent): Promise<void> {
  if (!isPilotOrganization(event.organizationId)) return;
  const copy = APPOINTMENT_NOTIFICATION_COPY[event.eventType as keyof typeof APPOINTMENT_NOTIFICATION_COPY];
  if (!copy) return;

  const appointment = await prisma.appointment.findUnique({
    where: { id: event.entityId },
    select: {
      id: true,
      patient_id: true,
      scheduled_time: true,
      doctor: { select: { full_name: true } },
    },
  });
  if (!appointment) return;

  const phone = await resolvePatientPhone(appointment.patient_id);
  if (!phone) return; // no phone on file — nothing to deliver to, not an error

  const message = copy.message(appointment.doctor.full_name, formatWhen(appointment.scheduled_time));
  const result = await sendGenericSms(phone, message);
  if (!result.ok) {
    // Thrown, not swallowed: lets the Event Platform's existing retry/DLQ
    // handle a transient delivery failure the same way every other handler
    // failure is handled — this file doesn't reimplement retry logic.
    throw new Error(`SMS delivery failed (${result.error ?? "unknown error"})`);
  }
}

let registered = false;

export function registerEventHandlers() {
  if (registered) return;
  registered = true;
  for (const eventType of AUDITED_EVENT_TYPES) {
    eventRegistry.subscribe(eventType, "AuditLogHandler", auditLogHandler);
  }
  eventRegistry.subscribe("system.test.flaky", "FlakyTestHandler", flakyTestHandler);

  // PAT-1: in-app patient notifications, additive subscribers on the
  // existing Event Platform — no second event system.
  eventRegistry.subscribe("appointment.booked", "NotificationHandler", appointmentNotificationHandler);
  eventRegistry.subscribe("appointment.rescheduled", "NotificationHandler", appointmentNotificationHandler);
  eventRegistry.subscribe("appointment.cancelled", "NotificationHandler", appointmentNotificationHandler);
  eventRegistry.subscribe("invoice.issued", "NotificationHandler", invoiceIssuedNotificationHandler);
  eventRegistry.subscribe("lab_order.resulted", "NotificationHandler", labResultNotificationHandler);
  eventRegistry.subscribe("appointment.completed", "NotificationHandler", reviewPromptNotificationHandler);
  // B3: the reminder-due event uses the exact same in-app handler as
  // booked/rescheduled/cancelled — its copy-table entry is the only thing
  // new (see APPOINTMENT_NOTIFICATION_COPY above).
  eventRegistry.subscribe("appointment.reminder_due", "NotificationHandler", appointmentNotificationHandler);

  // B3: SMS delivery — exactly two triggers, per the approved batch scope.
  eventRegistry.subscribe("appointment.booked", "SmsDeliveryHandler", smsDeliveryHandler);
  eventRegistry.subscribe("appointment.reminder_due", "SmsDeliveryHandler", smsDeliveryHandler);
}
