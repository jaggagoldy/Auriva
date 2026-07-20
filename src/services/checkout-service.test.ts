// M3B B2 — Checkout service. Integration against the real dev DB. Proves the
// grouped view + money summary + visit status, reception financial charge add
// (permission-by-kind), Concession (recompute + reconcile + guards), Principle-6
// clinical read-only, reception notes, and split/partial payment.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { addVisitClinicalService, openVisitCapture } from "@/services/service-capture-service";
import { transitionStatus } from "@/services/appointment-service";
import {
  CheckoutError,
  CheckoutPermissionError,
  addFinancialCharge,
  applyConcession,
  getCheckout,
  recordCheckoutPayment,
  removeCheckoutCharge,
  removeConcession,
  setCheckoutNotes,
} from "@/services/checkout-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function scenario() {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { user: receptionUser } = await createTestStaff(clinic.id, "receptionist");
  const { profile: patient } = await createTestPatient(clinic.id);
  const appointment = await prisma.appointment.create({
    data: { patient_id: patient.id, doctor_id: doctor.id, clinic_id: clinic.id, scheduled_time: new Date(), status: "in_consultation" },
  });
  await openVisitCapture(appointment.id, clinic.id, doctorUser.id);
  const ecg = await prisma.service.create({
    data: { clinic_id: clinic.id, name: "ECG", duration_minutes: 10, price: 300, category: "Procedure", kind: "clinical" },
  });
  await addVisitClinicalService(appointment.id, clinic.id, doctorUser.id, { serviceId: ecg.id });
  // Real completion path: sets appointment → completed AND settles the invoice.
  await transitionStatus(appointment.id, "completed", { actorUserId: doctorUser.id });
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { appointment_id: appointment.id },
    orderBy: { created_at: "asc" },
  });
  return { clinic, appointment, patient, invoiceId: invoice.id, receptionUserId: receptionUser.id };
}

async function reconciles(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } });
  const lineSum = inv.lines.reduce((n, l) => n + l.amount, 0);
  const snapSum = (JSON.parse(inv.items_json) as { amount: number }[]).reduce((n, i) => n + i.amount, 0);
  return inv.total === lineSum && lineSum === snapSum;
}

describe("getCheckout — view model", () => {
  it("groups clinical charges, derives the money summary + visit status", async () => {
    const s = await scenario();
    const v = await getCheckout(s.invoiceId, s.clinic.id);
    expect(v.groups.clinical.length).toBe(2); // Consultation + ECG
    expect(v.groups.clinical.every((l) => l.removable === false)).toBe(true); // Principle 6
    expect(v.groups.administrative).toHaveLength(0);
    expect(v.money.estimated).toBe(v.money.net); // no concession yet
    expect(v.money.collected).toBe(0);
    expect(v.money.outstanding).toBe(v.money.net);
    expect(v.visit.status).toBe("Ready for Checkout");
  });
});

describe("addFinancialCharge (reception)", () => {
  it("adds an ad-hoc administrative charge and reconciles", async () => {
    const s = await scenario();
    const v = await addFinancialCharge(s.invoiceId, s.clinic.id, s.receptionUserId, {
      name: "Registration", category: "Administrative", unitPrice: 100,
    });
    const reg = v.groups.administrative.find((l) => l.description === "Registration");
    expect(reg).toBeDefined();
    expect(reg!.removable).toBe(true);
    expect(v.money.estimated).toBe(v.money.net);
    expect(await reconciles(s.invoiceId)).toBe(true);
  });

  it("rejects a clinical catalog service (permission-by-kind)", async () => {
    const s = await scenario();
    const clinical = await prisma.service.create({
      data: { clinic_id: s.clinic.id, name: "Suture", duration_minutes: 10, price: 500, category: "Procedure", kind: "clinical" },
    });
    await expect(
      addFinancialCharge(s.invoiceId, s.clinic.id, s.receptionUserId, { serviceId: clinical.id })
    ).rejects.toBeInstanceOf(CheckoutPermissionError);
  });
});

