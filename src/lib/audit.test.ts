// TEST-3: audit-generation regression coverage for the OBS-3 extension —
// real database, no mocking (this module has no next/headers dependency).

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import {
  createTestOrganization,
  createTestPatient,
  createTestStaff,
} from "@/test/fixtures";
import {
  recordAudit,
  resolveOrganizationIdForPatientProfile,
  resolveOrganizationIdForStaffUser,
} from "@/lib/audit";

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.patientProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("recordAudit", () => {
  it("writes a real Audit_Logs row when an organization is resolvable", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    await recordAudit({
      organizationId: organization.id,
      actorUserId: owner.id,
      action: "test_action",
      detail: "test detail",
    });

    const row = await prisma.auditLog.findFirst({
      where: { organization_id: organization.id, action: "test_action" },
    });
    expect(row).not.toBeNull();
    expect(row?.actor_user_id).toBe(owner.id);
    expect(row?.detail).toBe("test detail");
  });

  it("is a documented no-op (does not throw, does not write) when no organization is resolvable", async () => {
    const before = await prisma.auditLog.count();
    await recordAudit({ organizationId: null, action: "should_not_be_written" });
    const after = await prisma.auditLog.count();
    expect(after).toBe(before);
  });
});

describe("resolveOrganizationIdForStaffUser", () => {
  it("resolves a doctor/receptionist via their clinic's organization", async () => {
    const { clinic, organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(user.id);

    const resolved = await resolveOrganizationIdForStaffUser(user.id, "doctor");
    expect(resolved).toBe(organization.id);
  });

  it("resolves a super_admin via the organization they own", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    const resolved = await resolveOrganizationIdForStaffUser(owner.id, "super_admin");
    expect(resolved).toBe(organization.id);
  });
});

describe("resolveOrganizationIdForPatientProfile", () => {
  it("resolves via registered_by_clinic_id when the patient was registered by a clinic", async () => {
    const { clinic, organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user, profile } = await createTestPatient(clinic.id);
    createdUserIds.push(user.id);

    const resolved = await resolveOrganizationIdForPatientProfile(profile.id);
    expect(resolved).toBe(organization.id);
  });

  it("returns null for a self-registered patient with no registering clinic (known, documented gap)", async () => {
    const { user, profile } = await createTestPatient();
    createdUserIds.push(user.id);

    const resolved = await resolveOrganizationIdForPatientProfile(profile.id);
    expect(resolved).toBeNull();
  });
});
