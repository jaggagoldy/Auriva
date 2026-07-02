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
  events?: AppointmentEvent[];
  patient: {
    id: string;
    full_name: string;
    blood_group: string;
    user_id: string;
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
  clinic: { id: string; name: string; address: string };
  user: { id: string; email: string | null; phone_number: string };
}

/** Display order of the queue groups, most urgent first. */
export const QUEUE_ORDER: AppointmentStatus[] = [
  "doctor_ready",
  "in_consultation",
  "waiting",
  "checked_in",
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
];

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; dot: string; badge: string }
> = {
  doctor_ready: {
    label: "Doctor Ready",
    dot: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  in_consultation: {
    label: "In Consultation",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  waiting: {
    label: "Waiting",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  checked_in: {
    label: "Checked In",
    dot: "bg-cyan-500",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-muted-foreground/40",
    badge: "bg-muted text-muted-foreground",
  },
  no_show: {
    label: "No Show",
    dot: "bg-orange-500",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
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
