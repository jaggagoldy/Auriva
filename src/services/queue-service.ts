import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const QUEUE_INCLUDE = {
  // `allergies` (M1 · 4.4) + `health_id`/phone (M2 · 4.1 Quick Peek) — all
  // projections, no new columns, no behaviour change.
  patient: {
    select: {
      id: true,
      full_name: true,
      blood_group: true,
      user_id: true,
      allergies: true,
      health_id: true,
      user: { select: { phone_number: true } },
    },
  },
  doctor: { select: { id: true, full_name: true, specialty: true, clinic_id: true, user_id: true } },
  clinic: { select: { id: true, name: true, address: true, organization_id: true } },
} satisfies Prisma.AppointmentInclude;

/** Milestone 1 (1.2/1.6/4.4): per-row context computed from EXISTING billing +
 *  appointment data — display only, always derived from the same invoice source
 *  as the Desk so the numbers can never disagree. Batched (3 queries total,
 *  independent of queue size) to avoid an N+1. */
export interface QueueEnrichment {
  /** Has a prior COMPLETED visit at this clinic (excludes today's rows). */
  is_returning: boolean;
  /** Total open-invoice balance for this patient at this clinic (all open invoices). */
  patient_outstanding_balance: number;
  /** Balance on THIS appointment's invoice (the "Collect ₹X" amount); 0 if none/paid. */
  invoice_balance: number;
  /** ISO date of the patient's most recent completed visit at this clinic (M2 · 4.1). */
  last_visit_at: string | null;
}

async function enrichQueue<T extends { id: string; patient_id: string }>(
  appointments: T[],
  clinicId: string
): Promise<(T & QueueEnrichment)[]> {
  if (appointments.length === 0) return [];
  const patientIds = [...new Set(appointments.map((a) => a.patient_id))];
  const appointmentIds = appointments.map((a) => a.id);

  // 1) Returning + last-visit: patients with a prior completed visit at this
  //    clinic (not today's rows), and the most recent one's date.
  const priorCompleted = await prisma.appointment.groupBy({
    by: ["patient_id"],
    where: {
      clinic_id: clinicId,
      patient_id: { in: patientIds },
      status: "completed",
      id: { notIn: appointmentIds },
    },
    _count: { _all: true },
    _max: { completed_at: true },
  });
  const returning = new Set(priorCompleted.filter((c) => c._count._all > 0).map((c) => c.patient_id));
  const lastVisitByPatient = new Map<string, string>();
  for (const c of priorCompleted) {
    if (c._max.completed_at) lastVisitByPatient.set(c.patient_id, c._max.completed_at.toISOString());
  }

  // 2/3) Open invoices → per-patient outstanding + per-appointment balance.
  const openInvoices = await prisma.invoice.findMany({
    where: {
      clinic_id: clinicId,
      patient_id: { in: patientIds },
      status: { in: ["draft", "issued"] },
    },
    select: {
      patient_id: true,
      appointment_id: true,
      total: true,
      payments: { select: { amount: true } },
    },
  });
  const balanceByPatient = new Map<string, number>();
  const balanceByAppointment = new Map<string, number>();
  for (const inv of openInvoices) {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, inv.total - paid);
    balanceByPatient.set(inv.patient_id, (balanceByPatient.get(inv.patient_id) ?? 0) + balance);
    if (inv.appointment_id) {
      balanceByAppointment.set(inv.appointment_id, (balanceByAppointment.get(inv.appointment_id) ?? 0) + balance);
    }
  }

  return appointments.map((a) => ({
    ...a,
    is_returning: returning.has(a.patient_id),
    patient_outstanding_balance: balanceByPatient.get(a.patient_id) ?? 0,
    invoice_balance: balanceByAppointment.get(a.id) ?? 0,
    last_visit_at: lastVisitByPatient.get(a.patient_id) ?? null,
  }));
}

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

  const appointments = await prisma.appointment.findMany({
    where,
    include: QUEUE_INCLUDE,
    orderBy: [{ priority: "desc" }, { queue_number: "asc" }, { scheduled_time: "asc" }],
  });
  return enrichQueue(appointments, params.clinicId);
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
