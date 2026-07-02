import prisma from "@/lib/prisma";
import { memberRoleFromSpecialty } from "@/domain/organization";
import {
  AppointmentNotFoundError,
  InvalidTransitionError,
  logAppointmentEvent,
} from "@/services/appointment-service";
import { assignQueueNumber, getQueue, QUEUE_INCLUDE } from "@/services/queue-service";

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
  return prisma.$transaction(async (tx) => {
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

    const updated = await tx.appointment.update({
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

    return updated;
  });
}

export async function getDashboardSummary(clinicId: string) {
  const today = new Date();
  const queue = await getQueue({ clinicId, date: today });

  const counts: Record<string, number> = {};
  for (const appointment of queue) {
    counts[appointment.status] = (counts[appointment.status] ?? 0) + 1;
  }

  const staff = await prisma.staffProfile.findMany({
    where: { clinic_id: clinicId },
    select: { id: true, full_name: true, specialty: true },
  });
  // Staff_Profiles has no role column — role derivation is centralized in
  // src/domain/organization.ts so all consumers agree.
  const doctors = staff.filter(
    (member) => memberRoleFromSpecialty(member.specialty) === "doctor"
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
