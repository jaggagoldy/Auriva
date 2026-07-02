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
} from "@/domain/appointment-status";
import { createAppointmentEvent } from "@/repositories/appointment-repository";

export class AppointmentNotFoundError extends Error {}
export class InvalidTransitionError extends Error {}
export class DuplicateActiveAppointmentError extends Error {}
export class PatientProfileNotFoundError extends Error {}
export class DoctorProfileNotFoundError extends Error {}
export class ClinicNotFoundError extends Error {}
export class InvalidScheduleInputError extends Error {}

const APPOINTMENT_INCLUDE = {
  patient: { include: { user: { select: { phone_number: true } } } },
  doctor: true,
  clinic: true,
} satisfies Prisma.AppointmentInclude;

// Timeline writes moved to the repository layer; kept under the original
// name so every existing call site (reception, walk-in) is unaffected.
export const logAppointmentEvent = createAppointmentEvent;

// Intentionally the historical subset accepted by the public booking route
// since Sprint 0 — not the full status machine (see docs/technical-debt.md).
const BOOKABLE_STATUSES = ["scheduled", "waiting", "in_consultation", "completed"];

/**
 * Books a new appointment (moved out of POST /api/appointments). Validation
 * steps run in the exact order the route historically performed them —
 * existence checks first, then date, then status — and the error messages
 * are part of the public API contract. Do not reorder or reword.
 */
export async function scheduleAppointment(input: {
  patientId: string;
  doctorId: string;
  clinicId: string;
  scheduledTime: unknown;
  status?: unknown;
}) {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: input.patientId },
  });
  if (!patient) {
    throw new PatientProfileNotFoundError(
      `Patient Profile with id ${input.patientId} not found.`
    );
  }

  const doctor = await prisma.staffProfile.findUnique({
    where: { id: input.doctorId },
  });
  if (!doctor) {
    throw new DoctorProfileNotFoundError(
      `Doctor Profile with id ${input.doctorId} not found.`
    );
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
  });
  if (!clinic) {
    throw new ClinicNotFoundError(
      `Clinic with id ${input.clinicId} not found.`
    );
  }

  const parsedDate = new Date(input.scheduledTime as string);
  if (isNaN(parsedDate.getTime())) {
    throw new InvalidScheduleInputError(
      "Invalid date/time format for scheduled_time."
    );
  }

  const finalStatus = (input.status as string) || "scheduled";
  if (!BOOKABLE_STATUSES.includes(finalStatus)) {
    throw new InvalidScheduleInputError(
      `Invalid status. Must be one of: ${BOOKABLE_STATUSES.join(", ")}`
    );
  }

  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        clinic_id: input.clinicId,
        scheduled_time: parsedDate,
        status: finalStatus,
      },
      include: { patient: true, doctor: true, clinic: true },
    });

    await createAppointmentEvent(tx, appointment.id, {
      type: "created",
      to_status: finalStatus,
    });

    return appointment;
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
