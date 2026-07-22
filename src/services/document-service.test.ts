// M3B B3 — Clinical Document Platform. Integration against the real dev DB.
// Proves generation (3 types), immutable snapshot + reconciliation, unified
// numbering, category assignment, versioning/supersede, and the ensure set.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { addVisitClinicalService, openVisitCapture } from "@/services/service-capture-service";
import { transitionStatus } from "@/services/appointment-service";
import { recordCheckoutPayment } from "@/services/checkout-service";
import {
  ensureVisitDocuments,
  generateDocument,
  getDocument,
  getVisitDocuments,
} from "@/services/document-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function completedVisit(opts: { pay?: boolean } = {}) {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { profile: patient } = await createTestPatient(clinic.id);
  const appt = await prisma.appointment.create({
    data: { patient_id: patient.id, doctor_id: doctor.id, clinic_id: clinic.id, scheduled_time: new Date(), status: "in_consultation",
      diagnosis: "Acute pharyngitis", prescription_medicines_json: JSON.stringify([{ name: "Paracetamol 650", dosage: "1 tab", frequency: "1-0-1", duration: "3 days" }]) },
  });
  await openVisitCapture(appt.id, clinic.id, doctorUser.id);
  const ecg = await prisma.service.create({ data: { clinic_id: clinic.id, name: "ECG", duration_minutes: 10, price: 300, category: "Procedure", kind: "clinical" } });
  await addVisitClinicalService(appt.id, clinic.id, doctorUser.id, { serviceId: ecg.id });
  await transitionStatus(appt.id, "completed", { actorUserId: doctorUser.id });
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { appointment_id: appt.id }, orderBy: { created_at: "asc" } });
  if (opts.pay) await recordCheckoutPayment({ invoiceId: invoice.id, clinicId: clinic.id, amount: invoice.total, method: "cash", actorUserId: doctorUser.id });
  return { clinic, appt, doctorUser, invoice };
}

describe("generateDocument", () => {
  it("invoice — Financial, numbered INV-…, snapshot reconciles with the invoice", async () => {
    const s = await completedVisit();
    const res = await generateDocument("invoice", s.appt.id, s.clinic.id, s.doctorUser.id);
    expect(res).not.toBeNull();
    expect(res!.number).toMatch(/^INV-\d{4}-0001$/);
    expect(res!.version).toBe(1);
    const doc = await getDocument(res!.id, s.clinic.id);
    expect(doc.category).toBe("Financial");
    const lineSum = (doc.content.body.lines as { amount: number }[]).reduce((n, l) => n + l.amount, 0);
    expect(lineSum).toBe(doc.content.body.total);
    expect(doc.content.body.total).toBe(s.invoice.total);
    expect(doc.content.branding.clinic_name).toBeTruthy(); // self-contained snapshot
  });

  it("visit_summary — Clinical, VS-…, carries diagnosis + medicines + services", async () => {
    const s = await completedVisit();
    const res = await generateDocument("visit_summary", s.appt.id, s.clinic.id, s.doctorUser.id);
    expect(res!.number).toMatch(/^VS-\d{4}-0001$/);
    const doc = await getDocument(res!.id, s.clinic.id);
    expect(doc.category).toBe("Clinical");
    expect(doc.content.body.diagnosis).toBe("Acute pharyngitis");
    expect((doc.content.body.medicines as unknown[]).length).toBe(1);
    expect((doc.content.body.services as { name: string }[]).some((x) => x.name === "ECG")).toBe(true);
  });

  it("receipt — only after a payment exists", async () => {
    const unpaid = await completedVisit({ pay: false });
    expect(await generateDocument("receipt", unpaid.appt.id, unpaid.clinic.id, unpaid.doctorUser.id)).toBeNull();

    const paid = await completedVisit({ pay: true });
    const res = await generateDocument("receipt", paid.appt.id, paid.clinic.id, paid.doctorUser.id);
    expect(res!.number).toMatch(/^RCPT-\d{4}-0001$/);
    const doc = await getDocument(res!.id, paid.clinic.id);
    expect(doc.content.body.total_paid).toBe(paid.invoice.total);
  });
});

