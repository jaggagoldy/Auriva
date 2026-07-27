import { AppointmentStatus } from "@/domain/appointment-status";

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

export interface AppointmentPolicyContext {
  id: string;
  status: string;
  scheduled_time: Date;
  reschedule_count: number;
  token_invalidated: boolean;
  token_expires_at?: Date | null;
}

export interface ClinicPolicyContext {
  id: string;
  self_service_enabled: boolean;
  cancellation_window_hours: number | null;
  max_reschedules_allowed?: number;
}

export const CANCELLABLE_STATUSES = ["scheduled", "waiting"];
export const RESCHEDULABLE_STATUSES = ["scheduled"];
export const DEFAULT_MAX_RESCHEDULES = 3;

/**
 * Validates whether patient self-service management is permitted for an appointment.
 */
export function canSelfManage(
  appointment: AppointmentPolicyContext,
  clinic: ClinicPolicyContext
): PolicyCheckResult {
  if (!clinic.self_service_enabled) {
    return {
      allowed: false,
      reason: "Self-service appointment management is disabled by this clinic.",
      code: "SELF_SERVICE_DISABLED",
    };
  }

  if (appointment.token_invalidated) {
    return {
      allowed: false,
      reason: "This self-service booking link is no longer valid.",
      code: "TOKEN_INVALIDATED",
    };
  }

  if (appointment.token_expires_at && appointment.token_expires_at < new Date()) {
    return {
      allowed: false,
      reason: "This self-service booking link has expired.",
      code: "TOKEN_EXPIRED",
    };
  }

  return { allowed: true };
}

/**
 * Validates whether an appointment can be cancelled according to clinic policy.
 */
export function canCancelAppointment(
  appointment: AppointmentPolicyContext,
  clinic: ClinicPolicyContext
): PolicyCheckResult {
  const selfManageCheck = canSelfManage(appointment, clinic);
  if (!selfManageCheck.allowed) return selfManageCheck;

  if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
    return {
      allowed: false,
      reason: `Appointments with status '${appointment.status}' cannot be cancelled.`,
      code: "INVALID_STATUS_FOR_CANCELLATION",
    };
  }

  if (clinic.cancellation_window_hours != null && clinic.cancellation_window_hours > 0) {
    const now = new Date();
    const hoursNotice = (appointment.scheduled_time.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursNotice < clinic.cancellation_window_hours) {
      return {
        allowed: false,
        reason: `Cancellations require at least ${clinic.cancellation_window_hours} hours advance notice.`,
        code: "CANCELLATION_WINDOW_EXCEEDED",
      };
    }
  }

  return { allowed: true };
}

/**
 * Validates whether an appointment can be rescheduled according to clinic policy.
 */
export function canRescheduleAppointment(
  appointment: AppointmentPolicyContext,
  clinic: ClinicPolicyContext
): PolicyCheckResult {
  const selfManageCheck = canSelfManage(appointment, clinic);
  if (!selfManageCheck.allowed) return selfManageCheck;

  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    return {
      allowed: false,
      reason: `Appointments with status '${appointment.status}' cannot be rescheduled.`,
      code: "INVALID_STATUS_FOR_RESCHEDULE",
    };
  }

  const maxAllowed = clinic.max_reschedules_allowed ?? DEFAULT_MAX_RESCHEDULES;
  if (appointment.reschedule_count >= maxAllowed) {
    return {
      allowed: false,
      reason: `Maximum reschedule limit of ${maxAllowed} times reached for this booking.`,
      code: "MAX_RESCHEDULES_EXCEEDED",
    };
  }

  if (clinic.cancellation_window_hours != null && clinic.cancellation_window_hours > 0) {
    const now = new Date();
    const hoursNotice = (appointment.scheduled_time.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursNotice < clinic.cancellation_window_hours) {
      return {
        allowed: false,
        reason: `Rescheduling requires at least ${clinic.cancellation_window_hours} hours advance notice.`,
        code: "RESCHEDULE_WINDOW_EXCEEDED",
      };
    }
  }

  return { allowed: true };
}
