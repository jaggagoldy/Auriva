// C3 — Clinical Timeline. Integration. Proves the enriched aggregation (plans +
// documents + deep-links), deterministic ordering (tie-break, Amendment 9), and
// progressive loading (limit + has_more, Amendment 5).

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { transitionStatus } from "@/services/appointment-service";
import { openVisitCapture } from "@/services/service-capture-service";
import { recordCheckoutPayment } from "@/services/checkout-service";
import { createPlan } from "@/services/treatment-plan-service";
import { ensureVisitDocuments } from "@/services/document-service";
import { getPatientTimeline } from "@/services/timeline-service";

const clinicIds: string[] = [];
afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function richPatient() {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { profile: patient } = await createTestPatient(clinic.id);
  const appt = await prisma.appointment.create({ data: { patient_id: patient.id, doctor_id: doctor.id, clinic_id: clinic.id, scheduled_time: new Date(), status: "in_consultation" } });
  await openVisitCapture(appt.id, clinic.id, doctorUser.id);
  await transitionStatus(appt.id, "completed", { actorUserId: doctorUser.id }); // → invoice + events
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { appointment_id: appt.id } });
  await recordCheckoutPayment({ invoiceId: invoice.id, clinicId: clinic.id, amount: invoice.total, method: "cash", actorUserId: doctorUser.id });
  await ensureVisitDocuments(appt.id, clinic.id, doctorUser.id); // → invoice/receipt/visit_summary documents
  const svc = await prisma.service.create({ data: { clinic_id: clinic.id, name: "Physio", duration_minutes: 30, price: 800, category: "Therapy", kind: "clinical" } });
  await createPlan({ clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id, title: "ACL Rehab", serviceId: svc.id, sessionsPlanned: 6, actorUserId: doctorUser.id });
  return { clinic, patient, invoice };
}

describe("enriched aggregation", () => {
  it("includes plans, documents, invoice and payment — each deep-linked", async () => {
    const s = await richPatient();
    const t = await getPatientTimeline(s.patient.id, s.clinic.id, { limit: 100 });
    expect(t).not.toBeNull();
    const kinds = new Set(t!.entries.map((e) => e.kind));
    expect(kinds.has("treatment_plan")).toBe(true);
    expect(kinds.has("document")).toBe(true);
    expect(kinds.has("invoice")).toBe(true);
    expect(kinds.has("payment")).toBe(true);
    expect(kinds.has("appointment")).toBe(true);

    // Deep-links present (never a dead-end where an artifact exists).
    expect(t!.entries.filter((e) => e.kind === "document").every((e) => e.link?.kind === "document")).toBe(true);
    expect(t!.entries.find((e) => e.kind === "treatment_plan")?.link?.kind).toBe("plan");
    expect(t!.entries.find((e) => e.kind === "treatment_plan")?.detail).toBe("0/6 sessions");
  });
});

describe("deterministic ordering (Amendment 9)", () => {
  it("same-timestamp entries use a stable tie-break; repeated calls are identical", async () => {
    const s = await richPatient();
    // Force an invoice and a document to share an exact timestamp.
    const when = new Date("2026-06-01T10:00:00.000Z");
    await prisma.invoice.update({ where: { id: s.invoice.id }, data: { created_at: when } });
    const doc = await prisma.document.findFirstOrThrow({ where: { invoice_id: s.invoice.id, type: "invoice" } });
    await prisma.document.update({ where: { id: doc.id }, data: { generated_at: when } });

    const a = await getPatientTimeline(s.patient.id, s.clinic.id, { limit: 100 });
    const b = await getPatientTimeline(s.patient.id, s.clinic.id, { limit: 100 });
    const order = (t: NonNullable<typeof a>) => t.entries.map((e) => e.id);
    expect(order(a!)).toEqual(order(b!)); // deterministic across calls

    // At the shared timestamp, document (kind order 4) precedes invoice (5).
    const ids = order(a!);
    const docIdx = ids.indexOf(`doc-${doc.id}`);
    const invIdx = ids.indexOf(`inv-${s.invoice.id}`);
    expect(docIdx).toBeGreaterThanOrEqual(0);
    expect(docIdx).toBeLessThan(invIdx);
  });
});

describe("progressive loading (Amendment 5)", () => {
  it("limits to newest-first and reports has_more", async () => {
    const s = await richPatient();
    const t = await getPatientTimeline(s.patient.id, s.clinic.id, { limit: 2 });
    expect(t!.entries).toHaveLength(2);
    expect(t!.has_more).toBe(true);
    expect(t!.total).toBeGreaterThan(2);
    // newest first
    expect(new Date(t!.entries[0].at).getTime()).toBeGreaterThanOrEqual(new Date(t!.entries[1].at).getTime());
  });
});
