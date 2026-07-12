// TEST-5 (Release 1.2 Sprint 1): notification-service unit coverage —
// read/unread transitions and cross-patient ownership rejection.

import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { createTestPatient } from "@/test/fixtures";
import {
  countUnreadNotifications,
  createNotificationOnce,
  listNotificationsForPatient,
  markNotificationRead,
  NotificationNotFoundError,
} from "@/services/notification-service";

const createdUserIds: string[] = [];
const createdPatientProfileIds: string[] = [];

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { patient_profile_id: { in: createdPatientProfileIds } } });
  await prisma.patientProfile.deleteMany({ where: { id: { in: createdPatientProfileIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

async function makePatient() {
  const { user, profile } = await createTestPatient();
  createdUserIds.push(user.id);
  createdPatientProfileIds.push(profile.id);
  return profile;
}

describe("notification-service", () => {
  it("creates a notification and lists it unread", async () => {
    const patient = await makePatient();
    await createNotificationOnce({
      sourceEventId: randomUUID(),
      patientProfileId: patient.id,
      type: "appointment_booked",
      title: "Appointment confirmed",
      message: "Test message",
    });

    const notifications = await listNotificationsForPatient(patient.id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].read_at).toBeNull();
    expect(await countUnreadNotifications(patient.id)).toBe(1);
  });

  it("is idempotent on a duplicate source_event_id", async () => {
    const patient = await makePatient();
    const sourceEventId = randomUUID();
    await createNotificationOnce({
      sourceEventId,
      patientProfileId: patient.id,
      type: "appointment_booked",
      title: "A",
      message: "A",
    });
    await createNotificationOnce({
      sourceEventId,
      patientProfileId: patient.id,
      type: "appointment_booked",
      title: "A",
      message: "A",
    });

    const count = await prisma.notification.count({ where: { source_event_id: sourceEventId } });
    expect(count).toBe(1);
  });

  it("marks a notification read and updates the unread count", async () => {
    const patient = await makePatient();
    await createNotificationOnce({
      sourceEventId: randomUUID(),
      patientProfileId: patient.id,
      type: "lab_result_ready",
      title: "Lab result ready",
      message: "Test message",
    });
    const [notification] = await listNotificationsForPatient(patient.id);

    const updated = await markNotificationRead(notification.id, patient.id);
    expect(updated.read_at).not.toBeNull();
    expect(await countUnreadNotifications(patient.id)).toBe(0);
  });

  it("rejects marking another patient's notification read", async () => {
    const owner = await makePatient();
    const otherPatient = await makePatient();
    await createNotificationOnce({
      sourceEventId: randomUUID(),
      patientProfileId: owner.id,
      type: "invoice_issued",
      title: "New invoice",
      message: "Test message",
    });
    const [notification] = await listNotificationsForPatient(owner.id);

    await expect(markNotificationRead(notification.id, otherPatient.id)).rejects.toThrow(
      NotificationNotFoundError
    );
  });
});
