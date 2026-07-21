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

/** Reception books the next unbooked planned session as an appointment. */
export async function bookNextSession(planId: string, clinicId: string, input: { scheduledTime: string; doctorId?: string | null }, actorUserId?: string | null) {
  const plan = await requirePlan(planId, clinicId);
  if (!planAcceptsSessions(plan.status as PlanStatus)) throw new TreatmentPlanError("Only an active plan's sessions can be booked.");
  const next = await prisma.treatmentPlanSession.findFirst({
    where: { plan_id: plan.id, status: "planned", appointment_id: null },
    orderBy: { sequence: "asc" },
  });
  if (!next) throw new TreatmentPlanError("No unbooked sessions remain — extend the plan first.");

  const appt = await scheduleAppointment({
    patientId: plan.patient_id,
    doctorId: input.doctorId ?? plan.doctor_id,
    clinicId,
    scheduledTime: input.scheduledTime,
  });
  await prisma.treatmentPlanSession.update({ where: { id: next.id }, data: { appointment_id: appt.id } });
  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "treatment_session_booked", detail: `${plan.title} · session ${next.sequence}` });
  return getPlan(planId, clinicId);
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

function planView(plan: { id: string; title: string; status: string; sessions_planned: number; service_id: string; doctor_id: string; notes: string | null; created_at: Date; sessions: { id: string; sequence: number; status: string; appointment_id: string | null }[] }) {
  const completed = plan.sessions.filter((s) => s.status === "completed").length;
  const booked = plan.sessions.filter((s) => s.status === "planned" && s.appointment_id).length;
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    sessions_planned: plan.sessions_planned,
    sessions_completed: completed,
    sessions_booked: booked,
    service_id: plan.service_id,
    doctor_id: plan.doctor_id,
    notes: plan.notes,
    created_at: plan.created_at.toISOString(),
    sessions: plan.sessions
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({ id: s.id, sequence: s.sequence, status: s.status, appointment_id: s.appointment_id })),
  };
}

export async function getPlan(planId: string, clinicId: string) {
  const plan = await prisma.treatmentPlan.findFirst({ where: { id: planId, clinic_id: clinicId }, include: { sessions: true } });
  if (!plan) throw new TreatmentPlanError("Treatment plan not found in this clinic.");
  return planView(plan);
}

export async function getPatientPlans(patientId: string, clinicId: string) {
  const plans = await prisma.treatmentPlan.findMany({ where: { patient_id: patientId, clinic_id: clinicId }, include: { sessions: true }, orderBy: { created_at: "desc" } });
  return plans.map(planView);
}

/** Active plans for a patient — for the checkout panel (by the invoice's patient). */
export async function getActivePlansForPatient(patientId: string, clinicId: string) {
  const plans = await prisma.treatmentPlan.findMany({ where: { patient_id: patientId, clinic_id: clinicId, status: "active" }, include: { sessions: true }, orderBy: { created_at: "desc" } });
  return plans.map(planView);
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
