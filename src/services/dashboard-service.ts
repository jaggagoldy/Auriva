// BRD-043 Sprint 3 (US-301..305) — the adaptive, role-shaped dashboard.
//
// SECURITY-CRITICAL, frozen non-negotiable: the SERVER decides the payload.
// A Doctor's response object literally does not contain revenue / collections
// / subscription / team fields — they are never assembled, not hidden in
// React, not stripped after the fact. Each role has its own builder that
// composes only the data that role is permitted to see. The contract +
// snapshot tests in dashboard-service.test.ts are the release gate that keeps
// this true as the code evolves.
//
// One endpoint, one /clinic surface, adaptive content — no per-role routes.
//
// Sprint 3 boundary (no Sprint 4 leakage): the dashboard may DISPLAY a team
// summary (names, roles, active/suspended status, counts) but performs NO
// membership mutations — suspend/reactivate/archive/reassign belong to
// Sprint 4. The "Manage team" affordance only navigates to the Team screen.

import prisma from "@/lib/prisma";
import { billingDaySummary } from "@/services/billing-service";
import { planLimits } from "@/domain/subscription";

export type DashboardRole = "practice_owner" | "managing_doctor" | "doctor" | "receptionist";

const AVATAR_STOPWORDS = new Set(["dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms."]);
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => !AVATAR_STOPWORDS.has(p.toLowerCase()));
  const use = parts.length ? parts : name.trim().split(/\s+/);
  return (use[0]?.[0] ?? "") + (use[1]?.[0] ?? "");
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Resolves which of the four personas the caller is, from server-trusted
 * state only (never a client hint):
 *   - Owner of the org (Organization.owner_user_id) who ALSO has a
 *     StaffProfile in this clinic → Managing Doctor (they run the business
 *     AND practise — the common solo case).
 *   - Owner with NO StaffProfile → Practice Owner (business only).
 *   - A non-owner with a doctor StaffProfile → Doctor.
 *   - Otherwise (reception staff) → Receptionist.
 */
export async function resolveDashboardRole(
  clinicId: string,
  userId: string
): Promise<DashboardRole> {
  const [clinic, ownProfile] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { organization: { select: { owner_user_id: true } } } }),
    prisma.staffProfile.findFirst({ where: { user_id: userId, clinic_id: clinicId }, select: { specialty: true } }),
  ]);
  const isOwner = clinic?.organization.owner_user_id === userId;

  if (isOwner) {
    // An owner who also holds a StaffProfile at this clinic is the practising
    // "Managing Doctor"; an owner without one is a business-only Practice Owner.
    return ownProfile ? "managing_doctor" : "practice_owner";
  }
  // Non-owner staff: a doctor has a specialty-bearing profile; everyone else
  // in reception is a Receptionist. (specialty is the codebase's doctor
  // signal — see doctor-resolution.ts — and is reliable for non-owners.)
  if (ownProfile && ownProfile.specialty) return "doctor";
  return "receptionist";
}

// ---- shared data helpers (each returns plain, role-agnostic slices) ----

const APPT_SELECT = {
  id: true,
  scheduled_time: true,
  status: true,
  walk_in: true,
  notes: true,
  follow_up_source_appointment_id: true,
  patient: { select: { id: true, full_name: true } },
  doctor: { select: { id: true, full_name: true } },
  invoice: { select: { status: true, total: true } },
} as const;

function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

interface ApptRow {
  id: string;
  scheduled_time: Date;
  status: string;
  walk_in: boolean;
  notes: string | null;
  follow_up_source_appointment_id: string | null;
  patient: { id: string; full_name: string } | null;
  doctor: { id: string; full_name: string } | null;
}

function toAppointmentView(a: ApptRow, opts: { withDoctor?: boolean } = {}) {
  return {
    id: a.id,
    time: a.scheduled_time.toISOString(),
    patient_name: a.patient?.full_name ?? "Unknown",
    initials: initials(a.patient?.full_name ?? "?"),
    status: a.status,
    walk_in: a.walk_in,
    is_follow_up: a.follow_up_source_appointment_id != null,
    reason: a.notes,
    ...(opts.withDoctor ? { doctor_name: a.doctor?.full_name ?? null } : {}),
  };
}

async function todayAppointments(clinicId: string, doctorId?: string) {
  const { start, end } = dayBounds();
  const rows = (await prisma.appointment.findMany({
    where: { clinic_id: clinicId, scheduled_time: { gte: start, lt: end }, ...(doctorId ? { doctor_id: doctorId } : {}) },
    orderBy: { scheduled_time: "asc" },
    select: APPT_SELECT,
  })) as ApptRow[];
  return rows;
}