describe("versioning + numbering", () => {
  it("regenerate supersedes the prior version, keeps the number, bumps version", async () => {
    const s = await completedVisit();
    const v1 = await generateDocument("invoice", s.appt.id, s.clinic.id, s.doctorUser.id);
    const v2 = await generateDocument("invoice", s.appt.id, s.clinic.id, s.doctorUser.id);
    expect(v2!.number).toBe(v1!.number); // stable number
    expect(v2!.version).toBe(2);

    const prior = await prisma.document.findUniqueOrThrow({ where: { id: v1!.id } });
    expect(prior.status).toBe("superseded"); // preserved, not overwritten
    const current = await getVisitDocuments(s.appt.id, s.clinic.id);
    expect(current.filter((d) => d.type === "invoice")).toHaveLength(1); // only the issued one is current
    const doc = await getDocument(v2!.id, s.clinic.id);
    expect(doc.supersedes_version).toBe(1);
  });

  it("numbers increment per clinic + type across visits", async () => {
    const a = await completedVisit();
    const b = await prisma.appointment.create({
      data: { patient_id: a.appt.patient_id, doctor_id: a.appt.doctor_id, clinic_id: a.clinic.id, scheduled_time: new Date(), status: "completed" },
    });
    // give b its own invoice
    await prisma.invoice.create({ data: { invoice_number: "INV-X", clinic_id: a.clinic.id, patient_id: a.appt.patient_id, appointment_id: b.id, status: "draft", items_json: "[]", total: 0 } });
    const first = await generateDocument("invoice", a.appt.id, a.clinic.id, a.doctorUser.id);
    const second = await generateDocument("invoice", b.id, a.clinic.id, a.doctorUser.id);
    expect(first!.number).toMatch(/-0001$/);
    expect(second!.number).toMatch(/-0002$/);
  });
});

describe("ensureVisitDocuments", () => {
  it("generates the applicable set idempotently (incl. C4 prescription)", async () => {
    const s = await completedVisit({ pay: true }); // harness seeds a legacy-shape prescription
    const set1 = await ensureVisitDocuments(s.appt.id, s.clinic.id, s.doctorUser.id);
    const types = set1.map((d) => d.type).sort();
    expect(types).toEqual(["invoice", "prescription", "receipt", "visit_summary"]);
    const set2 = await ensureVisitDocuments(s.appt.id, s.clinic.id, s.doctorUser.id);
    expect(set2).toHaveLength(4); // idempotent — not duplicated
    const count = await prisma.document.count({ where: { appointment_id: s.appt.id, status: "issued" } });
    expect(count).toBe(4);
  });
});

// C4 — the issued Prescription document.
describe("prescription document", () => {
  it("RX-numbered Clinical doc that snapshots structured medicines from a LEGACY row (A9)", async () => {
    const s = await completedVisit(); // harness prescription is the legacy {name,dosage,frequency,duration} shape
    const res = await generateDocument("prescription", s.appt.id, s.clinic.id, s.doctorUser.id);
    expect(res).not.toBeNull();
    expect(res!.number).toMatch(/^RX-\d{4}-0001$/);
    const doc = await getDocument(res!.id, s.clinic.id);
    expect(doc.category).toBe("Clinical");
    expect(doc.content.body.visit_id).toBe(s.appt.id); // A7 metadata
    const meds = doc.content.body.medicines as { name: string }[];
    expect(meds).toHaveLength(1);
    expect(meds[0].name).toBe("Paracetamol 650");
    expect(doc.content.branding.clinic_name).toBeTruthy(); // self-contained snapshot
  });

  it("is NOT generated when the visit has no medicines", async () => {
    const { clinic } = await createTestOrganization();
    clinicIds.push(clinic.id);
    const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
    const { profile: patient } = await createTestPatient(clinic.id);
    const appt = await prisma.appointment.create({
      data: { patient_id: patient.id, doctor_id: doctor.id, clinic_id: clinic.id, scheduled_time: new Date(), status: "in_consultation", diagnosis: "Advice only" },
    });
    await openVisitCapture(appt.id, clinic.id, doctorUser.id);
    await transitionStatus(appt.id, "completed", { actorUserId: doctorUser.id });
    expect(await generateDocument("prescription", appt.id, clinic.id, doctorUser.id)).toBeNull();
    const set = await ensureVisitDocuments(appt.id, clinic.id, doctorUser.id);
    expect(set.some((d) => d.type === "prescription")).toBe(false);
  });
});
