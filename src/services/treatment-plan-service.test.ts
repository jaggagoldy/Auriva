// C1 — Treatment Planning. Integration. Proves plan creation, the lifecycle,
// session booking, extension, explicit completion, and — critically — FINANCIAL
// INTEGRITY: a plan session charges only when attended (attended = charged),
// with no separate consultation fee.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { transitionStatus } from "@/services/appointment-service";
import {
  TreatmentPlanError,
  activatePlan,
  bookNextSession,
  completePlan,
  createPlan,
  extendPlan,
  getPlan,
} from "@/services/treatment-plan-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function scenario(sessions = 8) {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { profile: patient } = await createTestPatient(clinic.id);
  const service = await prisma.service.create({ data: { clinic_id: clinic.id, name: "Physio session", duration_minutes: 30, price: 800, category: "Therapy", kind: "clinical" } });
  const plan = await createPlan({
    clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id,
    title: "ACL Rehab", serviceId: service.id, sessionsPlanned: sessions, actorUserId: doctorUser.id,
  });
  return { clinic, doctor, doctorUser, patient, service, planId: plan.id };
}

function inHours(h: number) {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

describe("createPlan", () => {
  it("creates a draft plan with N planned sessions", async () => {
    const s = await scenario(8);
    const plan = await getPlan(s.planId, s.clinic.id);
    expect(plan.status).toBe("draft");
    expect(plan.sessions_planned).toBe(8);
    expect(plan.sessions).toHaveLength(8);
    expect(plan.sessions.every((x) => x.status === "planned")).toBe(true);
    expect(plan.sessions_completed).toBe(0);
  });

  it("rejects zero sessions and an unknown service", async () => {
    const { clinic } = await createTestOrganization();
    clinicIds.push(clinic.id);
    const { staffProfile: doctor } = await createTestStaff(clinic.id, "doctor");
    const { profile: patient } = await createTestPatient(clinic.id);
    const svc = await prisma.service.create({ data: { clinic_id: clinic.id, name: "X", duration_minutes: 30, price: 500, category: "Therapy", kind: "clinical" } });
    await expect(createPlan({ clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id, title: "T", serviceId: svc.id, sessionsPlanned: 0 })).rejects.toBeInstanceOf(TreatmentPlanError);
    await expect(createPlan({ clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id, title: "T", serviceId: "nope", sessionsPlanned: 3 })).rejects.toBeInstanceOf(TreatmentPlanError);
  });
});

describe("lifecycle", () => {
  it("only books sessions once active; extends; completes explicitly", async () => {
    const s = await scenario(4);
    // can't book a draft plan
    await expect(bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) })).rejects.toBeInstanceOf(TreatmentPlanError);
    await activatePlan(s.planId, s.clinic.id, s.doctorUser.id);
    let plan = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) });
    expect(plan.sessions_booked).toBe(1);

    plan = await extendPlan(s.planId, s.clinic.id, 4, s.doctorUser.id); // 4 → 8
    expect(plan.sessions_planned).toBe(8);
    expect(plan.sessions).toHaveLength(8);

    plan = await completePlan(s.planId, s.clinic.id, s.doctorUser.id); // explicit close
    expect(plan.status).toBe("completed");
  });
});

describe("FINANCIAL INTEGRITY — attended = charged (Amendment 9)", () => {
  it("an 8-session plan with 3 attended produces exactly 3 charges, not 8", async () => {
    const s = await scenario(8);
    await activatePlan(s.planId, s.clinic.id, s.doctorUser.id);

    // Book and attend 3 sessions.
    for (let i = 0; i < 3; i++) {
      await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24 + i) });
    }
    const plan = await getPlan(s.planId, s.clinic.id);
    const bookedApptIds = plan.sessions.filter((x) => x.appointment_id).map((x) => x.appointment_id!);
    expect(bookedApptIds).toHaveLength(3);

    for (const apptId of bookedApptIds) {
      await transitionStatus(apptId, "in_consultation", { actorUserId: s.doctorUser.id });
      await transitionStatus(apptId, "completed", { actorUserId: s.doctorUser.id });
    }

    // Exactly 3 charges — one per attended session — priced at the plan service.
    const charges = await prisma.serviceEvent.findMany({ where: { patient_id: s.patient.id, service_id: s.service.id, status: "finalized" } });
    expect(charges).toHaveLength(3);
    expect(charges.every((c) => c.amount === 800)).toBe(true);

    // NO consultation fee was added to a plan session.
    const consults = await prisma.serviceEvent.findMany({ where: { patient_id: s.patient.id, category: "Consultation" } });
    expect(consults).toHaveLength(0);

    // 3 sessions completed, 5 still planned — no phantom charges.
    const after = await getPlan(s.planId, s.clinic.id);
    expect(after.sessions_completed).toBe(3);
    expect(after.sessions.filter((x) => x.status === "planned")).toHaveLength(5);

    // Each attended session settled into an invoice with the plan-service line.
    const invoices = await prisma.invoice.findMany({ where: { appointment_id: { in: bookedApptIds } }, include: { lines: true } });
    expect(invoices).toHaveLength(3);
    expect(invoices.every((inv) => inv.lines.length === 1 && inv.lines[0].amount === 800)).toBe(true);
  });
});
