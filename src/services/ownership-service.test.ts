// Batch D · Milestone 3 — Ownership & Operational Authority.
// Real DB. Covers the frozen model: one legal owner + many operational owners,
// ownership transfer / legal-owner reassignment, and the last-owner invariant.

import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import {
  promoteToOwner,
  transferOwnership,
  listOwners,
  NotLegalOwnerError,
  InvalidOwnershipTargetError,
} from "@/services/ownership-service";
import { suspendMember, OwnerProtectedError } from "@/services/membership-service";
import { requireOrganizationContext, requireLegalOwnerContext } from "@/api/session";
import { canAdministerOrganization } from "@/domain/authorization";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value ? { name, value: cookieStore.value } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));
import { createSession } from "@/api/session";

const userIds: string[] = [];
afterAll(async () => {
  // Deleting the owner cascades org → clinics → profiles → members.
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

/** Gives an existing user an active staff profile in the clinic — so the
 * owner-protection path (which loads a member by profile id) can be exercised. */
async function giveStaffProfile(userId: string, clinicId: string) {
  return prisma.staffProfile.create({
    data: { user_id: userId, clinic_id: clinicId, full_name: "Profile", specialty: null },
  });
}

describe("Ownership model — promotion & operational owners", () => {
  it("the legal owner promotes an active member to operational owner (idempotently)", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const b = await createTestStaff(clinic.id, "doctor");
    userIds.push(owner.id, b.user.id);

    await promoteToOwner({ organizationId: organization.id, actorUserId: owner.id, targetUserId: b.user.id });

    const member = await prisma.organizationMember.findUnique({
      where: { organization_id_user_id: { organization_id: organization.id, user_id: b.user.id } },
    });
    expect(member?.role).toBe("owner");
    // Operational owner resolves the owner capability set.
    expect((await prisma.user.findUnique({ where: { id: b.user.id } }))?.role).toBe("super_admin");
    // Legal ownership is unchanged — promotion is operational only.
    expect((await prisma.organization.findUnique({ where: { id: organization.id } }))?.owner_user_id).toBe(owner.id);

    // Idempotent — a second promotion no-ops cleanly.
    await expect(
      promoteToOwner({ organizationId: organization.id, actorUserId: owner.id, targetUserId: b.user.id })
    ).resolves.toBeTruthy();

    expect((await listOwners(organization.id)).sort()).toEqual([owner.id, b.user.id].sort());
  });

  it("refuses promotion by a non-legal-owner, or of a non-member", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const b = await createTestStaff(clinic.id, "receptionist");
    const stranger = await createTestStaff(clinic.id, "receptionist");
    userIds.push(owner.id, b.user.id, stranger.user.id);

    // b is not the legal owner → may not promote anyone.
    await expect(
      promoteToOwner({ organizationId: organization.id, actorUserId: b.user.id, targetUserId: stranger.user.id })
    ).rejects.toThrow(NotLegalOwnerError);

    // A user with no active profile in the org cannot be made an owner.
    const outsider = await createTestOrganization();
    userIds.push(outsider.owner.id);
    await expect(
      promoteToOwner({ organizationId: organization.id, actorUserId: owner.id, targetUserId: outsider.owner.id })
    ).rejects.toThrow(InvalidOwnershipTargetError);
  });
});

describe("Ownership transfer — legal-owner reassignment", () => {
  it("hands legal ownership A → B atomically; A stays an operational owner", async () => {
    const { owner: a, organization, clinic } = await createTestOrganization();
    const b = await createTestStaff(clinic.id, "doctor");
    userIds.push(a.id, b.user.id);

    await transferOwnership({ organizationId: organization.id, actorUserId: a.id, newOwnerUserId: b.user.id });

    const org = await prisma.organization.findUnique({ where: { id: organization.id } });
    expect(org?.owner_user_id).toBe(b.user.id); // B is now the single legal owner

    // Both are operational owners; the org is never without a legal owner.
    expect((await listOwners(organization.id)).sort()).toEqual([a.id, b.user.id].sort());
    expect((await prisma.user.findUnique({ where: { id: b.user.id } }))?.role).toBe("super_admin");

    // A has lost legal authority — they can no longer transfer or promote.
    await expect(
      transferOwnership({ organizationId: organization.id, actorUserId: a.id, newOwnerUserId: b.user.id })
    ).rejects.toThrow(NotLegalOwnerError);
  });

  it("refuses transfer to a non-member", async () => {
    const { owner: a, organization } = await createTestOrganization();
    const outsider = await createTestOrganization();
    userIds.push(a.id, outsider.owner.id);
    await expect(
      transferOwnership({ organizationId: organization.id, actorUserId: a.id, newOwnerUserId: outsider.owner.id })
    ).rejects.toThrow(InvalidOwnershipTargetError);
  });
});

describe("Last-owner invariant holds across a transfer", () => {
  it("protects whoever currently holds legal ownership — before and after transfer", async () => {
    const { owner: a, organization, clinic } = await createTestOrganization();
    const aProfile = await giveStaffProfile(a.id, clinic.id);
    const b = await createTestStaff(clinic.id, "doctor");
    userIds.push(a.id, b.user.id);

    // Before transfer: A is the legal owner → cannot be suspended/removed.
    await expect(
      suspendMember({ organizationId: organization.id, staffProfileId: aProfile.id, actorUserId: a.id })
    ).rejects.toThrow(OwnerProtectedError);

    await transferOwnership({ organizationId: organization.id, actorUserId: a.id, newOwnerUserId: b.user.id });

    // After transfer: B (now legal owner) is protected...
    await expect(
      suspendMember({ organizationId: organization.id, staffProfileId: b.staffProfile.id, actorUserId: b.user.id })
    ).rejects.toThrow(OwnerProtectedError);
    // ...and A, no longer the legal owner, may now be removed if they leave.
    await expect(
      suspendMember({ organizationId: organization.id, staffProfileId: aProfile.id, actorUserId: b.user.id })
    ).resolves.toBeTruthy();
  });
});

describe("Operational authority resolution (D3 authority-aware context)", () => {
  it("owner resolves as legal owner; Practice Manager resolves operationally but is refused legal-owner actions", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    // A Practice Manager: an active member, role practice_manager.
    const pmUser = await prisma.user.create({
      data: {
        role: "practice_manager",
        phone_number: `pm-${Date.now()}`,
        email: `pm-${Date.now()}@test.local`,
        password_hash: "x",
      },
    });
    await giveStaffProfile(pmUser.id, clinic.id);
    userIds.push(owner.id, pmUser.id);

    // Owner → legal-owner path.
    cookieStore.value = (await createSession(owner.id, "super_admin", null)).rawToken;
    const ownerCtx = await requireOrganizationContext(canAdministerOrganization, organization.id);
    expect(ownerCtx.ok).toBe(true);
    if (ownerCtx.ok) expect(ownerCtx.isLegalOwner).toBe(true);

    // Practice Manager → operational path: resolves the org, but not as legal owner.
    cookieStore.value = (await createSession(pmUser.id, "practice_manager", null)).rawToken;
    const pmCtx = await requireOrganizationContext(canAdministerOrganization, organization.id);
    expect(pmCtx.ok).toBe(true);
    if (pmCtx.ok) {
      expect(pmCtx.organizationId).toBe(organization.id);
      expect(pmCtx.isLegalOwner).toBe(false);
    }
    // ...and is refused the legal-owner-only actions (plan, transfer, deletion).
    const pmLegal = await requireLegalOwnerContext(organization.id);
    expect(pmLegal.ok).toBe(false);

    cookieStore.value = undefined;
  });
});
