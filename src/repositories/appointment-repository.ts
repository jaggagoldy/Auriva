// Data access for appointments. Repositories own Prisma query shapes so the
// API layer never talks to the ORM directly. Business rules (transitions,
// validation) live one level up, in src/services.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** List/include shape of the public GET /api/appointments contract. */
export const APPOINTMENT_LIST_INCLUDE = {
  patient: {
    select: { id: true, full_name: true, blood_group: true, user_id: true },
  },
  doctor: {
    select: {
      id: true,
      full_name: true,
      specialty: true,
      clinic_id: true,
      user_id: true,
    },
  },
  clinic: {
    select: { id: true, name: true, address: true },
  },
} satisfies Prisma.AppointmentInclude;

export interface AppointmentSearchFilters {
  patientId?: string | null;
  doctorId?: string | null;
  clinicId?: string | null;
  status?: string | null;
}

/** Chronological appointment search — backs GET /api/appointments. */
export function searchAppointments(filters: AppointmentSearchFilters) {
  const where: Prisma.AppointmentWhereInput = {};
  if (filters.patientId) where.patient_id = filters.patientId;
  if (filters.doctorId) where.doctor_id = filters.doctorId;
  if (filters.clinicId) where.clinic_id = filters.clinicId;
  if (filters.status) where.status = filters.status;

  return prisma.appointment.findMany({
    where,
    orderBy: { scheduled_time: "asc" },
    include: APPOINTMENT_LIST_INCLUDE,
  });
}

/**
 * Appends one row to the appointment activity timeline. Runs inside the
 * caller's transaction so a mutation and its audit entry commit together.
 */
export function createAppointmentEvent(
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
