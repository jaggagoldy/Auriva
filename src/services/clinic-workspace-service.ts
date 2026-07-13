// Milestone 1 (First Clinic Ready), Batch 4 — the "My Clinic" workspace read
// model. One place that answers the workspace's core questions with REAL
// queries (no seeded/guessed numbers): "Am I ready?" (Clinic Ready + the always-
// visible next action), "What's happening today?", and the clinic summary the
// header needs. Write side is tiny (mark the booking page as shared); the
// heavier mutations live in their own services (treatments, booking-status).

import prisma from "@/lib/prisma";
import { billingDaySummary } from "@/services/billing-service";
import { AmbiguousDoctorError, resolveClinicDoctor } from "@/services/doctor-resolution";
import { logger } from "@/api/logger";

export interface ReadyStep {
  key: string;
  label: string;
  done: boolean;
}

// After Clinic Ready reaches 100%, the workspace switches to a patient goal
// (Product Office Batch 4 amendment) — long-term engagement, not a dead 100%.
const PATIENT_GOALS = [10, 20, 50, 100, 250, 500, 1000];

// Product Office order (Batch 4): follows the owner's real journey.
const STEP_ORDER = [
  { key: "treatment", label: "Add your first treatment" },
  { key: "patient", label: "Book your first patient" },
  { key: "payment", label: "Record your first payment" },
  { key: "share", label: "Share your booking page" },
  { key: "profile", label: "Complete your profile" },
] as const;

/**
 * The clinic's home screen data: identity, the Accepting-Bookings state, the
 * owner's booking path, and Clinic Ready (steps + percent + the single next
 * action). Every step is a live query — a treatment exists, a patient was
 * booked, a payment was recorded, the page was shared, the profile was filled.
 */
export async function getClinicOverview(clinicId: string, ownerUserId: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      id: true,
      name: true,
      phone: true,
      accepting_bookings: true,
      booking_shared_at: true,
      // Batch 6: surfaces the Demo Mode banner + one-click Reset in /clinic.
      organization: { select: { is_demo: true } },
    },
  });
  if (!clinic) return null;

  // The solo owner's own doctor profile (their bookable identity + profile
  // fields), or the clinic's one unambiguous doctor if the owner isn't the
  // practitioner. BRD-043 US-104 (P0): a clinic with 2+ doctors and no
  // caller-owned profile has no correct guess here — degrade to "no default
  // booking identity yet" (null) rather than silently picking one; Sprint 3's
  // Adaptive Dashboard is where an Owner explicitly sees all doctors instead
  // of this single-identity shortcut.
  let ownerProfile;
  try {
    ownerProfile = await resolveClinicDoctor(clinicId, ownerUserId);
  } catch (error) {
    if (!(error instanceof AmbiguousDoctorError)) throw error;
    logger.warn("clinic_overview.ambiguous_doctor", { clinicId });
    ownerProfile = null;
  }

  const [activeTreatments, appointmentCount, paymentCount] = await Promise.all([
    prisma.service.count({ where: { clinic_id: clinicId, is_active: true } }),
    prisma.appointment.count({ where: { clinic_id: clinicId } }),
    prisma.payment.count({ where: { clinic_id: clinicId } }),
  ]);

  const profileComplete = Boolean(
    ownerProfile && (ownerProfile.bio?.trim() || ownerProfile.registration_number?.trim())
  );

  const done: Record<string, boolean> = {
    treatment: activeTreatments > 0,
    patient: appointmentCount > 0,
    payment: paymentCount > 0,
    share: clinic.booking_shared_at != null,
    profile: profileComplete,
  };

  const steps: ReadyStep[] = STEP_ORDER.map((s) => ({ key: s.key, label: s.label, done: done[s.key] }));
  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done) ?? null;

  // Once every setup step is done, the home flips to a patient goal.
  let goal: { seen: number; target: number } | null = null;
  if (nextStep === null) {
    const seen = await prisma.appointment.count({
      where: { clinic_id: clinicId, status: "completed" },
    });
    const target = PATIENT_GOALS.find((g) => g > seen) ?? seen;
    goal = { seen, target };
  }

  return {
    clinic: {
      id: clinic.id,
      name: clinic.name,
      phone: clinic.phone,
      accepting_bookings: clinic.accepting_bookings,
      is_demo: clinic.organization.is_demo,
    },
    doctorId: ownerProfile?.id ?? null,
    bookingPath: ownerProfile ? `/book/${ownerProfile.id}` : null,
    ready: { steps, completed, total: steps.length, percent, nextStep, goal },
  };
}

