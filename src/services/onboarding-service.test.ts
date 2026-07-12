// TEST-4: duplicate-creation-attempt regression coverage (DATA-2) for
// Clinic creation — real database.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createSession } from "@/api/session";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import {
  createClinic,
  setStaffActive,
  setStaffCapabilities,
  ClinicNameConflictError,
  OnboardingInputError,
} from "@/services/onboarding-service";

const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("createClinic", () => {
  it("creates a second clinic/branch successfully", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const clinic = await createClinic({
      organizationId: organization.id,
      ownerUserId: owner.id,
      name: "Downtown Branch",
      address: "1 Main St",
    });
    expect(clinic.name).toBe("Downtown Branch");
  });

  it("rejects a duplicate clinic name within the same organization with a 409-shaped conflict", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await createClinic({
      organizationId: organization.id,
      ownerUserId: owner.id,
      name: "Uptown Branch",
      address: "2 Main St",
    });
    await expect(
      createClinic({
        organizationId: organization.id,
        ownerUserId: owner.id,
        name: "Uptown Branch",
        address: "3 Main St",
      })
    ).rejects.toThrow(ClinicNameConflictError);
  });

  it("rejects a missing name/address as a validation failure, not a conflict", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await expect(
      createClinic({ organizationId: organization.id, ownerUserId: owner.id, name: "", address: "" })
    ).rejects.toThrow(OnboardingInputError);
  });
});

describe("setStaffActive", () => {
  const staffUserIds: string[] = [];

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user_id: { in: staffUserIds } } });
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: staffUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staffUserIds } } });
  });

  it("revokes live sessions and clears the login gate on deactivation", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: staff, staffProfile } = await createTestStaff(clinic.id, "receptionist");
    staffUserIds.push(staff.id);

    await createSession(staff.id, staff.role);
    expect(await prisma.session.count({ where: { user_id: staff.id } })).toBe(1);

    await setStaffActive({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      isActive: false,
    });

    expect(await prisma.session.count({ where: { user_id: staff.id } })).toBe(0);
    const updated = await prisma.user.findUnique({ where: { id: staff.id } });
    expect(updated?.is_active).toBe(false);
  });
});

describe("setStaffCapabilities", () => {
  const staffUserIds: string[] = [];

  afterAll(async () => {
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: staffUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staffUserIds } } });
  });

  it("grants reception to a doctor (the solo practitioner preset) and persists it", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    staffUserIds.push(doctor.id);

    const updated = await setStaffCapabilities({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      capabilities: ["reception"],
    });

    expect(updated.capabilities).toBe(JSON.stringify(["reception"]));
    const audit = await prisma.auditLog.findFirst({
      where: { organization_id: organization.id, action: "staff_capabilities_updated" },
    });
    expect(audit).not.toBeNull();
  });

  it("clears grants back to role defaults when given an empty list", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    staffUserIds.push(doctor.id);

    await setStaffCapabilities({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      capabilities: ["reception"],
    });
    const cleared = await setStaffCapabilities({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      capabilities: [],
    });
    expect(cleared.capabilities).toBeNull();
  });

  it("rejects a non-grantable capability (e.g. admin_portal)", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    staffUserIds.push(doctor.id);

    await expect(
      setStaffCapabilities({
        organizationId: organization.id,
        staffProfileId: staffProfile.id,
        actorUserId: owner.id,
        // admin_portal is a valid Capability type but not owner-grantable
        capabilities: ["admin_portal"],
      })
    ).rejects.toThrow(OnboardingInputError);
  });
});
