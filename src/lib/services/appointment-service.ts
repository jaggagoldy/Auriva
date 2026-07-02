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
} from "@/lib/appointment-status";

export class AppointmentNotFoundError extends Error {}
export class InvalidTransitionError extends Error {}
export class DuplicateActiveAppointmentError extends Error {}

const APPOINTMENT_INCLUDE = {
  patient: { include: { user: { select: { phone_number: true } } } },
  doctor: true,
  clinic: true,
} satisfies Prisma.AppointmentInclude;

export async function logAppointmentEvent(
  tx: Prisma.TransactionClient,
  appointmentId: string,
  data: {
    type: string;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    actorUserId?: string | null;
  }
) {
  return tx.appointmentEvent.create({
    data: {
      appointment_id: appointmentId,
      type: data.type,
      from_status: data.from_status ?? null,
      to_status: data.to_status ?? null,
      note: data.note ?? null,
      actor_user_id: data.actorUserId ?? null,
    },
  });
}

export async function transitionStatus(
  appointmentId: string,
  nextStatus: AppointmentStatus,
  options: { actorUserId?: string | null; note?: string | null } = {}
) {
  return prisma.$transaction(async (tx) => {
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

    return updated;
  });
}

export async function getAppointmentWithEvents(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      ...APPOINTMENT_INCLUDE,
      events: { orderBy: { created_at: "asc" } },
    },
  });
}
