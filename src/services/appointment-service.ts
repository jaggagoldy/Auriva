// The single choke point for appointment status changes. Both the doctor
// console (PATCH /api/appointments/[id]) and reception (PATCH
// /api/reception/status, /api/reception/checkin) call transitionStatus()
// so the business rules in appointment-status.ts are enforced once.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  AppointmentStatus,
  canTransition,
  timestampPatchFor,
} from "@/domain/appointment-status";
import { createAppointmentEvent } from "@/repositories/appointment-repository";
import { draftInvoiceForAppointment } from "@/services/billing-service";
import { publishEvent } from "@/lib/events";

export class AppointmentNotFoundError extends Error {}
export class InvalidTransitionError extends Error {}
export class DuplicateActiveAppointmentError extends Error {}
export class PatientProfileNotFoundError extends Error {}
export class DoctorProfileNotFoundError extends Error {}
export class ClinicNotFoundError extends Error {}
export class InvalidScheduleInputError extends Error {}
export class DoctorSlotConflictError extends Error {}
export class RescheduleNotAllowedError extends Error {}
export class MaxAppointmentsExceededError extends Error {}
export class CancellationNotAllowedError extends Error {}

// Statuses that occupy a doctor's calendar — a new booking (or a
// reschedule) at the exact same instant for the same doctor conflicts with
// any of these. Terminal statuses (cancelled/no_show/completed) free the slot.
// Exported so availability-service's slot computation checks conflicts
// against the exact same set of "the doctor is busy" statuses as booking
// itself does — one definition, not two that could drift apart.
export const SLOT_OCCUPYING_STATUSES = [
  "scheduled",
  "checked_in",
  "waiting",
  "doctor_ready",
  "in_consultation",
];

const APPOINTMENT_INCLUDE = {
  patient: { include: { user: { select: { phone_number: true } } } },
  doctor: true,
  clinic: true,
  prescription: true,
} satisfies Prisma.AppointmentInclude;

type ClinicPolicy = {
  buffer_minutes: number | null;
  allow_double_booking: boolean;
  max_appointments_per_doctor_per_day: number | null;
  cancellation_window_hours: number | null;
};

/**
 * Sprint 3 (OPS-001): a real, configurable double-booking guard — was a
 * hardcoded exact-instant-only check (Sprint 2). Honors
 * Clinic.allow_double_booking (skip entirely) and Clinic.buffer_minutes
 * (widen the conflict window on both sides of the requested time, so two
 * bookings closer together than the clinic's own buffer also conflict).
 */
async function assertNoDoctorSlotConflict(
  doctorId: string,
  doctorName: string,
  scheduledTime: Date,
  clinic: ClinicPolicy,
  excludeAppointmentId?: string
) {
  if (clinic.allow_double_booking) return;

  const buffer = clinic.buffer_minutes ?? 0;
  const windowStart = new Date(scheduledTime.getTime() - buffer * 60_000);
  const windowEnd = new Date(scheduledTime.getTime() + buffer * 60_000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      doctor_id: doctorId,
      scheduled_time: { gte: windowStart, lte: windowEnd },
      status: { in: SLOT_OCCUPYING_STATUSES },
    },
  });
  if (conflict) {
    throw new DoctorSlotConflictError(
      buffer > 0
        ? `${doctorName} already has an appointment within ${buffer} minutes of this time — pick another slot.`
        : `${doctorName} already has an appointment at this exact time — pick another slot.`
    );
  }
}

/** Sprint 3: caps how many appointments a doctor can be booked for on one calendar day, when the clinic sets a limit. */
async function assertUnderDailyLimit(doctorId: string, doctorName: string, scheduledTime: Date, clinic: ClinicPolicy) {
  if (!clinic.max_appointments_per_doctor_per_day) return;

  const dayStart = new Date(scheduledTime);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(scheduledTime);
  dayEnd.setHours(23, 59, 59, 999);

  const countToday = await prisma.appointment.count({
    where: {
      doctor_id: doctorId,
      scheduled_time: { gte: dayStart, lte: dayEnd },
      status: { in: SLOT_OCCUPYING_STATUSES },
    },
  });
  if (countToday >= clinic.max_appointments_per_doctor_per_day) {
    throw new MaxAppointmentsExceededError(
      `${doctorName} already has ${countToday} appointments on this day — the clinic's daily limit is ${clinic.max_appointments_per_doctor_per_day}.`
    );
  }
}

