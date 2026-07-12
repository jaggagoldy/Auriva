// Shared types and helpers for the Super Admin workspace console.
// Shapes mirror the responses of GET /api/clinics and GET /api/doctors.

import { memberRoleFromSpecialty } from "@/domain/organization";
import { Doctor } from "@/shared/queue";

export interface ClinicSummary {
  id: string;
  name: string;
  address: string;
  super_admin_id: string;
  organization_id: string;
  staffProfiles: { id: string; full_name: string; specialty: string | null; is_active: boolean }[];
}

export type StaffRole = "super_admin" | "doctor" | "receptionist";

export interface PendingInvite {
  id: string;
  full_name: string;
  email: string;
  role: Exclude<StaffRole, "super_admin">;
  specialty: string | null;
  invited_at: string;
  /** APS-044: present for real (persisted) invitations — the accept link. */
  token?: string | null;
}

/** Maps a persisted Invitation row (API shape) to the table's view model. */
export function pendingInviteFromApi(row: {
  id: string;
  full_name: string;
  email: string;
  role: string;
  specialty: string | null;
  created_at: string;
  token?: string | null;
}): PendingInvite {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role === "doctor" ? "doctor" : "receptionist",
    specialty: row.specialty,
    invited_at: row.created_at,
    token: row.token ?? null,
  };
}

export const ROLE_META: Record<StaffRole, { label: string; badge: string }> = {
  super_admin: {
    label: "Super Admin",
    badge: "bg-info/10 text-info dark:text-info",
  },
  doctor: {
    label: "Doctor",
    badge: "bg-success/10 text-success dark:text-success",
  },
  receptionist: {
    label: "Receptionist",
    badge: "bg-info/10 text-info dark:text-info",
  },
};

/**
 * APS-040: GET /api/doctors now exposes the membership role; the specialty
 * heuristic in src/domain/organization.ts survives only as a fallback for
 * responses that predate the backfill (e.g. cached payloads).
 */
export function roleOf(staff: Doctor & { role?: string }): StaffRole {
  if (staff.role === "doctor" || staff.role === "receptionist" || staff.role === "super_admin") {
    return staff.role;
  }
  return memberRoleFromSpecialty(staff.specialty);
}
