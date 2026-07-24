// C1 — Treatment Planning service. A plan is a sequence of sessions against one
// catalog service. Doctor owns clinical content (service/count/notes + lifecycle
// close/extend); reception operates sessions (book/reschedule/cancel). Charges
// happen only when a session's visit completes (see billing-engine
// capturePlanSessionCharge) — so unattended sessions never charge.

import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { scheduleAppointment } from "@/services/appointment-service";
import { canTransitionPlan, isSessionActionable, PlanStatus, planAcceptsSessions } from "@/domain/treatment-plan";
import { TYPE_CATEGORY, TYPE_NUMBER_PREFIX } from "@/domain/document";

export class TreatmentPlanError extends Error {}

async function orgId(clinicId: string) {
  return (await prisma.clinic.findUnique({ where: { id: clinicId }, select: { organization_id: true } }))?.organization_id ?? null;
}

async function requirePlan(planId: string, clinicId: string) {
  const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, clinic_id: clinicId } });
  if (!plan) throw new TreatmentPlanError("Treatment plan not found in this clinic.");
  return plan;
}

/** Doctor creates a plan (status draft) + N planned sessions. */
export async function createPlan(input: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  originAppointmentId?: string | null;
  title: string;
  serviceId: string;
  sessionsPlanned: number;
  notes?: string | null;
  actorUserId?: string | null;
}) {
  if (!input.title?.trim()) throw new TreatmentPlanError("A plan title is required.");
  if (!Number.isInteger(input.sessionsPlanned) || input.sessionsPlanned < 1) {
    throw new TreatmentPlanError("A plan needs at least one session.");
  }
  const service = await prisma.service.findFirst({ where: { id: input.serviceId, clinic_id: input.clinicId, is_active: true } });
  if (!service) throw new TreatmentPlanError("That service isn't available in this clinic.");

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.treatmentPlan.create({
      data: {
        clinic_id: input.clinicId,
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        origin_appointment_id: input.originAppointmentId ?? null,
        title: input.title.trim(),
        service_id: input.serviceId,
        sessions_planned: input.sessionsPlanned,
        notes: input.notes?.trim() || null,
        status: "draft",
        created_by_user_id: input.actorUserId ?? null,
      },
    });
    await tx.treatmentPlanSession.createMany({
      data: Array.from({ length: input.sessionsPlanned }, (_, i) => ({ plan_id: created.id, sequence: i + 1 })),
    });
    return created;
  });
  await recordAudit({ organizationId: await orgId(input.clinicId), actorUserId: input.actorUserId, action: "treatment_plan_created", detail: `${plan.title} · ${input.sessionsPlanned} sessions` });
  return getPlan(plan.id, input.clinicId);
}

async function movePlan(planId: string, clinicId: string, to: PlanStatus, action: string, actorUserId?: string | null) {
  const plan = await requirePlan(planId, clinicId);
  if (!canTransitionPlan(plan.status as PlanStatus, to)) {
    throw new TreatmentPlanError(`A "${plan.status}" plan cannot move to "${to}".`);
  }
  await prisma.treatmentPlan.update({ where: { id: plan.id }, data: { status: to } });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action, detail: plan.title });
  return getPlan(planId, clinicId);
}

export const activatePlan = (planId: string, clinicId: string, actor?: string | null) => movePlan(planId, clinicId, "active", "treatment_plan_activated", actor);
/** Doctor explicitly closes a plan — NOT automatic at N/N (may extend/repeat instead). */
export const completePlan = (planId: string, clinicId: string, actor?: string | null) => movePlan(planId, clinicId, "completed", "treatment_plan_completed", actor);
export const archivePlan = (planId: string, clinicId: string, actor?: string | null) => movePlan(planId, clinicId, "archived", "treatment_plan_archived", actor);
export const cancelPlan = (planId: string, clinicId: string, actor?: string | null) => movePlan(planId, clinicId, "cancelled", "treatment_plan_cancelled", actor);

/** Doctor edits clinical content (title/notes). Not allowed once completed/archived/cancelled. */
export async function updatePlanClinical(planId: string, clinicId: string, patch: { title?: string; notes?: string | null }, actorUserId?: string | null) {
  const plan = await requirePlan(planId, clinicId);
  if (plan.status === "completed" || plan.status === "archived" || plan.status === "cancelled") {
    throw new TreatmentPlanError("This plan can no longer be edited.");
  }
  await prisma.treatmentPlan.update({
    where: { id: plan.id },
    data: { ...(patch.title !== undefined ? { title: patch.title.trim() } : {}), ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}) },
  });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_plan_updated", detail: plan.id });
  return getPlan(planId, clinicId);
}

