// Shared types and helpers for the Super Admin workspace console.
// Shapes mirror the responses of GET /api/clinics and GET /api/doctors.

import { memberRoleFromSpecialty } from "@/domain/organization";
import { Doctor } from "@/shared/queue";

export interface ClinicSummary {
  id: string;
  name: string;
  address: string;
  super_admin_id: string;
  staffProfiles: { id: string; full_name: string; specialty: string | null }[];
}

export type StaffRole = "super_admin" | "doctor" | "receptionist";

export interface PendingInvite {
  id: string;
  full_name: string;
  email: string;
  role: Exclude<StaffRole, "super_admin">;
  specialty: string | null;
  invited_at: string;
}

export const ROLE_META: Record<StaffRole, { label: string; badge: string }> = {
  super_admin: {
    label: "Super Admin",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  doctor: {
    label: "Doctor",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  receptionist: {
    label: "Receptionist",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
};

/**
 * Staff_Profiles has no role column — the role lives on the linked User,
 * which GET /api/doctors doesn't expose yet. Delegates to the single
 * platform-wide heuristic in src/domain/organization.ts.
 */
export function roleOf(staff: Doctor): StaffRole {
  return memberRoleFromSpecialty(staff.specialty);
}
