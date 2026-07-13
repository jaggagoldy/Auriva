// BRD-043 US-501/US-503 (Sprint 1 schema, Sprint 2 enforcement): the plan
// seat model. Seat ceilings are plan-wide CONSTANTS, never stored per-org
// (no custom permissions per the frozen scope) — this module is the single
// source of truth for "how big can a clinic's team get on each plan."
//
// Counting convention (matches the frozen editions in BRD-043 §5 and the
// prototype's "2/2 seats" growth indicator):
//   - The Owner is FREE and never consumes a seat. In a solo clinic the
//     owner is typically also the doctor ("Managing Doctor" persona) — that
//     one StaffProfile occupies the single doctor seat, which is exactly why
//     a Solo clinic with an owner-doctor + one receptionist reads "2/2".
//   - A "doctor" is a StaffProfile with a specialty (the codebase's
//     established signal — see src/services/doctor-resolution.ts); a
//     "receptionist" is a StaffProfile without one. Pending, unexpired
//     invitations count toward their role's usage too, so the cap cannot be
//     bypassed by firing off many invites against a small number of seats.
//   - Suspended/archived members (membership_status != 'active') do NOT
//     count — freeing a seat is a real outcome of suspending someone.

export type Plan = "solo" | "professional" | "enterprise";

export interface PlanLimits {
  label: string;
  maxDoctors: number;
  maxReceptionists: number;
  /** Non-owner seats (doctors + receptionists). Solo = 2 → the "2/2" cap. */
  maxSeats: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  // Owner (+ owner may be the doctor) + 1 doctor slot + 1 receptionist slot.
  // Non-owner seats = 2.
  solo: { label: "Solo", maxDoctors: 1, maxReceptionists: 1, maxSeats: 2 },
  // Up to 5 doctors, up to 15 total members inclusive of the owner → 14
  // non-owner seats; receptionists are bounded by the seat total, not an
  // independent cap.
  professional: { label: "Professional", maxDoctors: 5, maxReceptionists: 14, maxSeats: 14 },
  // Not a real tier this release (UI-only "Coming soon") — modelled as
  // unbounded so nothing here accidentally gates a future enterprise path.
  enterprise: { label: "Enterprise", maxDoctors: Infinity, maxReceptionists: Infinity, maxSeats: Infinity },
};

export function isPlan(value: unknown): value is Plan {
  return value === "solo" || value === "professional" || value === "enterprise";
}

export function planLimits(plan: string): PlanLimits {
  return isPlan(plan) ? PLAN_LIMITS[plan] : PLAN_LIMITS.solo;
}

export type InviteRoleForSeat = "doctor" | "receptionist";

export interface SeatUsage {
  doctors: number;
  receptionists: number;
}

export interface SeatDecision {
  allowed: boolean;
  /** A caller-facing reason when not allowed, else undefined. */
  reason?: string;
}

/**
 * Given a plan, the role being invited, and the current live usage, decide
 * whether one more of that role fits. Checks both the role-specific cap and
 * the overall non-owner seat cap — whichever binds first.
 */
export function checkSeatAvailability(
  plan: string,
  role: InviteRoleForSeat,
  usage: SeatUsage
): SeatDecision {
  const limits = planLimits(plan);
  const totalUsed = usage.doctors + usage.receptionists;

  if (totalUsed >= limits.maxSeats) {
    return {
      allowed: false,
      reason: `Your ${limits.label} plan is at its ${limits.maxSeats}-member limit. Upgrade to add more team members.`,
    };
  }
  if (role === "doctor" && usage.doctors >= limits.maxDoctors) {
    return {
      allowed: false,
      reason: `Your ${limits.label} plan allows ${limits.maxDoctors} doctor${limits.maxDoctors === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }
  if (role === "receptionist" && usage.receptionists >= limits.maxReceptionists) {
    return {
      allowed: false,
      reason: `Your ${limits.label} plan allows ${limits.maxReceptionists} receptionist${limits.maxReceptionists === 1 ? "" : "s"}. Upgrade to add more.`,
    };
  }
  return { allowed: true };
}
