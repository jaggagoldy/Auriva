// Organization abstraction (Sprint 3 / OPS-001) — Organization is now a real,
// distinct entity (see prisma/schema.prisma `model Organization`), no longer
// a TypeScript-level alias over Clinic. This module stays pure TypeScript
// (no Prisma, no Next) so both server and client code may import it; the
// mapping/query logic lives in src/services/organization-service.ts.

export type OrganizationType = "clinic_network";

export type OrganizationRole = "owner" | "doctor" | "receptionist";

export interface Organization {
  id: string;
  type: OrganizationType;
  name: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
  ownerUserId: string;
  archetype: OrgArchetype | null;
}

// The six presets a new organization can start from (register-org's "what
// kind of organization are you?" step). This is purely a config-path
// selector, never a fork — every module stays activatable for any org
// regardless of archetype. See ORG_ARCHETYPES below for the signup-time
// defaults each preset applies to the org's first clinic.
export type OrgArchetype =
  | "independent_clinic"
  | "multi_specialty"
  | "hospital"
  | "diagnostic_center"
  | "pharmacy_chain"
  | "day_care";

export interface OrgArchetypeMeta {
  id: OrgArchetype;
  label: string;
  description: string;
  /** Sensible starting defaults applied to the org's first clinic at signup. */
  defaults: {
    opens_at: string;
    closes_at: string;
    default_slot_duration_minutes: number;
    buffer_minutes: number;
    allow_walk_ins: boolean;
    working_days: string;
  };
}

export const ORG_ARCHETYPES: OrgArchetypeMeta[] = [
  {
    id: "independent_clinic",
    label: "Independent Clinic",
    description: "A single doctor or small practice — appointments, patients, billing.",
    defaults: {
      opens_at: "09:00",
      closes_at: "18:00",
      default_slot_duration_minutes: 15,
      buffer_minutes: 5,
      allow_walk_ins: true,
      working_days: "mon,tue,wed,thu,fri,sat",
    },
  },
  {
    id: "multi_specialty",
    label: "Multi-specialty Clinic",
    description: "Several doctors and specialties under one roof, sharing a front desk.",
    defaults: {
      opens_at: "09:00",
      closes_at: "20:00",
      default_slot_duration_minutes: 20,
      buffer_minutes: 5,
      allow_walk_ins: true,
      working_days: "mon,tue,wed,thu,fri,sat",
    },
  },
  {
    id: "hospital",
    label: "Hospital",
    description: "Departments, admissions, and round-the-clock operations.",
    defaults: {
      opens_at: "00:00",
      closes_at: "23:59",
      default_slot_duration_minutes: 20,
      buffer_minutes: 10,
      allow_walk_ins: true,
      working_days: "mon,tue,wed,thu,fri,sat,sun",
    },
  },
  {
    id: "diagnostic_center",
    label: "Diagnostic Center",
    description: "Lab and imaging orders, sample collection, fast turnaround.",
    defaults: {
      opens_at: "07:00",
      closes_at: "21:00",
      default_slot_duration_minutes: 10,
      buffer_minutes: 0,
      allow_walk_ins: true,
      working_days: "mon,tue,wed,thu,fri,sat",
    },
  },
  {
    id: "pharmacy_chain",
    label: "Pharmacy Chain",
    description: "Multiple stores, inventory and refills more than scheduled visits.",
    defaults: {
      opens_at: "08:00",
      closes_at: "22:00",
      default_slot_duration_minutes: 10,
      buffer_minutes: 0,
      allow_walk_ins: true,
      working_days: "mon,tue,wed,thu,fri,sat,sun",
    },
  },
  {
    id: "day_care",
    label: "Day Care Center",
    description: "Recurring therapy sessions and standing slots, not one-off visits.",
    defaults: {
      opens_at: "08:00",
      closes_at: "18:00",
      default_slot_duration_minutes: 30,
      buffer_minutes: 5,
      allow_walk_ins: false,
      working_days: "mon,tue,wed,thu,fri,sat",
    },
  },
];

export function isOrgArchetype(value: unknown): value is OrgArchetype {
  return ORG_ARCHETYPES.some((a) => a.id === value);
}

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  /** Staff_Profiles.id when the member has a staff profile; null for the implicit owner. */
  profileId: string | null;
  role: OrganizationRole;
  displayName: string;
  specialty: string | null;
  clinicId: string | null;
  isActive: boolean;
}

/**
 * @deprecated APS-040: Organization_Members rows are now the role source of
 * truth (backfilled by migration `aps040_credentials_and_memberships`, which
 * applied this heuristic one final time). This function survives ONLY as a
 * fallback for staff profiles that predate the backfill or cached payloads
 * without a role; new code must read the membership row.
 */
export function memberRoleFromSpecialty(
  specialty: string | null | undefined
): Extract<OrganizationRole, "doctor" | "receptionist"> {
  return specialty ? "doctor" : "receptionist";
}
