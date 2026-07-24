// Shared types and helpers for the Super Admin workspace console.
// Shapes mirror the responses of GET /api/clinics and GET /api/doctors.

import { Doctor } from "@/shared/queue";

export interface ClinicSummary {
  id: string;
  name: string;
  address: string;
  super_admin_id: string;
  organization_id: string;
  staffProfiles: { id: string; full_name: string; specialty: string | null; is_active: boolean }[];
}

export type StaffRole =
  | "super_admin"
  | "doctor"
  | "receptionist"
  | "practice_manager"
  | "nurse"
  | "technician";

const STAFF_ROLES: readonly StaffRole[] = [
  "super_admin",
  "doctor",
  "receptionist",
  "practice_manager",
  "nurse",
  "technician",
];

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
    label: "Owner",
    badge: "bg-primary/10 text-primary",
  },
  doctor: {
    label: "Doctor",
    badge: "bg-success/10 text-success dark:text-success",
  },
  receptionist: {
    label: "Receptionist",
    badge: "bg-info/10 text-info dark:text-info",
  },
  practice_manager: {
    label: "Practice Manager",
    badge: "bg-primary/10 text-primary",
  },
  nurse: {
    label: "Nurse",
    badge: "bg-success/10 text-success dark:text-success",
  },
  technician: {
    label: "Technician",
    badge: "bg-info/10 text-info dark:text-info",
  },
};

/**
 * D4: the member's role is read from the explicit role the API exposes
 * (Organization_Members.role / Users.role) — the legacy specialty heuristic is
 * gone. An unknown/missing role degrades to the least-privileged "receptionist".
 */
export function roleOf(staff: Doctor & { role?: string }): StaffRole {
  return staff.role && (STAFF_ROLES as readonly string[]).includes(staff.role)
    ? (staff.role as StaffRole)
    : "receptionist";
}
