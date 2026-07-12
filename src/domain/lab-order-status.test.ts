import { describe, expect, it } from "vitest";
import {
  LAB_ORDER_STATUSES,
  canTransitionLabOrder,
  isLabOrderStatus,
  type LabOrderStatus,
} from "./lab-order-status";

// TEST-2: exhaustive over every (from, to) pair, the third of the three
// choke points APS-035/TEST-2 names explicitly.
const LEGAL: Record<LabOrderStatus, LabOrderStatus[]> = {
  ordered: ["resulted", "cancelled"],
  resulted: [],
  cancelled: [],
};

describe("lab-order-status", () => {
  it("isLabOrderStatus recognizes every declared status and rejects garbage", () => {
    for (const status of LAB_ORDER_STATUSES) {
      expect(isLabOrderStatus(status)).toBe(true);
    }
    expect(isLabOrderStatus("pending_sample")).toBe(false);
  });

  it("never allows a status to transition to itself", () => {
    for (const status of LAB_ORDER_STATUSES) {
      expect(canTransitionLabOrder(status, status)).toBe(false);
    }
  });

  for (const from of LAB_ORDER_STATUSES) {
    for (const to of LAB_ORDER_STATUSES) {
      if (from === to) continue;
      const shouldBeLegal = LEGAL[from].includes(to);
      it(`${shouldBeLegal ? "allows" : "rejects"} ${from} -> ${to}`, () => {
        expect(canTransitionLabOrder(from, to)).toBe(shouldBeLegal);
      });
    }
  }

  it("resulted and cancelled are terminal — amendments are new facts, not edits", () => {
    for (const terminal of ["resulted", "cancelled"] as const) {
      for (const to of LAB_ORDER_STATUSES) {
        expect(canTransitionLabOrder(terminal, to)).toBe(false);
      }
    }
  });
});