/** Doctor extends the plan by N more planned sessions (never auto — explicit clinical decision). */
export async function extendPlan(planId: string, clinicId: string, additional: number, actorUserId?: string | null) {
  const plan = await requirePlan(planId, clinicId);
  if (plan.status !== "active" && plan.status !== "completed") throw new TreatmentPlanError("Only an active or completed plan can be extended.");
  if (!Number.isInteger(additional) || additional < 1) throw new TreatmentPlanError("Extend by at least one session.");
  await prisma.$transaction(async (tx) => {
    const start = plan.sessions_planned;
    await tx.treatmentPlanSession.createMany({ data: Array.from({ length: additional }, (_, i) => ({ plan_id: plan.id, sequence: start + i + 1 })) });
    await tx.treatmentPlan.update({ where: { id: plan.id }, data: { sessions_planned: start + additional, status: "active" } }); // reopening a completed plan → active
  });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_plan_extended", detail: `+${additional} → ${plan.sessions_planned + additional}` });
  return getPlan(planId, clinicId);
}

/** Reception books the next bookable session (planned or needs_rebook) as an
 *  appointment. Concurrency-safe: the appointment_id is claimed with an atomic
 *  guarded update, so two receptionists can't double-book the same session
 *  (Amendment 9). */
export async function bookNextSession(planId: string, clinicId: string, input: { scheduledTime: string; doctorId?: string | null }, actorUserId?: string | null) {
  const plan = await requirePlan(planId, clinicId);
  if (!planAcceptsSessions(plan.status as PlanStatus)) throw new TreatmentPlanError("Only an active plan's sessions can be booked.");
  const next = await prisma.treatmentPlanSession.findFirst({
    where: { plan_id: plan.id, appointment_id: null, status: { in: ["planned", "needs_rebook"] } },
    orderBy: [{ status: "asc" }, { sequence: "asc" }], // needs_rebook (missed) first, then by sequence
  });
  if (!next) throw new TreatmentPlanError("No unbooked sessions remain — extend the plan first.");

  const appt = await scheduleAppointment({
    patientId: plan.patient_id,
    doctorId: input.doctorId ?? plan.doctor_id,
    clinicId,
    scheduledTime: input.scheduledTime,
  });
  // Atomic claim — only succeeds if the session is still unbooked.
  const claim = await prisma.treatmentPlanSession.updateMany({
    where: { id: next.id, appointment_id: null },
    data: { appointment_id: appt.id, status: "planned" },
  });
  if (claim.count === 0) {
    await prisma.appointment.delete({ where: { id: appt.id } }).catch(() => {});
    throw new TreatmentPlanError("That session was just booked by someone else — please try again.");
  }
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_session_booked", detail: `${plan.title} · session ${next.sequence}` });
  return getPlan(planId, clinicId);
}

/** Reception reschedules a booked session (moves its appointment time). */
export async function rescheduleSession(sessionId: string, clinicId: string, scheduledTime: string, actorUserId?: string | null) {
  const session = await prisma.treatmentPlanSession.findFirst({ where: { id: sessionId, plan: { clinic_id: clinicId } } });
  if (!session) throw new TreatmentPlanError("Session not found in this clinic.");
  if (!session.appointment_id) throw new TreatmentPlanError("This session isn't booked yet.");
  const when = new Date(scheduledTime);
  if (Number.isNaN(when.getTime())) throw new TreatmentPlanError("Invalid date/time.");
  await prisma.appointment.update({ where: { id: session.appointment_id }, data: { scheduled_time: when } });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_session_rescheduled", detail: `session ${session.sequence}` });
  return getPlan(session.plan_id, clinicId);
}

/** Session notes — clinical (doctor) and operational (reception), never mixed
 *  (Amendment 4). The caller (API) gates which field a role may set. */
export async function setSessionNote(sessionId: string, clinicId: string, patch: { clinicalNote?: string | null; operationalNote?: string | null }, actorUserId?: string | null) {
  const session = await prisma.treatmentPlanSession.findFirst({ where: { id: sessionId, plan: { clinic_id: clinicId } } });
  if (!session) throw new TreatmentPlanError("Session not found in this clinic.");
  await prisma.treatmentPlanSession.update({
    where: { id: session.id },
    data: {
      ...(patch.clinicalNote !== undefined ? { clinical_note: patch.clinicalNote?.trim() || null } : {}),
      ...(patch.operationalNote !== undefined ? { operational_note: patch.operationalNote?.trim() || null } : {}),
    },
  });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_session_note", detail: `session ${session.sequence}` });
  return getPlan(session.plan_id, clinicId);
}

