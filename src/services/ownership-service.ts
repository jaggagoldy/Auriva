// Batch D · Milestone 3 — Ownership & Operational Authority.
//
// The frozen ownership model (C2, 2026-07-18):
//   - LEGAL owner   → exactly one, Organization.owner_user_id. Sole authority
//                     over subscription/contract/org lifecycle (plan changes,
//                     ownership transfer, deletion).
//   - OPERATIONAL owner → any number, an Organization_Members row with
//                     role = 'owner'. Shares administrative authority (team,
//                     settings, reports, scheduling) but holds NO legal-owner
//                     power.
//
// Last-owner invariant (frozen, strengthened): the system must block any action
// that would leave the organization without an owner. Here that is structural —
// owner_user_id is a non-null FK, and transferOwnership swaps it ATOMICALLY to a
// verified member, so there is never a window with no legal owner. The existing
// OwnerProtectedError (membership-service) already forbids archiving/suspending
// whoever currently holds owner_user_id, so the legal owner can never be removed
// out from under the organization.

import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { recordAudit } from "@/lib/audit";

export class NotLegalOwnerError extends Error {}
export class InvalidOwnershipTargetError extends Error {}

/**
 * Whether `userId` can legitimately become an owner of `organizationId`: they
 * must already be an ACTIVE member (a staff profile in one of the org's
 * clinics). We never promote a stranger — ownership is granted to people who
 * already belong to the practice.
 */
async function isActiveMemberOfOrg(organizationId: string, userId: string): Promise<boolean> {
  const profile = await prisma.staffProfile.findFirst({
    where: {
      user_id: userId,
      membership_status: "active",
      clinic: { organization_id: organizationId },
    },
    select: { id: true },
  });
  return Boolean(profile);
}

async function assertLegalOwner(organizationId: string, actorUserId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { owner_user_id: true },
  });
  if (!org) {
    throw new InvalidOwnershipTargetError("Organization not found.");
  }
  if (org.owner_user_id !== actorUserId) {
    throw new NotLegalOwnerError("Only the legal owner may manage ownership.");
  }
  return org;
}

/**
 * The legal owner grants a member OPERATIONAL ownership: they gain shared
 * administrative authority (an Organization_Members row with role 'owner' and
 * the super_admin capability set) but no legal-owner power. Idempotent — a
 * member already an operational owner is returned unchanged.
 */
export async function promoteToOwner(input: {
  organizationId: string;
  actorUserId: string;
  targetUserId: string;
}) {
  const { organizationId, actorUserId, targetUserId } = input;
  await assertLegalOwner(organizationId, actorUserId);

  if (targetUserId === actorUserId) {
    // The legal owner is already an owner; nothing to grant.
    throw new InvalidOwnershipTargetError("The legal owner is already an owner.");
  }
  if (!(await isActiveMemberOfOrg(organizationId, targetUserId))) {
    throw new InvalidOwnershipTargetError("Ownership can only be granted to an active member.");
  }

  const existing = await prisma.organizationMember.findUnique({
    where: { organization_id_user_id: { organization_id: organizationId, user_id: targetUserId } },
  });
  if (existing?.role === "owner") {
    return existing; // idempotent
  }

  const member = await prisma.$transaction(async (tx) => {
    const row = await tx.organizationMember.upsert({
      where: { organization_id_user_id: { organization_id: organizationId, user_id: targetUserId } },
      update: { role: "owner" },
      create: { organization_id: organizationId, user_id: targetUserId, role: "owner" },
    });
    // The operational owner resolves the admin cockpit + owner capability set.
    await tx.user.update({ where: { id: targetUserId }, data: { role: "super_admin" } });
    return row;
  });

  await recordAudit({
    organizationId,
    actorUserId,
    action: "organization.owner_promoted",
    detail: `user:${targetUserId}`,
  });
  await publishEvent({
    eventType: "organization.owner_promoted",
    organizationId,
    entityId: targetUserId,
    correlationId: targetUserId,
    actorId: actorUserId,
    payload: { targetUserId },
  });

  return member;
}

/**
 * Transfers LEGAL ownership from the current owner to another member — the
 * Owner-A-promotes-B-then-leaves flow. Atomic: owner_user_id is reassigned, the
 * new owner is guaranteed an 'owner' membership + owner capabilities, and the
 * former owner is retained as an OPERATIONAL owner (they keep administrative
 * authority; a separate archive step removes them if they truly leave). There is
 * never a moment with no legal owner.
 */
export async function transferOwnership(input: {
  organizationId: string;
  actorUserId: string;
  newOwnerUserId: string;
}) {
  const { organizationId, actorUserId, newOwnerUserId } = input;
  await assertLegalOwner(organizationId, actorUserId);

  if (newOwnerUserId === actorUserId) {
    throw new InvalidOwnershipTargetError("They are already the legal owner.");
  }
  if (!(await isActiveMemberOfOrg(organizationId, newOwnerUserId))) {
    throw new InvalidOwnershipTargetError("Ownership can only be transferred to an active member.");
  }

  await prisma.$transaction(async (tx) => {
    // Atomic swap — the org always has exactly one legal owner.
    await tx.organization.update({
      where: { id: organizationId },
      data: { owner_user_id: newOwnerUserId },
    });
    // New owner: operational-owner membership + owner capability set.
    await tx.organizationMember.upsert({
      where: { organization_id_user_id: { organization_id: organizationId, user_id: newOwnerUserId } },
      update: { role: "owner" },
      create: { organization_id: organizationId, user_id: newOwnerUserId, role: "owner" },
    });
    await tx.user.update({ where: { id: newOwnerUserId }, data: { role: "super_admin" } });
    // Former owner keeps operational ownership (shared authority), not legal.
    await tx.organizationMember.upsert({
      where: { organization_id_user_id: { organization_id: organizationId, user_id: actorUserId } },
      update: { role: "owner" },
      create: { organization_id: organizationId, user_id: actorUserId, role: "owner" },
    });
  });

  await recordAudit({
    organizationId,
    actorUserId,
    action: "organization.ownership_transferred",
    detail: `to:${newOwnerUserId}`,
  });
  await publishEvent({
    eventType: "organization.ownership_transferred",
    organizationId,
    entityId: newOwnerUserId,
    correlationId: newOwnerUserId,
    actorId: actorUserId,
    payload: { fromUserId: actorUserId, toUserId: newOwnerUserId },
  });
}

/** The user ids who hold OPERATIONAL ownership of the org (incl. the legal owner). */
export async function listOwners(organizationId: string): Promise<string[]> {
  const [org, operational] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { owner_user_id: true } }),
    prisma.organizationMember.findMany({
      where: { organization_id: organizationId, role: "owner" },
      select: { user_id: true },
    }),
  ]);
  const ids = new Set<string>(operational.map((m) => m.user_id));
  if (org) ids.add(org.owner_user_id); // the legal owner is always an owner
  return [...ids];
}
