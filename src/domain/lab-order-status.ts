// Lab order lifecycle (APS-042). The MVP loop is ordered → resulted (or
// cancelled); sample states join when the full WF-09/10 shape lands —
// their names are reserved here so screens never invent alternatives.

export type LabOrderStatus = "ordered" | "resulted" | "cancelled";

export const LAB_ORDER_STATUSES: LabOrderStatus[] = ["ordered", "resulted", "cancelled"];

const TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
  ordered: ["resulted", "cancelled"],
  resulted: [], // amendments are new signed facts, not edits (APS-018 E1)
  cancelled: [],
};

export function isLabOrderStatus(value: string): value is LabOrderStatus {
  return (LAB_ORDER_STATUSES as string[]).includes(value);
}

export function canTransitionLabOrder(from: LabOrderStatus, to: LabOrderStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}