/**
 * APS-043 read-compat: the Prescription object is the storage of truth, but
 * pre-existing screens read the legacy prescription_* columns off the
 * appointment payload. Until those columns are dropped, project the object
 * back onto them so no consumer ever sees stale column data.
 */
export function withPrescriptionProjection<
  T extends {
    prescription?: {
      notes: string | null;
      medicines_json: string;
      follow_up_date: Date | null;
    } | null;
  }
>(appointment: T): T {
  if (!appointment?.prescription) return appointment;
  return {
    ...appointment,
    prescription_notes: appointment.prescription.notes,
    prescription_medicines_json: appointment.prescription.medicines_json,
    follow_up_date: appointment.prescription.follow_up_date,
  };
}

/** Fields the Consult Workbench writes as clinical documentation. Never a
 * status transition — see transitionStatus() for the one place status
 * changes are allowed to happen. */
export interface ClinicalRecordPatch {
  chief_complaint?: string | null;
  history_notes?: string | null;
  vitals_json?: string | null;
  diagnosis?: string | null;
  prescription_notes?: string | null;
  prescription_medicines_json?: string | null;
  follow_up_date?: string | null;
}

export async function updateClinicalRecord(
  appointmentId: string,
  patch: ClinicalRecordPatch
) {
  // Clinical documentation stays on the appointment (encounter stand-in);
  // prescription fields route to the Prescription object (APS-043).
  const data: Prisma.AppointmentUpdateInput = {};
  if (patch.chief_complaint !== undefined) data.chief_complaint = patch.chief_complaint;
  if (patch.history_notes !== undefined) data.history_notes = patch.history_notes;
  if (patch.vitals_json !== undefined) data.vitals_json = patch.vitals_json;
  if (patch.diagnosis !== undefined) data.diagnosis = patch.diagnosis;

  const hasRxPatch =
    patch.prescription_notes !== undefined ||
    patch.prescription_medicines_json !== undefined ||
    patch.follow_up_date !== undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.update({
      where: { id: appointmentId },
      data,
      include: APPOINTMENT_INCLUDE,
    });

    if (hasRxPatch) {
      const rxData = {
        ...(patch.prescription_notes !== undefined && { notes: patch.prescription_notes }),
        ...(patch.prescription_medicines_json !== undefined && {
          medicines_json: patch.prescription_medicines_json ?? "[]",
        }),
        ...(patch.follow_up_date !== undefined && {
          follow_up_date: patch.follow_up_date ? new Date(patch.follow_up_date) : null,
        }),
      };
      appointment.prescription = await tx.prescription.upsert({
        where: { appointment_id: appointmentId },
        create: {
          appointment_id: appointmentId,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          clinic_id: appointment.clinic_id,
          medicines_json: patch.prescription_medicines_json ?? "[]",
          notes: patch.prescription_notes ?? null,
          follow_up_date: patch.follow_up_date ? new Date(patch.follow_up_date) : null,
        },
        update: rxData,
      });
    }

    return appointment;
  });

  return withPrescriptionProjection(updated);
}

// Timeline writes moved to the repository layer; kept under the original
// name so every existing call site (reception, walk-in) is unaffected.
export const logAppointmentEvent = createAppointmentEvent;

// Intentionally the historical subset accepted by the public booking route
// since Sprint 0 — not the full status machine (see docs/technical-debt.md).
const BOOKABLE_STATUSES = ["scheduled", "waiting", "in_consultation", "completed"];

/**
 * Books a new appointment (moved out of POST /api/appointments). Validation
 * steps run in the exact order the route historically performed them —
 * existence checks first, then date, then status — and the error messages
 * are part of the public API contract. Do not reorder or reword.
 */
