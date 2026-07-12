// Single source of truth for Release status transitions (APS-036), mirroring
// the appointment/invoice/lab-order status-machine pattern already used
// throughout this codebase — one choke-point table, enforced once in
// release-service.transitionReleaseStatus(), never scattered per-caller.

export type ReleaseStatus =
  | "draft"
  | "internal_qa"
  | "ready_for_review"
  | "approved"
  | "published"
  | "archived";

export const RELEASE_STATUSES: ReleaseStatus[] = [
  "draft",
  "internal_qa",
  "ready_for_review",
  "approved",
  "published",
  "archived",
];

// Each forward stage may also step back exactly one stage (QA fails,
// review rejects, approval is revoked before publish) — never further back
// than that, and never skip a stage forward.
const TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ["internal_qa"],
  internal_qa: ["ready_for_review", "draft"],
  ready_for_review: ["approved", "internal_qa"],
  approved: ["published", "ready_for_review"],
  published: ["archived"],
  archived: [],
};

export function isReleaseStatus(value: string): value is ReleaseStatus {
  return (RELEASE_STATUSES as string[]).includes(value);
}

export function canTransitionRelease(from: ReleaseStatus, to: ReleaseStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}