/** Marks the booking page as shared (idempotent — only sets the first time). */
export async function markBookingShared(clinicId: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { booking_shared_at: true },
  });
  if (clinic?.booking_shared_at) return clinic; // already shared — don't overwrite the first time
  return prisma.clinic.update({
    where: { id: clinicId },
    data: { booking_shared_at: new Date() },
  });
}

/**
 * Today's schedule for the action-oriented Today screen — soonest first, plus
 * the assistant-style summary (counts + money collected today + the owner's
 * name for the greeting). No charts/KPIs, just what to do next. Local calendar
 * day, not UTC — matches getBookableSlots' timezone handling.
 */
export type ScheduleScope = "today" | "upcoming" | "all";

const APPOINTMENT_LIST_SELECT = {
  id: true,
  scheduled_time: true,
  status: true,
  queue_number: true,
  walk_in: true,
  notes: true, // visit reason — shown under the "next patient" hero
  follow_up_source_appointment_id: true,
  patient: { select: { id: true, full_name: true } },
  invoice: { select: { status: true, total: true } },
} as const;

export async function getTodayAppointments(
  clinicId: string,
  ownerUserId?: string,
  scope: ScheduleScope = "today",
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const now = new Date();

  // The displayed list follows the scope; the hero summary (seen/remaining/
  // money) is always about *today*, so it's computed from a separate today
  // query regardless of which tab is showing.
  const listWhere =
    scope === "today"
      ? { clinic_id: clinicId, scheduled_time: { gte: start, lt: end } }
      : scope === "upcoming"
        ? { clinic_id: clinicId, scheduled_time: { gte: now }, status: { notIn: ["completed", "cancelled", "no_show"] } }
        : { clinic_id: clinicId };

  const [list, todaySummaryRows, futureCount, money, owner] = await Promise.all([
    prisma.appointment.findMany({
      where: listWhere,
      orderBy: { scheduled_time: scope === "all" ? "desc" : "asc" },
      take: scope === "all" ? 200 : undefined,
      select: APPOINTMENT_LIST_SELECT,
    }),
    prisma.appointment.findMany({
      where: { clinic_id: clinicId, scheduled_time: { gte: start, lt: end } },
      select: { status: true, follow_up_source_appointment_id: true },
    }),
    // Appointments on a future day (tomorrow onward) still to happen — powers
    // the "no one today, but N upcoming" hint so the empty state never lies.
    prisma.appointment.count({
      where: { clinic_id: clinicId, scheduled_time: { gte: end }, status: { notIn: ["completed", "cancelled", "no_show"] } },
    }),
    billingDaySummary(clinicId),
    ownerUserId
      ? prisma.staffProfile.findFirst({ where: { user_id: ownerUserId, clinic_id: clinicId }, select: { full_name: true } })
      : Promise.resolve(null),
  ]);

  const total = todaySummaryRows.length;
  const completed = todaySummaryRows.filter((a) => a.status === "completed").length;
  const followUps = todaySummaryRows.filter((a) => a.follow_up_source_appointment_id != null).length;

  return {
    scope,
    appointments: list,
    total,
    completed,
    remaining: total - completed,
    follow_ups: followUps,
    upcoming_count: futureCount,
    collected_today: money.collected_today,
    outstanding_total: money.outstanding_total,
    owner_name: owner?.full_name ?? null,
  };
}

/**
 * Today's recorded payments for the Payments screen ("What have I collected?").
 * Real rows only — reuses billingDaySummary for the totals.
 */
export async function getTodayPayments(clinicId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [payments, summary] = await Promise.all([
    prisma.payment.findMany({
      where: { clinic_id: clinicId, received_at: { gte: start } },
      orderBy: { received_at: "desc" },
      select: {
        id: true,
        amount: true,
        method: true,
        received_at: true,
        invoice: {
          select: { invoice_number: true, patient: { select: { full_name: true } } },
        },
      },
    }),
    billingDaySummary(clinicId),
  ]);

  return { payments, summary };
}
