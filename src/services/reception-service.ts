import prisma from "@/lib/prisma";
import {
  AppointmentNotFoundError,
  InvalidTransitionError,
  logAppointmentEvent,
} from "@/services/appointment-service";
import { assignQueueNumber, getQueue, QUEUE_INCLUDE } from "@/services/queue-service";
import { publishEvent } from "@/lib/events";

/**
 * Check-in transitions a scheduled appointment straight to "waiting" (see
 * appointment-status.ts) but logs both "checked_in" and "status_changed"
 * timeline entries, matching the two-step activity log the sprint spec
 * shows (arrival, then queued). Rejects anything not currently "scheduled"
 * — this is what prevents double check-in and checking in a cancelled visit.
 */
export async function checkIn(
  appointmentId: string,
  clinicId: string,
  actorUserId?: string | null
) {
  const updated = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.clinic_id !== clinicId) {
      throw new AppointmentNotFoundError(`Appointment ${appointmentId} not found.`);
    }
    if (appointment.status !== "scheduled") {
      throw new InvalidTransitionError(
        `This appointment is already "${appointment.status}" and cannot be checked in.`
      );
    }

    const now = new Date();
    const queueNumber =
      appointment.queue_number ?? (await assignQueueNumber(tx, appointment.doctor_id, now));

    const result = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "waiting", checked_in_at: now, queue_number: queueNumber },
      include: QUEUE_INCLUDE,
    });

    await logAppointmentEvent(tx, appointmentId, {
      type: "checked_in",
      from_status: "scheduled",
      to_status: "checked_in",
      actorUserId,
    });
    await logAppointmentEvent(tx, appointmentId, {
      type: "status_changed",
      from_status: "checked_in",
      to_status: "waiting",
      actorUserId,
    });

    return result;
  });

  await publishEvent({
    eventType: "appointment.checked_in",
    organizationId: updated.clinic.organization_id,
    entityId: updated.id,
    correlationId: updated.id,
    actorId: actorUserId,
    payload: { appointmentId: updated.id, queueNumber: updated.queue_number },
  });

  return updated;
}

// Milestone 2 · 3.4 — reassigning a waiting patient to another doctor. This is a
// FIELD update (doctor_id), not a status transition, so it never touches the
// status machine. Product Office decision F: only before the consult begins.
const REASSIGN_BLOCKED_STATUSES = ["in_consultation", "completed", "cancelled", "no_show"];

export async function reassignDoctor(
  appointmentId: string,
  newDoctorId: string,
  clinicId: string,
  actorUserId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { select: { full_name: true } } },
    });
    if (!appointment || appointment.clinic_id !== clinicId) {
      throw new AppointmentNotFoundError(`Appointment ${appointmentId} not found.`);
    }
    if (REASSIGN_BLOCKED_STATUSES.includes(appointment.status)) {
      throw new InvalidTransitionError(
        `A patient who is "${appointment.status}" can no longer be reassigned to another doctor.`
      );
    }
    // The new doctor must be a staff profile on THIS clinic (tenant safety).
    const newDoctor = await tx.staffProfile.findFirst({
      where: { id: newDoctorId, clinic_id: clinicId },
      select: { id: true, full_name: true },
    });
    if (!newDoctor) {
      throw new AppointmentNotFoundError(`That doctor is not on this clinic.`);
    }
    if (appointment.doctor_id === newDoctorId) {
      return tx.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: QUEUE_INCLUDE });
    }

    // Give the patient the new doctor's next queue number when already queued.
    const newQueueNumber =
      appointment.queue_number != null ? await assignQueueNumber(tx, newDoctorId, new Date()) : null;

    const result = await tx.appointment.update({
      where: { id: appointmentId },
      data: { doctor_id: newDoctorId, queue_number: newQueueNumber },
      include: QUEUE_INCLUDE,
    });

    // Audit (Product Office req #1): from → to doctor · who · when.
    await logAppointmentEvent(tx, appointmentId, {
      type: "doctor_reassigned",
      note: `Reassigned from ${appointment.doctor.full_name} to ${newDoctor.full_name}`,
      actorUserId,
    });

    return result;
  });
}

export async function getDashboardSummary(clinicId: string) {
  const today = new Date();
  const queue = await getQueue({ clinicId, date: today });

  const counts: Record<string, number> = {};
  for (const appointment of queue) {
    counts[appointment.status] = (counts[appointment.status] ?? 0) + 1;
  }

  // Sprint 3: membership rows are org-scoped, not clinic-scoped — a
  // clinic's own id only doubled as its organization_id for pre-Sprint-3,
  // single-clinic organizations. Resolve the clinic's real organization_id
  // first (matches the same fix in /api/doctors and staff-repository).
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { organization_id: true },
  });

  const staff = await prisma.staffProfile.findMany({
    where: { clinic_id: clinicId },
    select: {
      id: true,
      full_name: true,
      specialty: true,
      user: {
        select: {
          role: true,
          memberships: {
            where: { organization_id: clinic?.organization_id },
            select: { role: true },
          },
        },
      },
    },
  });
  // D4: the member's explicit role is the source of truth — the org-membership
  // role, falling back to their account role. No specialty inference.
  const doctors = staff.filter(
    (member) => (member.user.memberships[0]?.role ?? member.user.role) === "doctor"
  );

  const doctorLoad = doctors.map((doctor) => {
    const appointmentsForDoctor = queue.filter((a) => a.doctor_id === doctor.id);
    return {
      id: doctor.id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      waiting: appointmentsForDoctor.filter((a) =>
        ["waiting", "doctor_ready"].includes(a.status)
      ).length,
      in_consultation: appointmentsForDoctor.filter((a) => a.status === "in_consultation")
        .length,
      total_today: appointmentsForDoctor.length,
    };
  });

  return {
    date: today.toISOString(),
    clinic_id: clinicId,
    total_today: queue.length,
    counts,
    doctors: doctorLoad,
  };
}
