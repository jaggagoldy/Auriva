import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const QUEUE_INCLUDE = {
  patient: { select: { id: true, full_name: true, blood_group: true, user_id: true } },
  doctor: { select: { id: true, full_name: true, specialty: true, clinic_id: true, user_id: true } },
  clinic: { select: { id: true, name: true, address: true, organization_id: true } },
} satisfies Prisma.AppointmentInclude;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getQueue(params: {
  clinicId: string;
  doctorId?: string;
  date?: Date;
  search?: string;
}) {
  const day = params.date ?? new Date();
  const where: Prisma.AppointmentWhereInput = {
    clinic_id: params.clinicId,
    scheduled_time: { gte: startOfDay(day), lte: endOfDay(day) },
  };
  if (params.doctorId) where.doctor_id = params.doctorId;

  const search = params.search?.trim();
  if (search) {
    where.patient = {
      OR: [
        { full_name: { contains: search } },
        { user: { phone_number: { contains: search } } },
      ],
    };
  }

  return prisma.appointment.findMany({
    where,
    include: QUEUE_INCLUDE,
    orderBy: [{ priority: "desc" }, { queue_number: "asc" }, { scheduled_time: "asc" }],
  });
}

export class QueueAppointmentNotFoundError extends Error {}

/** Persists drag-and-drop queue reordering — a pure ordering change, not a status transition. */
export async function setPriority(appointmentId: string, clinicId: string, priority: number) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.clinic_id !== clinicId) {
    throw new QueueAppointmentNotFoundError(`Appointment ${appointmentId} not found.`);
  }
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { priority },
    include: QUEUE_INCLUDE,
  });
}

/**
 * Next queue number for a doctor's day, computed inside the caller's
 * transaction. Application-enforced (not a DB constraint) — see the Sprint 1
 * plan for why: SQLite has no date-truncated unique index, and at
 * pilot-clinic volume a transactional read-then-write is sufficient.
 */
export async function assignQueueNumber(
  tx: Prisma.TransactionClient,
  doctorId: string,
  day: Date = new Date()
): Promise<number> {
  const agg = await tx.appointment.aggregate({
    where: {
      doctor_id: doctorId,
      scheduled_time: { gte: startOfDay(day), lte: endOfDay(day) },
    },
    _max: { queue_number: true },
  });
  return (agg._max.queue_number ?? 0) + 1;
}