export async function scheduleAppointment(input: {
  patientId: string;
  doctorId: string;
  clinicId: string;
  scheduledTime: unknown;
  status?: unknown;
  notes?: unknown;
}) {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: input.patientId },
  });
  if (!patient) {
    throw new PatientProfileNotFoundError(
      `Patient Profile with id ${input.patientId} not found.`
    );
  }

  const doctor = await prisma.staffProfile.findUnique({
    where: { id: input.doctorId },
  });
  if (!doctor) {
    throw new DoctorProfileNotFoundError(
      `Doctor Profile with id ${input.doctorId} not found.`
    );
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
  });
  if (!clinic) {
    throw new ClinicNotFoundError(
      `Clinic with id ${input.clinicId} not found.`
    );
  }

  const parsedDate = new Date(input.scheduledTime as string);
  if (isNaN(parsedDate.getTime())) {
    throw new InvalidScheduleInputError(
      "Invalid date/time format for scheduled_time."
    );
  }

  const finalStatus = (input.status as string) || "scheduled";
  if (!BOOKABLE_STATUSES.includes(finalStatus)) {
    throw new InvalidScheduleInputError(
      `Invalid status. Must be one of: ${BOOKABLE_STATUSES.join(", ")}`
    );
  }

  // Sprint 2/3: a real booking never silently double-books a doctor, and
  // respects the clinic's own policy (buffer, double-booking, daily limit).
  // Walk-ins bypass this entirely (registerWalkIn has its own same-day
  // duplicate check) — this only guards the scheduled-booking path.
  await assertNoDoctorSlotConflict(input.doctorId, doctor.full_name, parsedDate, clinic);
  await assertUnderDailyLimit(input.doctorId, doctor.full_name, parsedDate, clinic);

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        clinic_id: input.clinicId,
        scheduled_time: parsedDate,
        status: finalStatus,
        notes: typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null,
      },
      include: { patient: true, doctor: true, clinic: true },
    });

    await createAppointmentEvent(tx, created.id, {
      type: "created",
      to_status: finalStatus,
    });

    return created;
  });

  await publishEvent({
    eventType: "appointment.booked",
    organizationId: appointment.clinic.organization_id,
    entityId: appointment.id,
    correlationId: appointment.id,
    payload: {
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      clinicId: appointment.clinic_id,
      scheduledTime: appointment.scheduled_time,
    },
  });

  return appointment;
}

/**
 * Reschedules a not-yet-arrived appointment to a new date/time — only valid
 * while still "scheduled" (once a patient has checked in, moving the visit
 * is a status/queue concern, not a reschedule). Reuses the same conflict
 * guard as a fresh booking.
 */
export async function rescheduleAppointment(appointmentId: string, newScheduledTime: unknown) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: { select: { full_name: true } }, clinic: true },
  });
  if (!appointment) {
    throw new AppointmentNotFoundError(`Appointment ${appointmentId} not found.`);
  }
  if (appointment.status !== "scheduled") {
    throw new RescheduleNotAllowedError(
      `Only a "scheduled" appointment can be rescheduled (this one is "${appointment.status}").`
    );
  }

  const parsedDate = new Date(newScheduledTime as string);
  if (isNaN(parsedDate.getTime())) {
    throw new InvalidScheduleInputError("Invalid date/time format for scheduled_time.");
  }

  await assertNoDoctorSlotConflict(
    appointment.doctor_id,
    appointment.doctor.full_name,
    parsedDate,
    appointment.clinic,
    appointmentId
  );

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id: appointmentId },
      data: { scheduled_time: parsedDate },
      include: APPOINTMENT_INCLUDE,
    });
    await createAppointmentEvent(tx, appointmentId, {
      type: "rescheduled",
      note: `Moved to ${parsedDate.toISOString()}`,
    });
    return result;
  });

  await publishEvent({
    eventType: "appointment.rescheduled",
    organizationId: updated.clinic.organization_id,
    entityId: updated.id,
    correlationId: updated.id,
    payload: { appointmentId: updated.id, scheduledTime: updated.scheduled_time },
  });

  return withPrescriptionProjection(updated);
}

/**
 * Sprint 2: turns a prescription's follow-up date into a real, bookable
 * Appointment instead of inert text — runs only once a visit is completed,
 * inside the same transaction as the invoice draft. Idempotent via the
 * @unique follow_up_source_appointment_id (belt-and-braces: transitionStatus
 * can only ever move a given appointment to "completed" once anyway, since
 * `completed` has no outgoing transitions).
 */
async function scheduleFollowUpIfRequested(
  tx: Prisma.TransactionClient,
  appointment: {
    id: string;
    patient_id: string;
    doctor_id: string;
    clinic_id: string;
    scheduled_time: Date;
    prescription?: { follow_up_date: Date | null } | null;
  }
) {
  const followUpDate = appointment.prescription?.follow_up_date;
  if (!followUpDate) return;

  const existing = await tx.appointment.findUnique({
    where: { follow_up_source_appointment_id: appointment.id },
  });
  if (existing) return;

  // Same time-of-day as the original visit, on the requested date — a
  // reasonable default slot without inventing an availability model.
  const scheduledTime = new Date(followUpDate);
  scheduledTime.setHours(
    appointment.scheduled_time.getHours(),
    appointment.scheduled_time.getMinutes(),
    0,
    0
  );

  const followUp = await tx.appointment.create({
    data: {
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      clinic_id: appointment.clinic_id,
      scheduled_time: scheduledTime,
      status: "scheduled",
      notes: "Follow-up visit",
      follow_up_source_appointment_id: appointment.id,
    },
  });

  await createAppointmentEvent(tx, followUp.id, {
    type: "created",
    to_status: "scheduled",
    note: "Auto-scheduled follow-up from a completed consultation",
  });
}

