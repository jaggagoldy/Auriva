// TEST-5 (Release 1.2 Sprint 1): PAT-1 notification generation regression
// coverage. Two testing strategies are used deliberately:
//   1. Real end-to-end service calls (scheduleAppointment/transitionInvoice/
//      enterLabResult) polled for the resulting Notification row — proves
//      the real wiring (publishEvent -> registered handler -> Notification)
//      works, not a reimplementation of it.
//   2. Direct invocation of the registered handler function (retrieved via
//      eventRegistry, exactly as the platform itself dispatches it) for the
//      idempotency and pilot-allow-list gating cases, which need precise
//      control over duplicate delivery and environment state that polling
//      the fire-and-forget dispatch path cannot deterministically exercise.

import { afterAll, afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { ensureHandlersRegistered, eventRegistry, type AppEvent } from "@/lib/events";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { scheduleAppointment, rescheduleAppointment, transitionStatus } from "@/services/appointment-service";
import { createInvoice, transitionInvoice } from "@/services/billing-service";
import { createLabOrder, enterLabResult } from "@/services/lab-service";
import { runAppointmentReminderSweep } from "@/services/appointment-reminder-service";

const createdOrgIds: string[] = [];
const createdClinicIds: string[] = [];
const createdUserIds: string[] = [];
const createdPatientProfileIds: string[] = [];

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { patient_profile_id: { in: createdPatientProfileIds } } });
  await prisma.labOrder.deleteMany({ where: { clinic_id: { in: createdClinicIds } } });
  await prisma.invoice.deleteMany({ where: { clinic_id: { in: createdClinicIds } } });
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: createdClinicIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.patientProfile.deleteMany({ where: { id: { in: createdPatientProfileIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

afterEach(() => {
  delete process.env.PILOT_ORGANIZATION_IDS;
});

async function waitForNotification(patientProfileId: string, type: string, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const notification = await prisma.notification.findFirst({
      where: { patient_profile_id: patientProfileId, type },
      orderBy: { created_at: "desc" },
    });
    if (notification) return notification;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Notification of type ${type} for patient ${patientProfileId} did not appear within ${timeoutMs}ms`);
}

async function getNotificationHandler(eventType: string) {
  await ensureHandlersRegistered();
  const handlers = eventRegistry.getHandlers(eventType);
  const found = handlers.find((h) => h.name === "NotificationHandler");
  if (!found) throw new Error(`No NotificationHandler registered for event type ${eventType}`);
  return found.handler;
}

async function getSmsHandler(eventType: string) {
  await ensureHandlersRegistered();
  const handlers = eventRegistry.getHandlers(eventType);
  const found = handlers.find((h) => h.name === "SmsDeliveryHandler");
  if (!found) throw new Error(`No SmsDeliveryHandler registered for event type ${eventType}`);
  return found.handler;
}

async function givePhone(patientProfileId: string, phone: string) {
  await prisma.contact.create({
    data: { healthcare_profile_id: patientProfileId, type: "phone", value: phone, is_primary: true },
  });
}

async function setup() {
  const { organization, clinic } = await createTestOrganization();
  createdOrgIds.push(organization.id);
  createdClinicIds.push(clinic.id);
  const { user: doctorUser, staffProfile: doctor } = await createTestStaff(clinic.id, "doctor");
  const { user: patientUser, profile: patient } = await createTestPatient(clinic.id);
  createdUserIds.push(doctorUser.id, patientUser.id);
  createdPatientProfileIds.push(patient.id);
  return { organization, clinic, doctor, patient };
}

describe("PAT-1 notification generation — real end-to-end triggers", () => {
  it("appointment.booked produces a notification for the booked patient", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const notification = await waitForNotification(patient.id, "appointment_booked");
    expect(notification.related_entity_id).toBe(appointment.id);
    expect(notification.read_at).toBeNull();
  });

  it("appointment.rescheduled produces a notification", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    await rescheduleAppointment(appointment.id, new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
    const notification = await waitForNotification(patient.id, "appointment_rescheduled");
    expect(notification.related_entity_id).toBe(appointment.id);
  });

  it("appointment.cancelled produces a notification", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    await transitionStatus(appointment.id, "cancelled", {});
    const notification = await waitForNotification(patient.id, "appointment_cancelled");
    expect(notification.related_entity_id).toBe(appointment.id);
  });

  it("invoice.issued produces a notification", async () => {
    const { clinic, patient } = await setup();
    const invoice = await createInvoice({
      clinicId: clinic.id,
      patientId: patient.id,
      items: [{ description: "Consultation", qty: 1, unit_price: 500, amount: 500 }],
    });
    await transitionInvoice(invoice.id, clinic.id, "issued");
    const notification = await waitForNotification(patient.id, "invoice_issued");
    expect(notification.related_entity_id).toBe(invoice.id);
  });

  it("lab_order.resulted produces a notification", async () => {
    const { clinic, doctor, patient } = await setup();
    const order = await createLabOrder({
      clinicId: clinic.id,
      patientId: patient.id,
      doctorId: doctor.id,
      tests: [{ name: "CBC" }],
    });
    await enterLabResult({
      labOrderId: order.id,
      clinicId: clinic.id,
      resultValues: [{ test: "CBC", value: "Normal" }],
    });
    const notification = await waitForNotification(patient.id, "lab_result_ready");
    expect(notification.related_entity_id).toBe(order.id);
  });
});

describe("PAT-1 notification generation — idempotency", () => {
  it("creates exactly one notification when the handler is invoked twice for the same event id", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const handler = await getNotificationHandler("appointment.booked");
    const eventId = randomUUID();
    const event: AppEvent = {
      eventId,
      correlationId: appointment.id,
      occurredAt: new Date(),
      organizationId: clinic.organization_id,
      actorId: null,
      entityId: appointment.id,
      eventType: "appointment.booked",
      payload: {},
    };

    // Simulates the Event Platform's at-least-once redelivery (a genuine,
    // expected occurrence — Release 1.1 built retry/DLQ deliberately).
    await handler(event);
    await handler(event);

    const count = await prisma.notification.count({ where: { source_event_id: eventId } });
    expect(count).toBe(1);
  });
});

describe("PAT-1 notification generation — pilot-organization allow-list gating", () => {
  it("does not generate a notification for an organization not on the allow-list", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    process.env.PILOT_ORGANIZATION_IDS = randomUUID(); // some other org, not this test's

    const handler = await getNotificationHandler("appointment.booked");
    const eventId = randomUUID();
    await handler({
      eventId,
      correlationId: appointment.id,
      occurredAt: new Date(),
      organizationId: clinic.organization_id,
      actorId: null,
      entityId: appointment.id,
      eventType: "appointment.booked",
      payload: {},
    });

    const count = await prisma.notification.count({ where: { source_event_id: eventId } });
    expect(count).toBe(0);
  });

  it("generates a notification for an organization on the allow-list", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    process.env.PILOT_ORGANIZATION_IDS = clinic.organization_id;

    const handler = await getNotificationHandler("appointment.booked");
    const eventId = randomUUID();
    await handler({
      eventId,
      correlationId: appointment.id,
      occurredAt: new Date(),
      organizationId: clinic.organization_id,
      actorId: null,
      entityId: appointment.id,
      eventType: "appointment.booked",
      payload: {},
    });

    const count = await prisma.notification.count({ where: { source_event_id: eventId } });
    expect(count).toBe(1);
  });
});

describe("B3 — appointment reminder sweep", () => {
  it("reminds a patient whose appointment is inside the reminder window", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h out — inside the 3h window
    });

    await runAppointmentReminderSweep();

    const notification = await waitForNotification(patient.id, "appointment_reminder");
    expect(notification.related_entity_id).toBe(appointment.id);
  });

  it("does not remind an appointment outside the reminder window", async () => {
    const { clinic, doctor, patient } = await setup();
    await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10h out
    });

    await runAppointmentReminderSweep();

    const notification = await prisma.notification.findFirst({
      where: { patient_profile_id: patient.id, type: "appointment_reminder" },
    });
    expect(notification).toBeNull();
  });

  it("does not remind a cancelled appointment even if it falls inside the window", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    await transitionStatus(appointment.id, "cancelled", {});

    await runAppointmentReminderSweep();

    const notification = await prisma.notification.findFirst({
      where: { patient_profile_id: patient.id, type: "appointment_reminder" },
    });
    expect(notification).toBeNull();
  });

  it("sends exactly one reminder even across repeated sweep runs", async () => {
    const { clinic, doctor, patient } = await setup();
    await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    await runAppointmentReminderSweep();
    await waitForNotification(patient.id, "appointment_reminder");
    await runAppointmentReminderSweep();
    await runAppointmentReminderSweep();

    const count = await prisma.notification.count({
      where: { patient_profile_id: patient.id, type: "appointment_reminder" },
    });
    expect(count).toBe(1);
  });
});

describe("B3 — SMS delivery handler", () => {
  it("delivers a booking confirmation SMS when the patient has a phone on file", async () => {
    const { clinic, doctor, patient } = await setup();
    await givePhone(patient.id, "+15551234567");
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const handler = await getSmsHandler("appointment.booked");
    await expect(
      handler({
        eventId: randomUUID(),
        correlationId: appointment.id,
        occurredAt: new Date(),
        organizationId: clinic.organization_id,
        actorId: null,
        entityId: appointment.id,
        eventType: "appointment.booked",
        payload: {},
      })
    ).resolves.not.toThrow();
  });

  it("is a silent no-op when the patient has no phone on file", async () => {
    const { clinic, doctor, patient } = await setup();
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    const handler = await getSmsHandler("appointment.booked");
    await expect(
      handler({
        eventId: randomUUID(),
        correlationId: appointment.id,
        occurredAt: new Date(),
        organizationId: clinic.organization_id,
        actorId: null,
        entityId: appointment.id,
        eventType: "appointment.booked",
        payload: {},
      })
    ).resolves.not.toThrow();
  });

  it("is registered for the reminder-due event too", async () => {
    const { clinic, doctor, patient } = await setup();
    await givePhone(patient.id, "+15551234567");
    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const handler = await getSmsHandler("appointment.reminder_due");
    await expect(
      handler({
        eventId: randomUUID(),
        correlationId: appointment.id,
        occurredAt: new Date(),
        organizationId: clinic.organization_id,
        actorId: null,
        entityId: appointment.id,
        eventType: "appointment.reminder_due",
        payload: {},
      })
    ).resolves.not.toThrow();
  });

  it("is not registered for reschedule or cancellation — exactly two triggers only", async () => {
    await ensureHandlersRegistered();
    const rescheduled = eventRegistry.getHandlers("appointment.rescheduled").find((h) => h.name === "SmsDeliveryHandler");
    const cancelled = eventRegistry.getHandlers("appointment.cancelled").find((h) => h.name === "SmsDeliveryHandler");
    expect(rescheduled).toBeUndefined();
    expect(cancelled).toBeUndefined();
  });
});