describe("Concession", () => {
  it("applies, recomputes net, reconciles; removable", async () => {
    const s = await scenario();
    const before = await getCheckout(s.invoiceId, s.clinic.id);
    const v = await applyConcession(s.invoiceId, s.clinic.id, s.receptionUserId, 100, "Doctor approved");
    expect(v.money.concession).toBe(100);
    expect(v.money.net).toBe(before.money.estimated - 100);
    expect(v.money.outstanding).toBe(before.money.estimated - 100);
    expect(await reconciles(s.invoiceId)).toBe(true);

    const after = await removeConcession(s.invoiceId, s.clinic.id, s.receptionUserId);
    expect(after.money.concession).toBe(0);
    expect(after.money.net).toBe(before.money.estimated);
  });

  it("cannot exceed charges, and requires a reason", async () => {
    const s = await scenario();
    const v = await getCheckout(s.invoiceId, s.clinic.id);
    await expect(applyConcession(s.invoiceId, s.clinic.id, s.receptionUserId, v.money.estimated + 1, "x")).rejects.toBeInstanceOf(CheckoutError);
    await expect(applyConcession(s.invoiceId, s.clinic.id, s.receptionUserId, 50, "   ")).rejects.toBeInstanceOf(CheckoutError);
  });

  it("is a single line (re-applying updates, not stacks)", async () => {
    const s = await scenario();
    await applyConcession(s.invoiceId, s.clinic.id, s.receptionUserId, 50, "first");
    const v = await applyConcession(s.invoiceId, s.clinic.id, s.receptionUserId, 120, "second");
    expect(v.money.concession).toBe(120);
    const count = await prisma.invoiceLine.count({ where: { invoice_id: s.invoiceId, origin: "ManualAdjustment" } });
    expect(count).toBe(1);
  });
});

describe("Principle 6 — clinical read-only", () => {
  it("refuses to remove a clinical line", async () => {
    const s = await scenario();
    const v = await getCheckout(s.invoiceId, s.clinic.id);
    const clinicalLine = v.groups.clinical[0];
    await expect(removeCheckoutCharge(clinicalLine.id, s.clinic.id, s.receptionUserId)).rejects.toBeInstanceOf(CheckoutPermissionError);
  });

  it("allows removing a reception-added financial charge", async () => {
    const s = await scenario();
    let v = await addFinancialCharge(s.invoiceId, s.clinic.id, s.receptionUserId, { name: "File", category: "Administrative", unitPrice: 50 });
    const file = v.groups.administrative.find((l) => l.description === "File")!;
    v = await removeCheckoutCharge(file.id, s.clinic.id, s.receptionUserId);
    expect(v.groups.administrative.find((l) => l.description === "File")).toBeUndefined();
    expect(await reconciles(s.invoiceId)).toBe(true);
  });
});

describe("reception notes + payment", () => {
  it("stores operational notes", async () => {
    const s = await scenario();
    const v = await setCheckoutNotes(s.invoiceId, s.clinic.id, "Paid by spouse; receipt later.", s.receptionUserId);
    expect(v.notes).toBe("Paid by spouse; receipt later.");
  });

  it("handles split/partial → status transitions", async () => {
    const s = await scenario();
    const start = await getCheckout(s.invoiceId, s.clinic.id);
    const half = Math.floor(start.money.net / 2);
    let v = await recordCheckoutPayment({ invoiceId: s.invoiceId, clinicId: s.clinic.id, amount: half, method: "cash", actorUserId: s.receptionUserId });
    expect(v.visit.status).toBe("Partially Paid");
    expect(v.money.collected).toBe(half);
    expect(v.money.outstanding).toBe(start.money.net - half);
    v = await recordCheckoutPayment({ invoiceId: s.invoiceId, clinicId: s.clinic.id, amount: start.money.net - half, method: "upi", actorUserId: s.receptionUserId });
    expect(v.visit.status).toBe("Completed");
    expect(v.money.outstanding).toBe(0);
    expect(v.payments).toHaveLength(2); // split
  });
});
