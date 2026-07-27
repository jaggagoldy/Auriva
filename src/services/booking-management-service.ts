import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import {
  canCancelAppointment,
  canRescheduleAppointment,
} from "@/services/booking-policy-engine-service";
import { assertNoDoctorSlotConflict } from "@/services/appointment-service";

export class BookingNotFoundError extends Error {}
export class BookingPolicyViolationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}
export class OptimisticConcurrencyError extends Error {}

export interface BookingDetailsResult {
  id: string;
  manageToken: string;
  scheduledTime: Date;
  status: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorId: string;
  specialty: string | null;
  clinicName: string;
  clinicId: string;
  clinicAddress: string | null;
  clinicPhone: string | null;
  updatedAt: Date;
  rescheduleCount: number;
  canCancel: boolean;
  canReschedule: boolean;
  policyReason?: string;
}

/**
 * Resolves appointment details and policy permissions by manage_token.
 */
export async function getBookingDetailsByToken(token: string): Promise<BookingDetailsResult> {
  const appt = await prisma.appointment.findFirst({
    where: { manage_token: token, token_invalidated: false },
    include: {
      patient: { select: { full_name: true, user: { select: { phone_number: true } } } },
      doctor: { select: { id: true, full_name: true, specialty: true } },
      clinic: { select: { id: true, name: true, address: true, phone: true, self_service_enabled: true, cancellation_window_hours: true } },
    },
  });

  if (!appt) {
    throw new BookingNotFoundError("Invalid or expired booking link.");
  }

  const cancelPolicy = canCancelAppointment(appt, appt.clinic);
  const reschedulePolicy = canRescheduleAppointment(appt, appt.clinic);

  return {
    id: appt.id,
    manageToken: appt.manage_token!,
    scheduledTime: appt.scheduled_time,
    status: appt.status,
    patientName: appt.patient.full_name,
    patientPhone: appt.patient.user?.phone_number || "",
    doctorName: appt.doctor.full_name,
    doctorId: appt.doctor.id,
    specialty: appt.doctor.specialty,
    clinicName: appt.clinic.name,
    clinicId: appt.clinic.id,
    clinicAddress: appt.clinic.address,
    clinicPhone: appt.clinic.phone,
    updatedAt: appt.updated_at,
    rescheduleCount: appt.reschedule_count,
    canCancel: cancelPolicy.allowed,
    canReschedule: reschedulePolicy.allowed,
    policyReason: cancelPolicy.reason || reschedulePolicy.reason,
  };
}

/**
 * Reschedules an appointment by manage_token, validating policy rules, slot conflicts,
 * optimistic concurrency, and token security rotation.
 */