/** Reception cancels a planned session (frees it; the plan can be re-booked/extended). */
export async function cancelSession(sessionId: string, clinicId: string, actorUserId?: string | null) {
  const session = await prisma.treatmentPlanSession.findFirst({ where: { id: sessionId, plan: { clinic_id: clinicId } }, include: { plan: true } });
  if (!session) throw new TreatmentPlanError("Session not found in this clinic.");
  if (!isSessionActionable(session.status as "planned")) throw new TreatmentPlanError("Only a planned session can be cancelled.");
  await prisma.treatmentPlanSession.update({ where: { id: session.id }, data: { status: "cancelled" } });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_session_cancelled", detail: `session ${session.sequence}` });
  return getPlan(session.plan_id, clinicId);
}

// ---- reads --------------------------------------------------------------

interface SessionRow { id: string; sequence: number; status: string; appointment_id: string | null; clinical_note: string | null; operational_note: string | null }
function planView(plan: { id: string; title: string; status: string; sessions_planned: number; service_id: string; doctor_id: string; patient_id: string; notes: string | null; created_at: Date; sessions: SessionRow[] }) {
  // Progress is ATTENDANCE-based (Amendment 6): completed / planned, never booked.
  const completed = plan.sessions.filter((s) => s.status === "completed").length;
  const booked = plan.sessions.filter((s) => s.status === "planned" && s.appointment_id).length;
  const needsRebook = plan.sessions.filter((s) => s.status === "needs_rebook").length;
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    sessions_planned: plan.sessions_planned,
    sessions_completed: completed,
    sessions_booked: booked,
    sessions_needs_rebook: needsRebook,
    service_id: plan.service_id,
    doctor_id: plan.doctor_id,
    patient_id: plan.patient_id,
    notes: plan.notes,
    created_at: plan.created_at.toISOString(),
    sessions: plan.sessions
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({
        id: s.id, sequence: s.sequence,
        status: s.appointment_id && s.status === "planned" ? "booked" : s.status, // "booked" is derived
        appointment_id: s.appointment_id,
        clinical_note: s.clinical_note, operational_note: s.operational_note,
      })),
  };
}

// C1.1: enrich views with the next upcoming booked session's time (for the
// checkout "Next: …" summary). One batched appointment query.
async function withNextSession<T extends { sessions: { status: string; appointment_id: string | null }[] }>(views: T[]): Promise<(T & { next_session_at: string | null })[]> {
  const apptIds = views.flatMap((v) => v.sessions.filter((s) => s.status === "planned" && s.appointment_id).map((s) => s.appointment_id!));
  const appts = apptIds.length ? await prisma.appointment.findMany({ where: { id: { in: apptIds } }, select: { id: true, scheduled_time: true } }) : [];
  const timeById = new Map(appts.map((a) => [a.id, a.scheduled_time]));
  return views.map((v) => {
    const times = v.sessions
      .filter((s) => s.status === "planned" && s.appointment_id)
      .map((s) => timeById.get(s.appointment_id!))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());
    return { ...v, next_session_at: times[0]?.toISOString() ?? null };
  });
}

export async function getPlan(planId: string, clinicId: string) {
  const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, clinic_id: clinicId }, include: { sessions: true } });
  if (!plan) throw new TreatmentPlanError("Treatment plan not found in this clinic.");
  return (await withNextSession([planView(plan)]))[0];
}

export async function getPatientPlans(patientId: string, clinicId: string) {
  const plans = await prisma.treatmentPlan.findMany({ where: { patient_id: patientId, clinic_id: clinicId }, include: { sessions: true }, orderBy: { created_at: "desc" } });
  return withNextSession(plans.map(planView));
}

/** Active plans for a patient — for the checkout panel (by the invoice's patient). */
export async function getActivePlansForPatient(patientId: string, clinicId: string) {
  const plans = await prisma.treatmentPlan.findMany({ where: { patient_id: patientId, clinic_id: clinicId, status: "active" }, include: { sessions: true }, orderBy: { created_at: "desc" } });
  return withNextSession(plans.map(planView));
}

/** Patient-app read — the patient's own plans (all clinics). */
export async function getPlansForPatientApp(patientId: string) {
  const plans = await prisma.treatmentPlan.findMany({ where: { patient_id: patientId, status: { in: ["active", "completed"] } }, include: { sessions: true }, orderBy: { created_at: "desc" } });
  return withNextSession(plans.map(planView));
}

/**
 * C2 — the reception "Treatment Follow-ups" command centre. For active plans in
 * the clinic: counters (Due Today · Overdue · Booked · Needs Re-book) + a
 * worklist of patients who need attention (missed a session, overdue, or
 * mid-course with nothing booked next). Attendance-based throughout.
 */
