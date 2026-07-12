// Organization service (Sprint 3 / OPS-001) — now backed by the real
// Organization table, not derived from Clinic. Resolves "which organizations
// does this user belong to, and as what role" directly from
// Organization_Members, joined to Staff_Profiles for display info.

import type { Organization as PrismaOrganization, OrganizationMember as PrismaMember, StaffProfile } from "@prisma/client";
import { Organization, OrganizationMember, isOrgArchetype, memberRoleFromSpecialty } from "@/domain/organization";
import {
  findOrganization,
  listOrganizationsOwnedBy,
} from "@/repositories/organization-repository";
import prisma from "@/lib/prisma";

export function organizationFromRow(org: PrismaOrganization): Organization {
  return {
    id: org.id,
    type: "clinic_network",
    name: org.name,
    address: org.address,
    contactEmail: org.contact_email,
    contactPhone: org.contact_phone,
    timezone: org.timezone,
    ownerUserId: org.owner_user_id,
    archetype: isOrgArchetype(org.archetype) ? org.archetype : null,
  };
}

type MemberRow = PrismaMember & {
  staffProfile?: StaffProfile | null;
};

function memberFromRow(row: MemberRow, ownerDisplayName: string): OrganizationMember {
  if (row.staffProfile) {
    return {
      organizationId: row.organization_id,
      userId: row.user_id,
      profileId: row.staffProfile.id,
      role: row.role === "owner" || row.role === "doctor" || row.role === "receptionist"
        ? row.role
        : memberRoleFromSpecialty(row.staffProfile.specialty),
      displayName: row.staffProfile.full_name,
      specialty: row.staffProfile.specialty,
      clinicId: row.staffProfile.clinic_id,
      isActive: row.staffProfile.is_active,
    };
  }
  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    profileId: null,
    role: "owner",
    displayName: ownerDisplayName,
    specialty: null,
    clinicId: null,
    isActive: true,
  };
}

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const org = await findOrganization(organizationId);
  return org ? organizationFromRow(org) : null;
}

/**
 * Sprint 3: organization profile editing — previously non-existent (the
 * Settings nav item was a disabled "Soon" placeholder). Every field is
 * optional; only supplied fields are updated.
 */
export async function updateOrganization(
  organizationId: string,
  patch: {
    name?: string;
    address?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    timezone?: string;
  }
): Promise<Organization> {
  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: patch.name !== undefined ? patch.name.trim() : undefined,
      address: patch.address !== undefined ? patch.address?.trim() || null : undefined,
      contact_email: patch.contactEmail !== undefined ? patch.contactEmail?.trim() || null : undefined,
      contact_phone: patch.contactPhone !== undefined ? patch.contactPhone?.trim() || null : undefined,
      timezone: patch.timezone !== undefined ? patch.timezone : undefined,
    },
  });
  return organizationFromRow(org);
}

export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const [org, members] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, include: { owner: { include: { staffProfile: true } } } }),
    prisma.organizationMember.findMany({
      where: { organization_id: organizationId },
      include: { user: { include: { staffProfile: true } } },
    }),
  ]);
  if (!org) return [];

  return members.map((m) =>
    memberFromRow(
      { ...m, staffProfile: m.user.staffProfile ?? null },
      org.owner.staffProfile?.full_name ?? "Organization Owner"
    )
  );
}

/** Organizations a user owns (Sprint 3: the real ownership notion — Organization.owner_user_id). */
export async function listOrganizationsForOwner(userId: string): Promise<Organization[]> {
  const orgs = await listOrganizationsOwnedBy(userId);
  return orgs.map(organizationFromRow);
}

/** The user's membership in one organization, or null. */
export async function getMembership(
  userId: string,
  organizationId: string
): Promise<OrganizationMember | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { owner: { include: { staffProfile: true } } },
  });
  if (!org) return null;

  if (org.owner_user_id === userId) {
    return memberFromRow(
      {
        id: "",
        organization_id: organizationId,
        user_id: userId,
        role: "owner",
        created_at: org.created_at,
        staffProfile: org.owner.staffProfile,
      },
      org.owner.staffProfile?.full_name ?? "Organization Owner"
    );
  }

  const member = await prisma.organizationMember.findUnique({
    where: { organization_id_user_id: { organization_id: organizationId, user_id: userId } },
  });
  if (!member) return null;

  const profile = await prisma.staffProfile.findUnique({ where: { user_id: userId } });
  return memberFromRow({ ...member, staffProfile: profile }, "Organization Owner");
}
