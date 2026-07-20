// M3A Revenue Foundation — the ServiceEvent status machine (PO refinement 5).
// Same shape as domain/appointment-status.ts and domain/invoice-status.ts: one
// table, no free-form strings. Pure domain (no Prisma).
//
//   draft ──▶ finalized ──▶ reversed        (finalize into an invoice; reverse post-payment)
//     └────▶ removed                         (removed before finalize/payment)

export type ServiceEventStatus = "draft" | "finalized" | "removed" | "reversed";

export const SERVICE_EVENT_STATUSES: ServiceEventStatus[] = [
  "draft",
  "finalized",
  "removed",
  "reversed",
];

const TRANSITIONS: Record<ServiceEventStatus, ServiceEventStatus[]> = {
  draft: ["finalized", "removed"],
  finalized: ["reversed"],
  removed: [],
  reversed: [],
};

export function isServiceEventStatus(value: string): value is ServiceEventStatus {
  return SERVICE_EVENT_STATUSES.includes(value as ServiceEventStatus);
}

export function canTransitionServiceEvent(from: ServiceEventStatus, to: ServiceEventStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

/** A draft event may still be removed by the permitted role (before payment). */
export function isRemovable(status: ServiceEventStatus): boolean {
  return status === "draft";
}
