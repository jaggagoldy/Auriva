import { describe, expect, it } from "vitest";
import {
  SERVICE_EVENT_STATUSES,
  canTransitionServiceEvent,
  isReasonRequiredForTransition,
  isRemovable,
  isServiceEventStatus,
  type ServiceEventStatus,
} from "./service-event-status";

// M3A C2 — exhaustive over every (from, to) pair, mirroring
// invoice-status.test.ts. This is the PO's mandated transition matrix:
//   Draft→Finalized ✅  Draft→Removed ✅  Draft→Reversed ❌
//   Finalized→Reversed ✅  Finalized→Removed ❌  Reversed→Finalized ❌
const LEGAL: Record<ServiceEventStatus, ServiceEventStatus[]> = {
  draft: ["finalized", "removed"],
  finalized: ["reversed"],
  removed: [],
  reversed: [],
};

describe("service-event-status", () => {
  it("isServiceEventStatus recognizes every declared status and rejects garbage", () => {
    for (const status of SERVICE_EVENT_STATUSES) {
      expect(isServiceEventStatus(status)).toBe(true);
    }
    expect(isServiceEventStatus("cancelled")).toBe(false);
    expect(isServiceEventStatus("")).toBe(false);
  });

  it("never allows a status to transition to itself", () => {
    for (const status of SERVICE_EVENT_STATUSES) {
      expect(canTransitionServiceEvent(status, status)).toBe(false);
    }
  });

  for (const from of SERVICE_EVENT_STATUSES) {
    for (const to of SERVICE_EVENT_STATUSES) {
      if (from === to) continue;
      const shouldBeLegal = LEGAL[from].includes(to);
      it(`${shouldBeLegal ? "allows" : "rejects"} ${from} -> ${to}`, () => {
        expect(canTransitionServiceEvent(from, to)).toBe(shouldBeLegal);
      });
    }
  }

  it("only a draft is removable", () => {
    expect(isRemovable("draft")).toBe(true);
    expect(isRemovable("finalized")).toBe(false);
    expect(isRemovable("removed")).toBe(false);
    expect(isRemovable("reversed")).toBe(false);
  });

  it("requires a reason only for a reversal", () => {
    expect(isReasonRequiredForTransition("finalized", "reversed")).toBe(true);
    expect(isReasonRequiredForTransition("draft", "finalized")).toBe(false);
    expect(isReasonRequiredForTransition("draft", "removed")).toBe(false);
  });
});
