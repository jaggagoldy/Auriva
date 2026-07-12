import prisma from "@/lib/prisma";
import { memberRoleFromSpecialty } from "@/domain/organization";
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
          memberships: {
            where: { organization_id: clinic?.organization_id },
            select: { role: true },
          },
        },
      },
    },
  });
  // APS-040: the membership row is the role source of truth; the specialty
  // heuristic remains only for profiles that predate the backfill.
  const doctors = staff.filter(
    (member) =>
      (member.user.memberships[0]?.role ??
        memberRoleFromSpecialty(member.specialty)) === "doctor"
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
