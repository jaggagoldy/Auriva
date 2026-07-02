// Organization abstraction — the platform-level model that future workspace
// types (hospitals, labs, pharmacy chains) will plug into.
//
// Sprint 1 has no Organization tables. These types are deliberately mapped
// onto the existing rows with NO schema migration:
//
//   Organization        <- Clinics            (one clinic = one organization)
//   OrganizationMember  <- Staff_Profiles     (+ the implicit owner from
//                                              Clinics.super_admin_id)
//   OrganizationRole    <- derived            (no role column exists yet:
//                                              owner from super_admin_id,
//                                              doctor/receptionist from the
//                                              specialty heuristic below)
//
// When real Organization tables land (see docs/technical-debt.md), only the
// repository/service mapping changes — consumers of these types do not.
//
// This module is pure TypeScript (no Prisma, no Next) so both server and
// client code may import it.

export type OrganizationType = "clinic";

export type OrganizationRole = "owner" | "doctor" | "receptionist";

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  address: string;
  /** Maps to Clinics.super_admin_id — ownership is a column today, a membership tomorrow. */
  ownerUserId: string;
}

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  /** Staff_Profiles.id when the member has a staff profile; null for the implicit owner. */
  profileId: string | null;
  role: OrganizationRole;
  displayName: string;
  specialty: string | null;
}

/**
 * THE staff-role heuristic, centralized. Staff_Profiles has no role column,
 * so Sprint 1 infers: a staff member with a specialty is a doctor, one
 * without is a receptionist. Previously duplicated in
 * src/services/reception-service.ts and src/shared/workspace.ts — every
 * consumer must go through this function so a future real role column only
 * changes one line.
 */
export function memberRoleFromSpecialty(
  specialty: string | null | undefined
): Extract<OrganizationRole, "doctor" | "receptionist"> {
  return specialty ? "doctor" : "receptionist";
}
