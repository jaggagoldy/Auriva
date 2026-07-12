import { describe, expect, it } from "vitest";
import {
  RELEASE_STATUSES,
  canTransitionRelease,
  isReleaseStatus,
  type ReleaseStatus,
} from "./release-status";

// TEST-2: same exhaustive shape as the other three choke points. Release
// Management (APS-036) is the newest state machine in the codebase and had
// zero coverage before this sprint — same risk profile as the others, so
// it gets the same treatment rather than being left out because it wasn't
// in APS-032's original audit pass.
const LEGAL: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ["internal_qa"],
  internal_qa: ["ready_for_review", "draft"],
  ready_for_review: ["approved", "internal_qa"],
  approved: ["published", "ready_for_review"],
  published: ["archived"],
  archived: [],
};

describe("release-status", () => {
  it("isReleaseStatus recognizes every declared status and rejects garbage", () => {
    for (const status of RELEASE_STATUSES) {
      expect(isReleaseStatus(status)).toBe(true);
    }
    expect(isReleaseStatus("beta")).toBe(false);
  });

  it("never allows a status to transition to itself", () => {
    for (const status of RELEASE_STATUSES) {
      expect(canTransitionRelease(status, status)).toBe(false);
    }
  });

  for (const from of RELEASE_STATUSES) {
    for (const to of RELEASE_STATUSES) {
      if (from === to) continue;
      const shouldBeLegal = LEGAL[from].includes(to);
      it(`${shouldBeLegal ? "allows" : "rejects"} ${from} -> ${to}`, () => {
        expect(canTransitionRelease(from, to)).toBe(shouldBeLegal);
      });
    }
  }

  it("never allows skipping a stage forward", () => {
    expect(canTransitionRelease("draft", "approved")).toBe(false);
    expect(canTransitionRelease("draft", "published")).toBe(false);
    expect(canTransitionRelease("internal_qa", "published")).toBe(false);
  });

  it("never allows stepping back more than one stage", () => {
    expect(canTransitionRelease("approved", "internal_qa")).toBe(false);
    expect(canTransitionRelease("approved", "draft")).toBe(false);
  });

  it("archived is terminal", () => {
    for (const to of RELEASE_STATUSES) {
      expect(canTransitionRelease("archived", to)).toBe(false);
    }
  });
});