export async function transitionStatus(
  appointmentId: string,
  nextStatus: AppointmentStatus,
  options: { actorUserId?: string | null; note?: string | null } = {}
) {
  let generatedInvoiceId: string | null = null;

  const updated = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new AppointmentNotFoundError(`Appointment ${appointmentId} not found.`);
    }

    const from = appointment.status as AppointmentStatus;
    if (!canTransition(from, nextStatus)) {
      throw new InvalidTransitionError(
        `Cannot move an appointment from "${from}" to "${nextStatus}".`
      );
    }

    // Sprint 3: the clinic's own cancellation-window policy — e.g. "no
    // cancelling within 2 hours of the visit." Applies to whoever cancels
    // (reception or the patient), since it's a clinic-level operating rule,
    // not a per-caller permission.
    if (nextStatus === "cancelled") {
      const clinic = await tx.clinic.findUnique({ where: { id: appointment.clinic_id } });
      if (clinic?.cancellation_window_hours) {
        const hoursUntilVisit = (appointment.scheduled_time.getTime() - Date.now()) / 3_600_000;
        if (hoursUntilVisit >= 0 && hoursUntilVisit < clinic.cancellation_window_hours) {
          throw new CancellationNotAllowedError(
            `This clinic requires cancellations at least ${clinic.cancellation_window_hours} hours before the visit.`
          );
        }
      }
    }

    const timestampPatch = timestampPatchFor(nextStatus, appointment);

    const updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: nextStatus, ...timestampPatch },
      include: APPOINTMENT_INCLUDE,
    });

    await logAppointmentEvent(tx, appointmentId, {
      type: "status_changed",
      from_status: from,
      to_status: nextStatus,
      note: options.note,
      actorUserId: options.actorUserId,
    });

    // WF-17 / APS-041: a completed consultation auto-drafts its invoice —
    // same transaction, so the visit and its charge can never diverge.
    if (nextStatus === "completed") {
      const invoice = await draftInvoiceForAppointment(tx, updated);
      generatedInvoiceId = invoice.id;
      await scheduleFollowUpIfRequested(tx, updated);
    }

    return updated;
  });

  const organizationId = updated.clinic.organization_id;
  const correlationId = updated.id;

  if (nextStatus === "cancelled") {
    await publishEvent({
      eventType: "appointment.cancelled",
      organizationId,
      entityId: updated.id,
      correlationId,
      actorId: options.actorUserId,
      payload: { appointmentId: updated.id, note: options.note ?? null },
    });
  }

  if (nextStatus === "completed") {
    // PAT-2 (Release 1.2 Sprint 1): drives the post-visit feedback prompt in
    // the notification center. This lifecycle point never published an
    // event before — additive, same pattern as the invoice/prescription
    // events immediately below.
    await publishEvent({
      eventType: "appointment.completed",
      organizationId,
      entityId: updated.id,
      correlationId,
      payload: { appointmentId: updated.id, patientId: updated.patient_id },
    });
    if (generatedInvoiceId) {
      await publishEvent({
        eventType: "invoice.generated",
        organizationId,
        entityId: generatedInvoiceId,
        correlationId,
        payload: { invoiceId: generatedInvoiceId, appointmentId: updated.id },
      });
    }
    if (updated.prescription) {
      await publishEvent({
        eventType: "prescription.ready",
        organizationId,
        entityId: updated.prescription.id,
        correlationId,
        payload: {
          prescriptionId: updated.prescription.id,
          appointmentId: updated.id,
          patientId: updated.patient_id,
        },
      });
    }
  }

  return withPrescriptionProjection(updated);
}

export async function getAppointmentWithEvents(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      ...APPOINTMENT_INCLUDE,
      events: { orderBy: { created_at: "asc" } },
    },
  });
  return appointment ? withPrescriptionProjection(appointment) : appointment;
}
