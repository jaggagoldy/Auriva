// Batch D · Milestone 4 — Team Management role assignment. Real DB. Verifies
// that a single role assignment moves BOTH the account role and the org
// membership, that the frozen C2 model (capabilities → surface) follows from it,
// and that the owner and unknown roles are protected.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { assignMemberRole, InvalidRoleError, OwnerProtectedError } from "@/services/membership-service";
import {
  effectiveCapabilities,
  resolveSurfacePath,
} from "@/domain/authorization";

const userIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

/** Reads the surface a staff account resolves to, from its live stored role. */
async function surfaceOf(userId: string): Promise<string | null> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  return resolveSurfacePath(effectiveCapabilities(user.role, null), false);
}

describe("D4 — role assignment moves the whole RBAC picture", () => {
  it("reassigns a receptionist to nurse: account role, membership, and surface all follow", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const member = await createTestStaff(clinic.id, "receptionist");
    userIds.push(owner.id, member.user.id);
    await prisma.organizationMember.create({
      data: { organization_id: organization.id, user_id: member.user.id, role: "receptionist" },
    });

    // Before: a receptionist opens the /staff surface.
    expect(await surfaceOf(member.user.id)).toBe("/staff");

    await assignMemberRole({
      organizationId: organization.id,
      staffProfileId: member.staffProfile.id,
      actorUserId: owner.id,
      newRole: "nurse",
    });

    // Account role AND membership row both moved.
    expect((await prisma.user.findUnique({ where: { id: member.user.id } }))?.role).toBe("nurse");
    expect(
      (await prisma.organizationMember.findFirst({ where: { user_id: member.user.id } }))?.role
    ).toBe("nurse");
    // ...so the surface follows the frozen C2 mapping (Nurse → clinical /doctor).
    expect(await surfaceOf(member.user.id)).toBe("/doctor");
  });

  it("clears a stale specialty when a doctor is moved off the clinical role", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const doc = await createTestStaff(clinic.id, "doctor");
    userIds.push(owner.id, doc.user.id);
    expect(doc.staffProfile.specialty).not.toBeNull();

    await assignMemberRole({
      organizationId: organization.id,
      staffProfileId: doc.staffProfile.id,
      actorUserId: owner.id,
      newRole: "technician",
    });

    const profile = await prisma.staffProfile.findUnique({ where: { id: doc.staffProfile.id } });
    expect(profile?.specialty).toBeNull(); // no longer a clinician → signal stays truthful
    expect(await surfaceOf(doc.user.id)).toBe("/staff"); // technician → /staff
  });

  it("is idempotent and rejects unknown roles", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const member = await createTestStaff(clinic.id, "receptionist");
    userIds.push(owner.id, member.user.id);

    await expect(
      assignMemberRole({
        organizationId: organization.id,
        staffProfileId: member.staffProfile.id,
        actorUserId: owner.id,
        newRole: "receptionist", // already this role
      })
    ).resolves.toBeTruthy();

    await expect(
      assignMemberRole({
        organizationId: organization.id,
        staffProfileId: member.staffProfile.id,
        actorUserId: owner.id,
        newRole: "wizard",
      })
    ).rejects.toThrow(InvalidRoleError);

    // "owner" is not assignable through role assignment — ownership is separate.
    await expect(
      assignMemberRole({
        organizationId: organization.id,
        staffProfileId: member.staffProfile.id,
        actorUserId: owner.id,
        newRole: "owner",
      })
    ).rejects.toThrow(InvalidRoleError);
  });

  it("protects the legal owner's role — it can only change via ownership transfer", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    // Give the owner a staff profile so the role-assignment path can be attempted.
    const ownerProfile = await prisma.staffProfile.create({
      data: { user_id: owner.id, clinic_id: clinic.id, full_name: "Owner", specialty: null },
    });
    userIds.push(owner.id);

    await expect(
      assignMemberRole({
        organizationId: organization.id,
        staffProfileId: ownerProfile.id,
        actorUserId: owner.id,
        newRole: "receptionist",
      })
    ).rejects.toThrow(OwnerProtectedError);
  });
});
