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
  createInvitation,
  acceptInvitation,
  getInvitationByToken,
  ClinicNameConflictError,
  OnboardingInputError,
  InvitationExpiredError,
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

// BRD-043 US-102 (Sprint 1): 72h invitation expiry, server-enforced.
describe("createInvitation / acceptInvitation — expiry (US-102)", () => {
  const createdUserIdsForExpiry: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIdsForExpiry } } });
  });

  it("sets expires_at ~72h out at creation", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const before = Date.now();
    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `invitee-${Date.now()}@test.local`,
      fullName: "New Doctor",
      role: "doctor",
    });
    const expectedMs = before + 72 * 60 * 60 * 1000;
    expect(invitation.expires_at).not.toBeNull();
    expect(Math.abs(invitation.expires_at!.getTime() - expectedMs)).toBeLessThan(5000);
  });

  it("rejects acceptance of an invitation past its 72h window, server-side", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `expired-${Date.now()}@test.local`,
      fullName: "Late Invitee",
      role: "receptionist",
    });
    // Simulate a backdated invite — created and expired 1 hour ago.
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { expires_at: new Date(Date.now() - 60 * 60 * 1000) },
    });

    await expect(acceptInvitation({ token: invitation.token, password: "password123" })).rejects.toThrow(
      InvitationExpiredError
    );

    const reloaded = await prisma.invitation.findUnique({ where: { id: invitation.id } });
    expect(reloaded?.status).toBe("expired");
  });

  it("also rejects reading an expired invitation via the public token lookup", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `expired-read-${Date.now()}@test.local`,
      fullName: "Late Reader",
      role: "receptionist",
    });
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { expires_at: new Date(Date.now() - 60 * 60 * 1000) },
    });

    await expect(getInvitationByToken(invitation.token)).rejects.toThrow(InvitationExpiredError);
  });

  it("resending an invite (supersede) resets the 72h window on the new token", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const email = `resend-${Date.now()}@test.local`;

    const first = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email,
      fullName: "Resent Invitee",
      role: "receptionist",
    });
    const second = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email,
      fullName: "Resent Invitee",
      role: "receptionist",
    });

    const reloadedFirst = await prisma.invitation.findUnique({ where: { id: first.id } });
    expect(reloadedFirst?.status).toBe("revoked");
    expect(second.token).not.toBe(first.token);
    expect(second.expires_at!.getTime()).toBeGreaterThan(Date.now() + 71 * 60 * 60 * 1000);
  });

  it("accepts a still-pending, unexpired invitation normally", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `live-${Date.now()}@test.local`,
      fullName: "Live Invitee",
      role: "receptionist",
    });

    const { user } = await acceptInvitation({ token: invitation.token, password: "password123" });
    createdUserIdsForExpiry.push(user.id);
    expect(user.email).toBe(invitation.email);
  });
});