function apptCounts(rows: ApptRow[]) {
  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const waiting = rows.filter((r) => r.status === "checked_in" || r.status === "waiting").length;
  const walkIns = rows.filter((r) => r.walk_in).length;
  return { total, completed, remaining: total - completed, waiting, walkIns };
}

/** Active team members at the clinic (display only — Sprint 3 shows, Sprint 4 mutates). */
async function teamSummary(clinicId: string, ownerUserId: string) {
  const profiles = await prisma.staffProfile.findMany({
    where: { clinic_id: clinicId },
    select: { user_id: true, full_name: true, specialty: true, membership_status: true },
    orderBy: { full_name: "asc" },
  });
  const members = profiles.map((p) => ({
    name: p.full_name,
    initials: initials(p.full_name),
    role: p.user_id === ownerUserId ? "Managing Doctor" : p.specialty ? "Doctor" : "Receptionist",
    status: p.membership_status,
    is_owner: p.user_id === ownerUserId,
  }));
  const activeCount = members.filter((m) => m.status === "active").length;
  return { members, active_count: activeCount };
}

/** Operational alerts for owner/managing-doctor (invites expiring, collections, seats). */
async function operationalAlerts(organizationId: string, clinicId: string, plan: string, outstandingCount: number) {
  const alerts: string[] = [];
  const pendingInvites = await prisma.invitation.findMany({
    where: { organization_id: organizationId, status: "pending" },
    select: { expires_at: true },
  });
  const now = Date.now();
  const live = pendingInvites.filter((i) => !i.expires_at || i.expires_at.getTime() > now);
  const soonest = live
    .map((i) => i.expires_at?.getTime() ?? Infinity)
    .sort((a, b) => a - b)[0];
  if (soonest && soonest !== Infinity) {
    const hours = Math.max(1, Math.round((soonest - now) / (60 * 60 * 1000)));
    alerts.push(`1 invitation expires in ${hours} hour${hours === 1 ? "" : "s"}`);
  }
  if (outstandingCount > 0) {
    alerts.push(`${outstandingCount} invoice${outstandingCount === 1 ? "" : "s"} pending collection`);
  }
  // Seat usage (non-owner active StaffProfiles + live pending invites).
  const [activeNonOwner] = await Promise.all([
    prisma.staffProfile.count({ where: { clinic_id: clinicId, membership_status: "active" } }),
  ]);
  const limits = planLimits(plan);
  const seatsUsed = Math.max(0, activeNonOwner - 1) + live.length; // owner is free
  if (Number.isFinite(limits.maxSeats)) {
    alerts.push(`${seatsUsed} of ${limits.maxSeats} ${limits.label} seats used`);
  }
  return alerts;
}

async function followUpsDue(clinicId: string, doctorId?: string) {
  const now = new Date();
  const rows = (await prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      ...(doctorId ? { doctor_id: doctorId } : {}),
      follow_up_source_appointment_id: { not: null },
      status: { notIn: ["completed", "cancelled", "no_show"] },
      scheduled_time: { gte: now },
    },
    orderBy: { scheduled_time: "asc" },
    take: 5,
    select: APPT_SELECT,
  })) as ApptRow[];
  return rows.map((r) => toAppointmentView(r));
}

async function recentConsultations(clinicId: string, doctorId: string) {
  const rows = (await prisma.appointment.findMany({
    where: { clinic_id: clinicId, doctor_id: doctorId, status: "completed" },
    orderBy: { scheduled_time: "desc" },
    take: 5,
    select: APPT_SELECT,
  })) as ApptRow[];
  return rows.map((r) => toAppointmentView(r));
}

// ---- role-shaped builders ----
// Each returns ONLY the fields its role may see. Do not add cross-role fields.

async function buildManagingDoctor(ctx: DashCtx) {
  const [myRows, clinicRows, billing, team] = await Promise.all([
    todayAppointments(ctx.clinicId, ctx.doctorId ?? undefined),
    todayAppointments(ctx.clinicId),
    billingDaySummary(ctx.clinicId),
    teamSummary(ctx.clinicId, ctx.ownerUserId),
  ]);
  const counts = apptCounts(clinicRows);
  const queue = myRows
    .filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show")
    .map((r) => toAppointmentView(r));
  const alerts = await operationalAlerts(ctx.organizationId, ctx.clinicId, ctx.plan, billing.open_invoices);
  return {
    role: "managing_doctor" as const,
    greeting: ctx.greeting,
    clinic_name: ctx.clinicName,
    owner_name: ctx.ownerName,
    kpis: {
      in_my_queue: queue.length,
      appointments_today: counts.total,
      revenue_today: billing.collected_today,
      team_active: team.active_count,
    },
    my_queue: queue,
    practice_performance: {
      collected_today: billing.collected_today,
      pending_collections: billing.outstanding_total,
    },
    team,
    alerts,
  };
}

