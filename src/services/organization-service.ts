// Organization service — the seam future multi-workspace features build on.
//
// Nothing in the Sprint 1 UI calls this yet, and that is intentional: it
// exists so the next sprint can resolve "which organizations does this user
// belong to, and as what role" through one service instead of re-deriving it
// from clinic ownership and staff profiles ad hoc (the way
// src/api/session.ts currently does — migrating that guard onto this
// service is a deliberate follow-up, tracked in docs/technical-debt.md,
// because it would change observable auth behavior).

import type { Clinic, StaffProfile } from "@prisma/client";
import {
  Organization,
  OrganizationMember,
  memberRoleFromSpecialty,
} from "@/domain/organization";
import {
  findClinicForOrganization,
  findStaffProfileInClinic,
  listClinicsOwnedBy,
} from "@/repositories/organization-repository";

type ClinicWithStaff = Clinic & {
  staffProfiles: (StaffProfile & { user: { id: string } })[];
};

/** Pure mapping: one clinic row -> one Organization. */
export function organizationFromClinic(clinic: Clinic): Organization {
  return {
    id: clinic.id,
    type: "clinic",
    name: clinic.name,
    address: clinic.address,
    ownerUserId: clinic.super_admin_id,
  };
}

/** Pure mapping: clinic staff (+ implicit owner) -> members with derived roles. */
export function membersFromClinic(clinic: ClinicWithStaff): OrganizationMember[] {
  const staffMembers: OrganizationMember[] = clinic.staffProfiles.map(
    (profile) => ({
      organizationId: clinic.id,
      userId: profile.user_id,
      profileId: profile.id,
      role: memberRoleFromSpecialty(profile.specialty),
      displayName: profile.full_name,
      specialty: profile.specialty,
    })
  );

  // The owner is an implicit member today (Clinics.super_admin_id column);
  // a real OrganizationMember row tomorrow.
  const owner: OrganizationMember = {
    organizationId: clinic.id,
    userId: clinic.super_admin_id,
    profileId:
      clinic.staffProfiles.find((p) => p.user_id === clinic.super_admin_id)
        ?.id ?? null,
    role: "owner",
    displayName:
      clinic.staffProfiles.find((p) => p.user_id === clinic.super_admin_id)
        ?.full_name ?? "Workspace Owner",
    specialty: null,
  };

  return [owner, ...staffMembers.filter((m) => m.userId !== owner.userId)];
}

export async function getOrganization(
  organizationId: string
): Promise<Organization | null> {
  const clinic = await findClinicForOrganization(organizationId);
  return clinic ? organizationFromClinic(clinic) : null;
}

export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const clinic = await findClinicForOrganization(organizationId);
  return clinic ? membersFromClinic(clinic) : [];
}

/** Organizations a user owns (the only ownership notion Sprint 1 has). */
export async function listOrganizationsForOwner(
  userId: string
): Promise<Organization[]> {
  const clinics = await listClinicsOwnedBy(userId);
  return clinics.map(organizationFromClinic);
}

/**
 * The user's membership in one organization, or null. Encodes exactly the
 * resolution rules the session guard applies today: ownership wins, then
 * staff profile with the specialty-derived role.
 */
export async function getMembership(
  userId: string,
  organizationId: string
): Promise<OrganizationMember | null> {
  const clinic = await findClinicForOrganization(organizationId);
  if (!clinic) return null;

  if (clinic.super_admin_id === userId) {
    return membersFromClinic(clinic).find((m) => m.role === "owner") ?? null;
  }

  const profile = await findStaffProfileInClinic(userId, organizationId);
  if (!profile) return null;

  return {
    organizationId,
    userId,
    profileId: profile.id,
    role: memberRoleFromSpecialty(profile.specialty),
    displayName: profile.full_name,
    specialty: profile.specialty,
  };
}
