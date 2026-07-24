// Batch D · Milestone 2 — role activation. Asserts every one of the six roles
// resolves to its FROZEN surface (C2 surface-placement decision, 2026-07-18) and
// that sharing a surface never over-grants: a role's capability bundle opens a
// workflow container, but the reception-gated actions stay confined to roles
// that actually hold the `reception` capability.

import { describe, expect, it } from "vitest";
import {
  defaultCapabilitiesForRole,
  effectiveCapabilities,
  resolveSurfacePath,
  hasCapability,
} from "@/domain/authorization";

const OWNER = "super_admin";
const MANAGER = "practice_manager";
const DOCTOR = "doctor";
const RECEPTION = "receptionist";
const NURSE = "nurse";
const TECH = "technician";

// The surface a role lands on in a TEAM clinic (isSoloClinic = false).
function teamSurface(role: string): string | null {
  return resolveSurfacePath(effectiveCapabilities(role, null), false);
}

describe("D2 — frozen surface placement (team clinic)", () => {
  it("routes each role to its frozen surface", () => {
    expect(teamSurface(OWNER)).toBe("/admin"); // owner cockpit once a team exists
    expect(teamSurface(MANAGER)).toBe("/admin"); // operational cockpit
    expect(teamSurface(DOCTOR)).toBe("/doctor");
    expect(teamSurface(NURSE)).toBe("/doctor"); // clinical container, shared with the doctor
    expect(teamSurface(RECEPTION)).toBe("/staff");
    expect(teamSurface(TECH)).toBe("/staff"); // operational container, shared with reception
  });

  it("keeps the solo owner-doctor on the consolidated /clinic while single-member", () => {
    expect(resolveSurfacePath(effectiveCapabilities(OWNER, null), true)).toBe("/clinic");
    // ...and moves them to the cockpit the moment a second person joins.
    expect(resolveSurfacePath(effectiveCapabilities(OWNER, null), false)).toBe("/admin");
  });
});

describe("D2 — surfaces share, permissions don't (no over-grant)", () => {
  it("Technician opens /staff via the narrow `diagnostics` capability, never `reception`", () => {
    const caps = effectiveCapabilities(TECH, null);
    expect(hasCapability("diagnostics", caps)).toBe(true);
    // The reception-gated endpoints authorize on THIS capability specifically —
    // a technician lacking it is denied billing/booking/consultation.
    expect(hasCapability("reception", caps)).toBe(false);
  });

  it("Nurse opens /doctor via `doctor_workspace` but is not a doctor (endpoints role-gate writes)", () => {
    const caps = effectiveCapabilities(NURSE, null);
    expect(hasCapability("doctor_workspace", caps)).toBe(true);
    // The nurse carries no reception/admin capability — no cross-surface leak.
    expect(hasCapability("reception", caps)).toBe(false);
    expect(hasCapability("admin_portal", caps)).toBe(false);
  });

  it("Practice Manager opens /admin via `admin_portal` but holds no clinical/reception surface", () => {
    const caps = effectiveCapabilities(MANAGER, null);
    expect(hasCapability("admin_portal", caps)).toBe(true);
    expect(hasCapability("doctor_workspace", caps)).toBe(false);
    expect(hasCapability("reception", caps)).toBe(false);
  });

  it("default bundles are exactly the frozen set", () => {
    expect(defaultCapabilitiesForRole(MANAGER)).toEqual(["admin_portal"]);
    expect(defaultCapabilitiesForRole(NURSE)).toEqual(["doctor_workspace"]);
    expect(defaultCapabilitiesForRole(TECH)).toEqual(["diagnostics"]);
  });

  it("an unknown role resolves to no surface (deny by default)", () => {
    expect(resolveSurfacePath(effectiveCapabilities("wizard", null), false)).toBeNull();
    expect(defaultCapabilitiesForRole("wizard")).toEqual([]);
  });
});