async function buildPracticeOwner(ctx: DashCtx) {
  const [rows, billing, team] = await Promise.all([
    todayAppointments(ctx.clinicId),
    billingDaySummary(ctx.clinicId),
    teamSummary(ctx.clinicId, ctx.ownerUserId),
  ]);
  const counts = apptCounts(rows);
  const alerts = await operationalAlerts(ctx.organizationId, ctx.clinicId, ctx.plan, billing.open_invoices);
  return {
    role: "practice_owner" as const,
    greeting: ctx.greeting,
    clinic_name: ctx.clinicName,
    owner_name: ctx.ownerName,
    kpis: {
      appointments_today: counts.total,
      revenue_today: billing.collected_today,
      pending_collections: billing.outstanding_total,
      team_active: team.active_count,
    },
    appointments_all_doctors: rows.map((r) => toAppointmentView(r, { withDoctor: true })),
    team,
    alerts,
  };
}

// SECURITY: no revenue / collections / subscription / team keys are ever
// assembled here. This is the whole point of US-301.
async function buildDoctor(ctx: DashCtx) {
  const doctorId = ctx.doctorId!;
  const [rows, followUps, recent] = await Promise.all([
    todayAppointments(ctx.clinicId, doctorId),
    followUpsDue(ctx.clinicId, doctorId),
    recentConsultations(ctx.clinicId, doctorId),
  ]);
  const upcoming = rows.filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show");
  const next = upcoming[0] ? toAppointmentView(upcoming[0]) : null;
  return {
    role: "doctor" as const,
    greeting: ctx.greeting,
    clinic_name: ctx.clinicName,
    owner_name: ctx.ownerName,
    next_patient: next,
    appointments_today: rows.map((r) => toAppointmentView(r)),
    follow_ups: followUps,
    recent_consultations: recent,
  };
}

async function buildReceptionist(ctx: DashCtx) {
  const [rows, billing] = await Promise.all([
    todayAppointments(ctx.clinicId),
    billingDaySummary(ctx.clinicId),
  ]);
  const counts = apptCounts(rows);
  const waiting = rows.filter((r) => r.status === "checked_in" || r.status === "waiting").map((r) => toAppointmentView(r, { withDoctor: true }));
  const walkIns = rows.filter((r) => r.walk_in).map((r) => toAppointmentView(r, { withDoctor: true }));
  return {
    role: "receptionist" as const,
    greeting: ctx.greeting,
    clinic_name: ctx.clinicName,
    owner_name: ctx.ownerName,
    kpis: {
      waiting_now: counts.waiting,
      appointments_today: counts.total,
      walk_ins: counts.walkIns,
    },
    waiting_queue: waiting,
    today_appointments: rows.map((r) => toAppointmentView(r, { withDoctor: true })),
    // Operational collection framing ONLY — never "revenue"/analytics. This is
    // the money the front desk still needs to collect today.
    pending_to_collect: {
      count: billing.open_invoices,
      amount: billing.outstanding_total,
    },
    walk_ins: walkIns,
  };
}

interface DashCtx {
  clinicId: string;
  clinicName: string;
  organizationId: string;
  ownerUserId: string;
  ownerName: string | null;
  plan: string;
  doctorId: string | null;
  greeting: string;
}

/**
 * The single entry point behind GET /api/clinic/dashboard. Resolves the
 * caller's role server-side and returns that role's shape.
 */
export async function getDashboard(clinicId: string, userId: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, organization: { select: { id: true, owner_user_id: true, plan: true } } },
  });
  if (!clinic) return null;

  const role = await resolveDashboardRole(clinicId, userId);

  // The caller's own doctor profile id (for doctor/managing-doctor queues).
  const ownProfile = await prisma.staffProfile.findFirst({
    where: { user_id: userId, clinic_id: clinicId },
    select: { id: true, full_name: true },
  });

  const ctx: DashCtx = {
    clinicId,
    clinicName: clinic.name,
    organizationId: clinic.organization.id,
    ownerUserId: clinic.organization.owner_user_id,
    ownerName: ownProfile?.full_name ?? null,
    plan: clinic.organization.plan,
    doctorId: ownProfile?.id ?? null,
    greeting: greetingFor(new Date().getHours()),
  };

  switch (role) {
    case "managing_doctor":
      return buildManagingDoctor(ctx);
    case "practice_owner":
      return buildPracticeOwner(ctx);
    case "doctor":
      return buildDoctor(ctx);
    case "receptionist":
      return buildReceptionist(ctx);
  }
}
