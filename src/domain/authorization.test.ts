// Batch 2 (Adaptive Workspace): the capability model is the structural core of
// Sprint 2 — a regression here silently re-locks a solo practitioner out of
// their own front desk, or worse, over-grants. Pure unit tests (no DB).

import { describe, expect, it } from "vitest";
import {
  defaultCapabilitiesForRole,
  parseCapabilities,
  effectiveCapabilities,
  hasCapability,
} from "./authorization";

describe("defaultCapabilitiesForRole", () => {
  it("reproduces today's role rules verbatim", () => {
    expect(defaultCapabilitiesForRole("super_admin").sort()).toEqual(
      ["admin_portal", "doctor_workspace", "reception"].sort()
    );
    expect(defaultCapabilitiesForRole("doctor")).toEqual(["doctor_workspace"]);
    expect(defaultCapabilitiesForRole("receptionist")).toEqual(["reception"]);
    expect(defaultCapabilitiesForRole("patient")).toEqual(["patient_workspace"]);
    expect(defaultCapabilitiesForRole("unknown")).toEqual([]);
  });
});

describe("parseCapabilities", () => {
  it("returns [] for null/blank/malformed input", () => {
    expect(parseCapabilities(null)).toEqual([]);
    expect(parseCapabilities("")).toEqual([]);
    expect(parseCapabilities("not json")).toEqual([]);
    expect(parseCapabilities('{"not":"an array"}')).toEqual([]);
  });

  it("keeps only known capabilities, dropping unknown entries", () => {
    expect(parseCapabilities('["reception","made_up","doctor_workspace"]')).toEqual([
      "reception",
      "doctor_workspace",
    ]);
  });
});

describe("effectiveCapabilities", () => {
  it("is role defaults when there are no grants", () => {
    expect(effectiveCapabilities("doctor", null)).toEqual(["doctor_workspace"]);
  });

  it("unions role defaults with grants — the solo practitioner unlock", () => {
    const caps = effectiveCapabilities("doctor", '["reception"]');
    expect(caps).toContain("doctor_workspace");
    expect(caps).toContain("reception");
    expect(hasCapability("reception", caps)).toBe(true);
  });

  it("does not double-count a grant that equals a role default", () => {
    const caps = effectiveCapabilities("receptionist", '["reception"]');
    expect(caps).toEqual(["reception"]);
  });

  it("ignores an unknown granted capability", () => {
    expect(hasCapability("admin_portal", effectiveCapabilities("doctor", '["admin_portal_typo"]'))).toBe(
      false
    );
  });
});
