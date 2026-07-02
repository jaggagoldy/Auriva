// Single source of truth for appointment status transitions. Both the
// doctor console (PATCH /api/appointments/[id]) and the reception queue
// (PATCH /api/reception/status, /api/reception/checkin) route through the
// same table via appointment-service.transitionStatus(), so the business
// rules below are enforced once, not duplicated per caller.

export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "waiting"
  | "doctor_ready"
  | "in_consultation"
  | "completed"
  | "no_show"
  | "cancelled";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "checked_in",
  "waiting",
  "doctor_ready",
  "in_consultation",
  "completed",
  "no_show",
  "cancelled",
];

// scheduled -> waiting and scheduled -> in_consultation are kept valid
// because the existing doctor console (consultation-pane.tsx) already
// performs those transitions directly; this table must not break it.
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["checked_in", "waiting", "in_consultation", "cancelled", "no_show"],
  checked_in: ["waiting", "in_consultation", "cancelled", "no_show"],
  waiting: ["doctor_ready", "in_consultation", "cancelled", "no_show"],
  doctor_ready: ["in_consultation", "cancelled", "no_show"],
  in_consultation: ["completed"],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function isAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as string[]).includes(value);
}

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

/** Timestamp fields to set as a side effect of moving into `to`. Only sets
 * a timestamp the first time an appointment reaches that stage. */
export function timestampPatchFor(
  to: AppointmentStatus,
  current: { checked_in_at: Date | null; started_at: Date | null; completed_at: Date | null }
): Partial<{ checked_in_at: Date; started_at: Date; completed_at: Date }> {
  const now = new Date();
  const patch: Partial<{ checked_in_at: Date; started_at: Date; completed_at: Date }> = {};

  if ((to === "checked_in" || to === "waiting") && !current.checked_in_at) {
    patch.checked_in_at = now;
  }
  if (to === "in_consultation" && !current.started_at) {
    patch.started_at = now;
  }
  if (to === "completed" && !current.completed_at) {
    patch.completed_at = now;
  }
  return patch;
}
