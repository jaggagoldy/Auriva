// Shared types and helpers for the Doctor Live Queue console.
// Shapes mirror the responses of GET /api/appointments and GET /api/doctors.

import type { AppointmentStatus } from "@/domain/appointment-status";
export type { AppointmentStatus } from "@/domain/appointment-status";

export interface AppointmentEvent {
  id: string;
  type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  scheduled_time: string;
  status: AppointmentStatus;
  queue_number: number | null;
  checked_in_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  priority: number;
  walk_in: boolean;
  notes: string | null;
  chief_complaint: string | null;
  history_notes: string | null;
  vitals_json: string | null;
  diagnosis: string | null;
  prescription_notes: string | null;
  prescription_medicines_json: string | null;
  follow_up_date: string | null;
  events?: AppointmentEvent[];
  patient: {
    id: string;
    full_name: string;
    blood_group: string;
    // Nullable since APS-029/010: a Healthcare Profile can exist with no
    // Auriva Account at all (reception/emergency registration).
    user_id: string | null;
    health_id?: string;
    date_of_birth?: string | null;
    gender?: string | null;
    allergies?: string | null;
    chronic_conditions?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    user?: { phone_number: string };
  };
  doctor: {
    id: string;
    full_name: string;
    specialty: string | null;
    clinic_id: string;
    user_id: string;
  };
  clinic: {
    id: string;
    name: string;
    address: string;
  };
}

export interface Doctor {
  id: string;
  full_name: string;
  specialty: string | null;
  clinic_id: string;
  /** Sprint 3: employment status — false = deactivated staff member. */
  is_active?: boolean;
  /** Sprint 3: department the staff member is assigned to, if any. */
  department_id?: string | null;
  bio?: string | null;
  years_experience?: number | null;
  languages?: string | null;
  qualifications?: string | null;
  registration_number?: string | null;
  consultation_fee?: number | null;
  /** Real average (from seeded/patient Review rows) — null when the doctor has none yet, never a fabricated default. */
  ratingAvg?: number | null;
  reviewCount?: number;
  clinic: {
    id: string;
    name: string;
    address: string;
    is_verified?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  };
  user: { id: string; email: string | null; phone_number: string };
}

export interface Vitals {
  bp: string;
  pulse: string;
  temp: string;
  spo2: string;
  weight: string;
}

export function parseVitals(json: string | null): Vitals | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return {
      bp: parsed.bp ?? "",
      pulse: parsed.pulse ?? "",
      temp: parsed.temp ?? "",
      spo2: parsed.spo2 ?? "",
      weight: parsed.weight ?? "",
    };
  } catch {
    return null;
  }
}

export interface PrescriptionMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export function parseMedicines(json: string | null): PrescriptionMedicine[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Display order of the queue groups, most urgent first. */
export const QUEUE_ORDER: AppointmentStatus[] = [
  "doctor_ready",
  "in_consultation",
  "waiting",
  "skipped",
  "checked_in",
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
];

// Fixed platform-wide status palette (design/auriva-design-system.html §02 —
// "Status is sacred": one color language, dot + label, never color alone).
// The app's 8-state machine doesn't map 1:1 onto the spec's separate
// Appointment/Queue palettes, so each state borrows the closest spec hue
// while keeping all 8 visually distinct within one queue view.
export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; dot: string; badge: string }
> = {
  doctor_ready: {
    label: "Doctor Ready",
    dot: "bg-[#0284C7]",
    badge: "bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD] dark:bg-[#0284C7]/15 dark:text-[#7DD3FC] dark:border-[#0284C7]/30",
  },
  in_consultation: {
    label: "In Consultation",
    dot: "bg-[#0F766E]",
    badge: "bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4] dark:bg-[#0F766E]/20 dark:text-[#5EEAD4] dark:border-[#0F766E]/40",
  },
  waiting: {
    label: "Waiting",
    dot: "bg-[#D97706]",
    badge: "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] dark:bg-[#D97706]/15 dark:text-[#FBBF24] dark:border-[#D97706]/30",
  },
  skipped: {
    label: "Skipped",
    dot: "bg-[#94A3B8]",
    badge: "bg-[#F8FAFC] text-[#64748B] border border-dashed border-[#CBD5E1] dark:bg-[#64748B]/10 dark:text-[#94A3B8] dark:border-[#64748B]/30",
  },
  checked_in: {
    label: "Checked In",
    dot: "bg-[#4F46E5]",
    badge: "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] dark:bg-[#4F46E5]/15 dark:text-[#A5B4FC] dark:border-[#4F46E5]/30",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-[#2563EB]",
    badge: "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] dark:bg-[#2563EB]/15 dark:text-[#93C5FD] dark:border-[#2563EB]/30",
  },
  completed: {
    label: "Completed",
    dot: "bg-[#16A34A]",
    badge: "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#16A34A]/15 dark:text-[#4ADE80] dark:border-[#16A34A]/30",
  },
  no_show: {
    label: "No Show",
    dot: "bg-[#64748B]",
    badge: "bg-[#F8FAFC] text-[#64748B] border border-dashed border-[#E2E8F0] dark:bg-[#64748B]/10 dark:text-[#94A3B8] dark:border-[#64748B]/30",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-[#DC2626]",
    badge: "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] dark:bg-[#DC2626]/15 dark:text-[#F87171] dark:border-[#DC2626]/30",
  },
};

export function getInitials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export function formatTime(date: string | Date): string {
  return timeFormat.format(new Date(date));
}

export function formatDay(date: string | Date): string {
  return dayFormat.format(new Date(date));
}

export function isToday(date: string | Date): boolean {
  return new Date(date).toDateString() === new Date().toDateString();
}

/** Compact relative time, e.g. "in 2h 15m", "40m ago", "3d ago". */
export function formatRelative(date: string | Date, now = new Date()): string {
  const diffMin = Math.round(
    (new Date(date).getTime() - now.getTime()) / 60_000
  );
  if (diffMin === 0) return "now";
  const abs = Math.abs(diffMin);
  let span: string;
  if (abs >= 1_440) span = `${Math.round(abs / 1_440)}d`;
  else if (abs >= 60)
    span = `${Math.floor(abs / 60)}h${abs % 60 ? ` ${abs % 60}m` : ""}`;
  else span = `${abs}m`;
  return diffMin > 0 ? `in ${span}` : `${span} ago`;
}
