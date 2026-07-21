// M3B B5 — Financial Corrections. Integration. Proves compensating artifacts
// (credit note + refund), invoice immutability, amount guards, correction
// history, and Document generation — without ever editing the paid invoice.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { addVisitClinicalService, openVisitCapture } from "@/services/service-capture-service";
import { transitionStatus } from "@/services/appointment-service";
import { recordCheckoutPayment } from "@/services/checkout-service";
import { CorrectionError, getInvoiceCorrections, issueCreditNote, issueRefund } from "@/services/corrections-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function paidVisit() {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { profile: patient } = await createTestPatient(clinic.id);
  const appt = await prisma.appointment.create({
    data: { patient_id: patient.id, doctor_id: doctor.id, clinic_id: clinic.id, scheduled_time: new Date(), status: "in_consultation" },
  });
  await openVisitCapture(appt.id, clinic.id, doctorUser.id);
  const svc = await prisma.service.create({ data: { clinic_id: clinic.id, name: "ECG", duration_minutes: 10, price: 300, category: "Procedure", kind: "clinical" } });
  await addVisitClinicalService(appt.id, clinic.id, doctorUser.id, { serviceId: svc.id });
  await transitionStatus(appt.id, "completed", { actorUserId: doctorUser.id });
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { appointment_id: appt.id }, orderBy: { created_at: "asc" } });
  await recordCheckoutPayment({ invoiceId: invoice.id, clinicId: clinic.id, amount: invoice.total, method: "cash", actorUserId: doctorUser.id });
  return { clinic, invoice, actorUserId: doctorUser.id };
}

describe("issueCreditNote", () => {
  it("creates a credit note + document; the paid invoice is untouched", async () => {
    const s = await paidVisit();
    const cn = await issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, 100, "Overcharged ECG");
    expect(cn.number).toMatch(/^CN-\d{4}-0001$/);
    expect(cn.amount).toBe(100);

    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: s.invoice.id } });
    expect(inv.status).toBe("paid"); // immutable
    expect(inv.total).toBe(s.invoice.total);

    const doc = await prisma.document.findFirst({ where: { invoice_id: s.invoice.id, type: "credit_note" } });
    expect(doc?.number).toBe(cn.number);
    expect(doc?.category).toBe("Financial");
  });

  it("rejects credit > invoice total, blank reason, and unpaid invoices", async () => {
    const s = await paidVisit();
    await expect(issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, s.invoice.total + 1, "x")).rejects.toBeInstanceOf(CorrectionError);
    await expect(issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, 50, "  ")).rejects.toBeInstanceOf(CorrectionError);

    // an unpaid invoice cannot be credited
    const { clinic } = await createTestOrganization();
    clinicIds.push(clinic.id);
    const { profile } = await createTestPatient(clinic.id);
    const unpaid = await prisma.invoice.create({ data: { invoice_number: "INV-U", clinic_id: clinic.id, patient_id: profile.id, status: "draft", items_json: "[]", total: 500 } });
    await expect(issueCreditNote(unpaid.id, clinic.id, null, 100, "no")).rejects.toBeInstanceOf(CorrectionError);
  });
});

describe("issueRefund", () => {
  it("refunds against a credit note; full refund flips it to refunded", async () => {
    const s = await paidVisit();
    const cn = await issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, 200, "Service not done");
    await expect(issueRefund(cn.id, s.clinic.id, s.actorUserId, 300, "cash")).rejects.toBeInstanceOf(CorrectionError); // > amount

    const r1 = await issueRefund(cn.id, s.clinic.id, s.actorUserId, 120, "upi", "TXN1");
    expect(r1.amount).toBe(120);
    let hist = await getInvoiceCorrections(s.invoice.id, s.clinic.id);
    expect(hist[0].refunded).toBe(120);
    expect(hist[0].status).toBe("issued"); // partial

    await issueRefund(cn.id, s.clinic.id, s.actorUserId, 80, "cash");
    hist = await getInvoiceCorrections(s.invoice.id, s.clinic.id);
    expect(hist[0].refunded).toBe(200);
    expect(hist[0].status).toBe("refunded"); // fully refunded
    expect(hist[0].refunds).toHaveLength(2);

    const doc = await prisma.document.findMany({ where: { invoice_id: s.invoice.id, type: "refund_receipt" } });
    expect(doc).toHaveLength(2);
  });
});

describe("correction history", () => {
  it("caps total credit at the invoice value", async () => {
    const s = await paidVisit();
    await issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, s.invoice.total - 50, "partial");
    await expect(issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, 100, "over")).rejects.toBeInstanceOf(CorrectionError); // only 50 left
    await issueCreditNote(s.invoice.id, s.clinic.id, s.actorUserId, 50, "rest"); // ok
    const hist = await getInvoiceCorrections(s.invoice.id, s.clinic.id);
    expect(hist).toHaveLength(2);
  });
});
