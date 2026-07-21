// C1 — Treatment Planning domain. Pure (no Prisma). Two small status machines:
// the plan lifecycle and the per-session lifecycle. The doctor owns the plan's
// clinical content; reception operates its sessions.

export type PlanStatus = "draft" | "active" | "completed" | "archived" | "cancelled";
export const PLAN_STATUSES: PlanStatus[] = ["draft", "active", "completed", "archived", "cancelled"];

// draft ─▶ active ─▶ completed ─▶ archived
//   └─▶ cancelled        (abandoned clinical decision, distinct from archived)
// active ─▶ cancelled
const PLAN_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: ["archived"],
  archived: [],
  cancelled: [],
};

export function isPlanStatus(v: string): v is PlanStatus {
  return PLAN_STATUSES.includes(v as PlanStatus);
}
export function canTransitionPlan(from: PlanStatus, to: PlanStatus): boolean {
  if (from === to) return false;
  return PLAN_TRANSITIONS[from].includes(to);
}
/** Sessions may be booked/performed only while the plan is active. */
export function planAcceptsSessions(status: PlanStatus): boolean {
  return status === "active";
}

export type SessionStatus = "planned" | "completed" | "cancelled";
export const SESSION_STATUSES: SessionStatus[] = ["planned", "completed", "cancelled"];

export function isSessionStatus(v: string): v is SessionStatus {
  return SESSION_STATUSES.includes(v as SessionStatus);
}
/** Only a planned session can be booked, completed, or cancelled. */
export function isSessionActionable(status: SessionStatus): boolean {
  return status === "planned";
}
