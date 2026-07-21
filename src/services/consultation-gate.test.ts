// M3B B4 — Billing Policy Framework: the prepaid/hybrid consultation gate.
// Integration against the real dev DB. Proves policy matrix, hard-block
// enforcement at consult start, settings, and collect-up-front → satisfied.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { transitionStatus } from "@/services/appointment-service";
import { prepareConsultationInvoice, recordCheckoutPayment } from "@/services/checkout-service";
import {
  PrepaidGateError,
  evaluateConsultationGate,
  getPolicySettings,
  setBillingPolicy,
  setPrepaidHardGate,
} from "@/services/billing-policy-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function scenario() {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { profile: patient } = await createTestPatient(clinic.id);
  const appt = await prisma.appointment.create({
    data: { patient_id: patient.id, doctor_id: doctor.id, clinic_id: clinic.id, scheduled_time: new Date(), status: "scheduled" },
  });
  return { clinic, appt, doctorUserId: doctorUser.id };
}

describe("evaluateConsultationGate", () => {
  it("postpaid → inert (not required, satisfied)", async () => {
    const s = await scenario();
    const g = await evaluateConsultationGate(s.appt.id, s.clinic.id);
    expect(g.policy).toBe("postpaid");
    expect(g.required).toBe(false);
    expect(g.satisfied).toBe(true);
    expect(g.hardBlock).toBe(false);
  });

  it("prepaid + unpaid → required, unsatisfied, soft (no hard block)", async () => {
    const s = await scenario();
    await setBillingPolicy(s.clinic.id, "prepaid", s.doctorUserId);
    const g = await evaluateConsultationGate(s.appt.id, s.clinic.id);
    expect(g.required).toBe(true);
    expect(g.satisfied).toBe(false);
    expect(g.hardBlock).toBe(false);
    expect(g.consultationFee).toBeGreaterThan(0);
  });

  it("hybrid also requires prepayment", async () => {
    const s = await scenario();
    await setBillingPolicy(s.clinic.id, "hybrid", s.doctorUserId);
    const g = await evaluateConsultationGate(s.appt.id, s.clinic.id);
    expect(g.required).toBe(true);
  });
});

describe("hard-gate enforcement at consult start", () => {
  it("blocks in_consultation when prepaid + hard gate + unpaid; allows after payment", async () => {
    const s = await scenario();
    await setBillingPolicy(s.clinic.id, "prepaid", s.doctorUserId);
    await setPrepaidHardGate(s.clinic.id, true, s.doctorUserId);

    const g = await evaluateConsultationGate(s.appt.id, s.clinic.id);
    expect(g.hardBlock).toBe(true);
    await expect(transitionStatus(s.appt.id, "in_consultation", { actorUserId: s.doctorUserId })).rejects.toBeInstanceOf(PrepaidGateError);

    // Collect up front, then start succeeds.
    const invoiceId = await prepareConsultationInvoice(s.appt.id, s.clinic.id, s.doctorUserId);
    expect(invoiceId).toBeTruthy();
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId! } });
    await recordCheckoutPayment({ invoiceId: invoiceId!, clinicId: s.clinic.id, amount: inv.total, method: "cash", actorUserId: s.doctorUserId });

    const after = await evaluateConsultationGate(s.appt.id, s.clinic.id);
    expect(after.satisfied).toBe(true);
    expect(after.hardBlock).toBe(false);
    const started = await transitionStatus(s.appt.id, "in_consultation", { actorUserId: s.doctorUserId });
    expect(started.status).toBe("in_consultation");
  });

  it("soft gate never blocks the transition", async () => {
    const s = await scenario();
    await setBillingPolicy(s.clinic.id, "prepaid", s.doctorUserId); // hard gate off (default)
    const started = await transitionStatus(s.appt.id, "in_consultation", { actorUserId: s.doctorUserId });
    expect(started.status).toBe("in_consultation");
  });

  it("postpaid never blocks", async () => {
    const s = await scenario();
    const started = await transitionStatus(s.appt.id, "in_consultation", { actorUserId: s.doctorUserId });
    expect(started.status).toBe("in_consultation");
  });
});

describe("policy settings", () => {
  it("get/set policy + hard gate (audited)", async () => {
    const s = await scenario();
    expect((await getPolicySettings(s.clinic.id)).policy).toBe("postpaid");
    await setBillingPolicy(s.clinic.id, "hybrid", s.doctorUserId);
    await setPrepaidHardGate(s.clinic.id, true, s.doctorUserId);
    const settings = await getPolicySettings(s.clinic.id);
    expect(settings.policy).toBe("hybrid");
    expect(settings.hardGate).toBe(true);
    const audits = await prisma.auditLog.findMany({ where: { organization_id: s.clinic.organization_id, action: "prepaid_hard_gate_changed" } });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });
});