export async function getTreatmentFollowups(clinicId: string) {
  const plans = await prisma.treatmentPlan.findMany({
    where: { clinic_id: clinicId, status: "active" },
    include: { sessions: true, clinic: { select: { id: true } } },
  });
  const patientIds = plans.map((p) => p.patient_id);
  const patients = await prisma.patientProfile.findMany({ where: { id: { in: patientIds } }, select: { id: true, full_name: true } });
  const nameById = new Map(patients.map((p) => [p.id, p.full_name]));
  const apptIds = plans.flatMap((p) => p.sessions.filter((s) => s.status === "planned" && s.appointment_id).map((s) => s.appointment_id!));
  const appts = apptIds.length ? await prisma.appointment.findMany({ where: { id: { in: apptIds } }, select: { id: true, scheduled_time: true } }) : [];
  const timeById = new Map(appts.map((a) => [a.id, a.scheduled_time]));

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);

  let dueToday = 0, overdue = 0, booked = 0, needsRebook = 0, completed = 0;
  const items: { plan_id: string; patient_name: string; title: string; reason: string; sessions_completed: number; sessions_planned: number }[] = [];

  for (const p of plans) {
    const view = planView(p);
    completed += view.sessions_completed;
    let planNeedsAttention = "";
    const rebook = p.sessions.filter((s) => s.status === "needs_rebook").length;
    if (rebook > 0) { needsRebook += rebook; planNeedsAttention = "Needs re-book"; }

    for (const s of p.sessions.filter((x) => x.status === "planned" && x.appointment_id)) {
      const t = timeById.get(s.appointment_id!);
      if (!t) continue;
      if (t >= startOfToday && t < endOfToday) { dueToday += 1; if (!planNeedsAttention) planNeedsAttention = "Session due today"; }
      else if (t < startOfToday) { overdue += 1; planNeedsAttention = "Overdue session"; }
      else booked += 1;
    }
    // Mid-course but nothing booked next (and sessions remain)
    const hasUnbooked = p.sessions.some((s) => (s.status === "planned" || s.status === "needs_rebook") && !s.appointment_id);
    const hasFuture = p.sessions.some((s) => s.status === "planned" && s.appointment_id && (timeById.get(s.appointment_id!) ?? new Date(0)) >= startOfToday);
    if (!planNeedsAttention && hasUnbooked && !hasFuture && view.sessions_completed > 0) planNeedsAttention = "Book next session";

    if (planNeedsAttention) {
      items.push({ plan_id: p.id, patient_name: nameById.get(p.patient_id) ?? "Patient", title: p.title, reason: planNeedsAttention, sessions_completed: view.sessions_completed, sessions_planned: view.sessions_planned });
    }
  }

  return {
    counters: { due_today: dueToday, overdue, booked, completed, needs_rebook: needsRebook },
    items: items.sort((a, b) => a.patient_name.localeCompare(b.patient_name)),
  };
}

/** Generate a printable Treatment Plan document (immutable snapshot, B3 platform). */
export async function generatePlanDocument(planId: string, clinicId: string, actorUserId?: string | null): Promise<{ id: string } | null> {
  const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, clinic_id: clinicId }, include: { sessions: true } });
  if (!plan) throw new TreatmentPlanError("Treatment plan not found in this clinic.");
  const view = planView(plan);
  const [clinic, patient, service, doctor] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, address: true, phone: true, logo_url: true } }),
    prisma.patientProfile.findUnique({ where: { id: plan.patient_id }, select: { full_name: true } }),
    prisma.service.findUnique({ where: { id: plan.service_id }, select: { name: true, price: true } }),
    prisma.staffProfile.findUnique({ where: { id: plan.doctor_id }, select: { full_name: true } }),
  ]);
  const year = new Date().getFullYear();
  const prefix = `${TYPE_NUMBER_PREFIX.treatment_plan}-${year}-`;
  const count = await prisma.document.count({ where: { clinic_id: clinicId, type: "treatment_plan", number: { startsWith: prefix } } });
  const number = `${prefix}${String(count + 1).padStart(4, "0")}`;

  const content = {
    branding: { clinic_name: clinic?.name ?? "Clinic", address: clinic?.address ?? null, phone: clinic?.phone ?? null, logo_url: clinic?.logo_url ?? null },
    meta: { patient_name: patient?.full_name ?? "Patient", token: null, doctor_name: doctor?.full_name ?? null, appointment_type: "Treatment Plan", date: plan.created_at.toISOString() },
    body: {
      title: plan.title,
      service: service?.name ?? "",
      service_price: service?.price ?? 0,
      sessions_planned: view.sessions_planned,
      sessions_completed: view.sessions_completed,
      notes: plan.notes,
      sessions: view.sessions.map((s) => ({ sequence: s.sequence, status: s.status })),
    },
  };
  const doc = await prisma.document.create({
    data: {
      clinic_id: clinicId, patient_id: plan.patient_id, appointment_id: plan.origin_appointment_id,
      type: "treatment_plan", category: TYPE_CATEGORY.treatment_plan, number, version: 1, status: "issued",
      content_json: JSON.stringify(content), generated_by_user_id: actorUserId ?? null,
    },
    select: { id: true },
  });
  return doc;
}
