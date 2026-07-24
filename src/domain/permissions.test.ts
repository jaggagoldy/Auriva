// Batch D · Milestone 1 — the action-level permission model, asserted against
// the FROZEN C2 Capability & Permission Matrix (2026-07-18). The negative
// assertions (the "hard lines") matter as much as the positive ones: they are
// the guarantees the Product Office froze.

import { describe, expect, it } from "vitest";
import {
  can,
  effectivePermissions,
  permissionsForRole,
  type Permission,
} from "@/domain/authorization";

const OWNER = "super_admin";
const MANAGER = "practice_manager";
const DOCTOR = "doctor";
const RECEPTION = "receptionist";
const NURSE = "nurse";
const TECH = "technician";

describe("C2 permission model — role defaults", () => {
  it("Owner holds every permission, including the two never-delegated ones", () => {
    expect(can("plan:manage", OWNER)).toBe(true);
    expect(can("team:assign_owner", OWNER)).toBe(true);
    expect(can("consultation:write", OWNER)).toBe(true);
    expect(can("reports:org", OWNER)).toBe(true);
    expect(can("audit:view", OWNER)).toBe(true);
  });

  it("Practice Manager runs operations but has no clinical write, no plan, no owner grant (amend #1, #5)", () => {
    // Operational authority.
    expect(can("team:manage", MANAGER)).toBe(true);
    expect(can("reports:org", MANAGER)).toBe(true);
    expect(can("billing:manage", MANAGER)).toBe(true);
    expect(can("settings:manage", MANAGER)).toBe(true);
    // Reads clinical records (amend #1) but never edits them.
    expect(can("clinical_records:view", MANAGER)).toBe(true);
    expect(can("clinical_records:edit", MANAGER)).toBe(false);
    expect(can("consultation:write", MANAGER)).toBe(false);
    expect(can("vitals:write", MANAGER)).toBe(false);
    // Never delegated (amend #5).
    expect(can("team:assign_owner", MANAGER)).toBe(false);
    expect(can("plan:manage", MANAGER)).toBe(false);
  });

  it("Doctor has clinical authority + own reports, but not org analytics (amend #3)", () => {
    expect(can("consultation:write", DOCTOR)).toBe(true);
    expect(can("clinical_records:edit", DOCTOR)).toBe(true);
    expect(can("vitals:write", DOCTOR)).toBe(true);
    expect(can("diagnostics:order", DOCTOR)).toBe(true);
    expect(can("schedule:own", DOCTOR)).toBe(true);
    expect(can("reports:own", DOCTOR)).toBe(true);
    expect(can("reports:org", DOCTOR)).toBe(false);
    expect(can("schedule:manage", DOCTOR)).toBe(false);
  });

  it("Doctor collects payments only when the clinic grants it — configurable, not default (amend #4)", () => {
    expect(can("payments:collect", DOCTOR)).toBe(false);
    expect(can("billing:manage", DOCTOR)).toBe(false);
    // A clinic that lets this doctor run the desk grants the reception capability.
    const granted = JSON.stringify(["reception"]);
    expect(can("payments:collect", DOCTOR, granted)).toBe(true);
    expect(can("billing:manage", DOCTOR, granted)).toBe(true);
    // ...without turning the doctor into a receptionist: no new clinical loss,
    // and still no org analytics.
    expect(can("consultation:write", DOCTOR, granted)).toBe(true);
    expect(can("reports:org", DOCTOR, granted)).toBe(false);
  });

  it("Receptionist works the front desk with zero clinical access (amend #2 hard line)", () => {
    expect(can("appointments:manage", RECEPTION)).toBe(true);
    expect(can("patients:manage", RECEPTION)).toBe(true);
    expect(can("payments:collect", RECEPTION)).toBe(true);
    for (const p of [
      "consultation:write",
      "clinical_records:view",
      "clinical_records:edit",
      "vitals:write",
      "diagnostics:order",
    ] as Permission[]) {
      expect(can(p, RECEPTION)).toBe(false);
    }
  });

  it("Nurse assists clinically (vitals + prep) but never diagnoses or prescribes (amend #2)", () => {
    expect(can("vitals:write", NURSE)).toBe(true);
    expect(can("clinical_records:view", NURSE)).toBe(true);
    expect(can("diagnostics:view", NURSE)).toBe(true);
    expect(can("patients:view", NURSE)).toBe(true);
    // The hard line: no diagnosis / prescription / treatment plan, no results.
    expect(can("consultation:write", NURSE)).toBe(false);
    expect(can("clinical_records:edit", NURSE)).toBe(false);
    expect(can("diagnostics:results:write", NURSE)).toBe(false);
    expect(can("billing:manage", NURSE)).toBe(false);
  });

  it("Technician enters results only — no diagnosis", () => {
    expect(can("diagnostics:results:write", TECH)).toBe(true);
    expect(can("diagnostics:view", TECH)).toBe(true);
    expect(can("patients:view", TECH)).toBe(true);
    expect(can("consultation:write", TECH)).toBe(false);
    expect(can("diagnostics:order", TECH)).toBe(false);
    expect(can("clinical_records:edit", TECH)).toBe(false);
  });
});

describe("C2 permission model — invariants", () => {
  it("only the Owner may manage the plan or grant ownership (never-delegated)", () => {
    for (const role of [MANAGER, DOCTOR, RECEPTION, NURSE, TECH]) {
      expect(can("plan:manage", role)).toBe(false);
      expect(can("team:assign_owner", role)).toBe(false);
    }
    expect(can("plan:manage", OWNER)).toBe(true);
    expect(can("team:assign_owner", OWNER)).toBe(true);
  });

  it("clinical write is confined to clinicians — no operational or front-desk role can write it", () => {
    for (const role of [MANAGER, RECEPTION, TECH]) {
      expect(can("consultation:write", role)).toBe(false);
      expect(can("clinical_records:edit", role)).toBe(false);
    }
    // Doctor writes freely; Nurse writes vitals only, never the consultation.
    expect(can("consultation:write", DOCTOR)).toBe(true);
    expect(can("vitals:write", NURSE)).toBe(true);
    expect(can("consultation:write", NURSE)).toBe(false);
  });

  it("principle #7 — visibility exceeds authority: every role that can edit clinical records can also view them", () => {
    for (const role of [OWNER, MANAGER, DOCTOR, RECEPTION, NURSE, TECH]) {
      if (can("clinical_records:edit", role)) {
        expect(can("clinical_records:view", role)).toBe(true);
      }
    }
  });

  it("an ungranted account gets exactly its role defaults (backward compatible)", () => {
    for (const role of [OWNER, MANAGER, DOCTOR, RECEPTION, NURSE, TECH]) {
      expect(effectivePermissions(role, null).sort()).toEqual([...permissionsForRole(role)].sort());
      expect(effectivePermissions(role, "not json").sort()).toEqual(
        [...permissionsForRole(role)].sort()
      );
    }
  });

  it("an unknown role resolves to no permissions (deny by default)", () => {
    expect(permissionsForRole("wizard")).toEqual([]);
    expect(can("appointments:view", "wizard")).toBe(false);
  });
});
