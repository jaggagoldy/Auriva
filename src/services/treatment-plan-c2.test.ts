// C2 — Procedure Management. Integration. Attendance handling (no-show/cancel →
// needs_rebook), concurrency-safe booking (no double-book), the Treatment
// Follow-ups aggregation, session notes ownership, and reschedule.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { transitionStatus } from "@/services/appointment-service";
import {
  TreatmentPlanError,
  activatePlan,
  bookNextSession,
  createPlan,
  getPlan,
  getTreatmentFollowups,
  rescheduleSession,
  setSessionNote,
} from "@/services/treatment-plan-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function activePlan(sessions = 4) {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { profile: patient } = await createTestPatient(clinic.id);
  const service = await prisma.service.create({ data: { clinic_id: clinic.id, name: "Physio", duration_minutes: 30, price: 800, category: "Therapy", kind: "clinical" } });
  const plan = await createPlan({ clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id, title: "ACL Rehab", serviceId: service.id, sessionsPlanned: sessions, actorUserId: doctorUser.id });
  await activatePlan(plan.id, clinic.id, doctorUser.id);
  return { clinic, patient, doctorUser, planId: plan.id };
}
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

describe("attendance → needs_rebook", () => {
  it("a no-show returns the session to needs_rebook (attendance stays truthful)", async () => {
    const s = await activePlan(4);
    let plan = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) });
    const booked = plan.sessions.find((x) => x.status === "booked")!;
    expect(booked).toBeDefined();
    await transitionStatus(booked.appointment_id!, "no_show", { actorUserId: s.doctorUser.id });

    plan = await getPlan(s.planId, s.clinic.id);
    const sess = plan.sessions.find((x) => x.sequence === booked.sequence)!;
    expect(sess.status).toBe("needs_rebook");
    expect(sess.appointment_id).toBeNull();
    expect(plan.sessions_completed).toBe(0); // not attended → not counted
    expect(plan.sessions_needs_rebook).toBe(1);
  });

  it("a needs_rebook session can be re-booked", async () => {
    const s = await activePlan(2);
    let plan = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) });
    const booked = plan.sessions.find((x) => x.status === "booked")!;
    await transitionStatus(booked.appointment_id!, "cancelled", { actorUserId: s.doctorUser.id });
    plan = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(48) }); // re-books the missed one first
    expect(plan.sessions.filter((x) => x.status === "booked")).toHaveLength(1);
    expect(plan.sessions_needs_rebook).toBe(0);
  });
});

describe("concurrency — no double-booking (Amendment 9)", () => {
  it("two simultaneous book-next on a one-session plan → exactly one succeeds, no orphan appointment", async () => {
    const s = await activePlan(1);
    const results = await Promise.allSettled([
      bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) }),
      bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(25) }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1); // one wins, one is rejected
    const plan = await getPlan(s.planId, s.clinic.id);
    expect(plan.sessions.filter((x) => x.status === "booked")).toHaveLength(1);
    const appts = await prisma.appointment.findMany({ where: { patient_id: s.patient.id } });
    expect(appts).toHaveLength(1); // the loser's appointment was cleaned up — no orphan
  });
});

describe("Treatment Follow-ups aggregation", () => {
  it("counts due-today and needs-rebook, and lists who needs attention", async () => {
    const s = await activePlan(4);
    const p1 = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(48) });
    const firstBooked = p1.sessions.filter((x) => x.status === "booked")[0];
    // Pin it to noon today (deterministic — avoids wall-clock/midnight flakiness).
    const noonToday = new Date(); noonToday.setHours(12, 0, 0, 0);
    await prisma.appointment.update({ where: { id: firstBooked.appointment_id! }, data: { scheduled_time: noonToday } });

    const p2 = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(72) });
    const secondBooked = p2.sessions.filter((x) => x.status === "booked").find((x) => x.sequence !== firstBooked.sequence)!;
    await transitionStatus(secondBooked.appointment_id!, "no_show", { actorUserId: s.doctorUser.id }); // → needs_rebook

    const f = await getTreatmentFollowups(s.clinic.id);
    expect(f.counters.due_today).toBe(1);
    expect(f.counters.needs_rebook).toBe(1);
    expect(f.items.some((i) => i.reason === "Needs re-book")).toBe(true);
  });
});

describe("session notes ownership + reschedule", () => {
  it("stores clinical and operational notes separately", async () => {
    const s = await activePlan(2);
    const plan = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) });
    const sess = plan.sessions.find((x) => x.status === "booked")!;
    await setSessionNote(sess.id, s.clinic.id, { clinicalNote: "Tolerated exercise well." }, s.doctorUser.id);
    await setSessionNote(sess.id, s.clinic.id, { operationalNote: "Requested evening slots." }, s.doctorUser.id);
    const after = await getPlan(s.planId, s.clinic.id);
    const row = after.sessions.find((x) => x.id === sess.id)!;
    expect(row.clinical_note).toBe("Tolerated exercise well.");
    expect(row.operational_note).toBe("Requested evening slots.");
  });

  it("reschedules a booked session's appointment", async () => {
    const s = await activePlan(2);
    const plan = await bookNextSession(s.planId, s.clinic.id, { scheduledTime: inHours(24) });
    const sess = plan.sessions.find((x) => x.status === "booked")!;
    const newTime = inHours(72);
    await rescheduleSession(sess.id, s.clinic.id, newTime, s.doctorUser.id);
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: sess.appointment_id! } });
    expect(appt.scheduled_time.toISOString()).toBe(new Date(newTime).toISOString());
  });
});