export async function rescheduleBookingByToken(input: {
  token: string;
  newScheduledTime: string;
  expectedUpdatedAt?: string;
}): Promise<{ appointmentId: string; newScheduledTime: Date; newToken: string }> {
  const appt = await prisma.appointment.findFirst({
    where: { manage_token: input.token, token_invalidated: false },
    include: {
      doctor: { select: { id: true, full_name: true } },
      clinic: { select: { id: true, organization_id: true, self_service_enabled: true, cancellation_window_hours: true, allow_double_booking: true, buffer_minutes: true, max_appointments_per_doctor_per_day: true } },
    },
  });

  if (!appt) {
    throw new BookingNotFoundError("Booking not found.");
  }

  // Optimistic concurrency check
  if (input.expectedUpdatedAt) {
    const expectedTime = new Date(input.expectedUpdatedAt).getTime();
    if (appt.updated_at.getTime() !== expectedTime) {
      throw new OptimisticConcurrencyError("This appointment was updated elsewhere. Please refresh.");
    }
  }

  // Policy Engine validation
  const policyCheck = canRescheduleAppointment(appt, appt.clinic);
  if (!policyCheck.allowed) {
    await publishEvent({
      eventType: "scheduling.appointment.policy_violation",
      organizationId: appt.clinic.organization_id,
      entityId: appt.id,
      correlationId: appt.id,
      payload: {
        appointmentId: appt.id,
        action: "reschedule",
        reason: policyCheck.reason,
      },
    });
    throw new BookingPolicyViolationError(policyCheck.reason || "Reschedule not allowed.", policyCheck.code || "POLICY_VIOLATION");
  }

  const parsedNewDate = new Date(input.newScheduledTime);
  if (isNaN(parsedNewDate.getTime()) || parsedNewDate <= new Date()) {
    throw new Error("Invalid reschedule date/time.");
  }

  // Slot conflict check
  await assertNoDoctorSlotConflict(appt.doctor_id, appt.doctor.full_name, parsedNewDate, appt.clinic, appt.id);

  const newToken = randomUUID();

  const updated = await prisma.$transaction(async (tx) => {
    return tx.appointment.update({
      where: { id: appt.id },
      data: {
        scheduled_time: parsedNewDate,
        reschedule_count: { increment: 1 },
        manage_token: newToken, // Token rotation for security
      },
    });
  });

  // Publish Rescheduled Event
  await publishEvent({
    eventType: "scheduling.appointment.rescheduled",
    organizationId: appt.clinic.organization_id,
    entityId: updated.id,
    correlationId: updated.id,
    payload: {
      appointmentId: updated.id,
      previousTime: appt.scheduled_time.toISOString(),
      newTime: updated.scheduled_time.toISOString(),
      rescheduleCount: updated.reschedule_count,
    },
  });

  return {
    appointmentId: updated.id,
    newScheduledTime: updated.scheduled_time,
    newToken: updated.manage_token!,
  };
}

/**
 * Cancels an appointment by manage_token, validating policy rules, optimistic concurrency,
 * and invalidating the manage_token upon cancellation.
 */
export async function cancelBookingByToken(input: {
  token: string;
  reason?: string;
  expectedUpdatedAt?: string;
}): Promise<{ appointmentId: string; status: string }> {
  const appt = await prisma.appointment.findFirst({
    where: { manage_token: input.token, token_invalidated: false },
    include: {
      clinic: { select: { id: true, organization_id: true, self_service_enabled: true, cancellation_window_hours: true } },
    },
  });

  if (!appt) {
    throw new BookingNotFoundError("Booking not found.");
  }

  // Optimistic concurrency check
  if (input.expectedUpdatedAt) {
    const expectedTime = new Date(input.expectedUpdatedAt).getTime();
    if (appt.updated_at.getTime() !== expectedTime) {
      throw new OptimisticConcurrencyError("This appointment was updated elsewhere. Please refresh.");
    }
  }

  // Policy Engine validation
  const policyCheck = canCancelAppointment(appt, appt.clinic);
  if (!policyCheck.allowed) {
    await publishEvent({
      eventType: "scheduling.appointment.policy_violation",
      organizationId: appt.clinic.organization_id,
      entityId: appt.id,
      correlationId: appt.id,
      payload: {
        appointmentId: appt.id,
        action: "cancel",
        reason: policyCheck.reason,
      },
    });
    throw new BookingPolicyViolationError(policyCheck.reason || "Cancellation not allowed.", policyCheck.code || "POLICY_VIOLATION");
  }

  const updated = await prisma.$transaction(async (tx) => {
    return tx.appointment.update({
      where: { id: appt.id },
      data: {
        status: "cancelled",
        notes: input.reason ? `Cancelled by patient: ${input.reason}` : appt.notes,
        token_invalidated: true, // Invalidate token on cancellation
      },
    });
  });

  // Publish Cancelled Event
  await publishEvent({
    eventType: "scheduling.appointment.cancelled",
    organizationId: appt.clinic.organization_id,
    entityId: updated.id,
    correlationId: updated.id,
    payload: {
      appointmentId: updated.id,
      reason: input.reason || "Patient self-service cancellation",
    },
  });

  return {
    appointmentId: updated.id,
    status: updated.status,
  };
}
