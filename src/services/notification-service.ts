// Release 1.2 Sprint 1 (PAT-1) — In-App Patient Notification Platform.
// Notification rows are the patient-facing projection of events already
// flowing through the existing Event Platform (src/lib/events.ts); this
// service only owns reading/writing that projection, not event dispatch.

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type NotificationType =
  | "appointment_booked"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "invoice_issued"
  | "lab_result_ready"
  // PAT-2: the post-visit feedback prompt, delivered through this same
  // notification center rather than a separate mechanism.
  | "review_prompt"
  // B3 (Release 1.2 Batch 2): one reminder before a scheduled appointment.
  | "appointment_reminder";

export class NotificationNotFoundError extends Error {}

/**
 * Creates a notification keyed to the EventLog id that produced it.
 * Idempotent: a redelivered event (Event Platform retry/replay) hits the
 * `source_event_id` unique constraint and is treated as already-handled,
 * not an error — see Sprint 1 packet §1/§4 (exactly-once acceptance
 * criterion under at-least-once event delivery).
 */
export async function createNotificationOnce(input: {
  sourceEventId: string;
  patientProfileId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string | null;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        source_event_id: input.sourceEventId,
        patient_profile_id: input.patientProfileId,
        type: input.type,
        title: input.title,
        message: input.message,
        related_entity_id: input.relatedEntityId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }
}

export function listNotificationsForPatient(patientProfileId: string) {
  return prisma.notification.findMany({
    where: { patient_profile_id: patientProfileId },
    orderBy: { created_at: "desc" },
  });
}

export function countUnreadNotifications(patientProfileId: string): Promise<number> {
  return prisma.notification.count({
    where: { patient_profile_id: patientProfileId, read_at: null },
  });
}

export async function markNotificationRead(notificationId: string, patientProfileId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, patient_profile_id: patientProfileId },
  });
  if (!notification) {
    throw new NotificationNotFoundError(`Notification ${notificationId} not found.`);
  }
  if (notification.read_at) return notification;
  return prisma.notification.update({
    where: { id: notification.id },
    data: { read_at: new Date() },
  });
}

/**
 * B3: resolves the phone number to deliver an SMS to. Reuses the existing
 * Contact model (the same one public booking and identity resolution
 * already write to) rather than PatientProfile.user_id -> User.phone_number,
 * since a booked patient often has no login account at all — Contact is the
 * one phone record every patient has regardless of how they were
 * registered. Prefers the primary contact; falls back to any phone contact.
 */
export async function resolvePatientPhone(patientProfileId: string): Promise<string | null> {
  const contact = await prisma.contact.findFirst({
    where: { healthcare_profile_id: patientProfileId, type: "phone" },
    orderBy: { is_primary: "desc" },
  });
  return contact?.value ?? null;
}
