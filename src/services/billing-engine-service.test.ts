// M3A C3 — the billing engine. Integration against the real dev DB. Proves the
// three load-bearing properties (deterministic, idempotent, reconcilable), the
// settlement invariant, and the backward-compatible completion hook.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { addServiceEvent, finalizeServiceEvent } from "@/services/service-event-service";
import { transitionStatus } from "@/services/appointment-service";
import {
  AppointmentNotFoundError,
  checkSettlementInvariant,
  completeVisitInvoicing,
  settleInvoiceFromEvents,
} from "@/services/billing-engine-service";
import type { InvoiceItem } from "@/domain/invoice-status";

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
    data: {
      patient_id: patient.id,
      doctor_id: doctor.id,
      clinic_id: clinic.id,
      scheduled_time: new Date(),
      status: "in_consultation",
    },
  });
  return {
    clinic,
    patient,
    appointment,
    doctor: { userId: doctorUser.id, role: "doctor" as const },
    reception: { userId: receptionUser.id, role: "reception" as const },
    base: { clinicId: clinic.id, patientId: patient.id, appointmentId: appointment.id },
  };
}

/** Add a clinical ad-hoc event (doctor) and finalize it — returns the event. */
async function addFinalizedClinical(
  s: Awaited<ReturnType<typeof scenario>>,
  name: string,
  unitPrice: number,
  qty = 1
) {
  const e = await addServiceEvent(
    { ...s.base, serviceId: null, name, category: "Procedure", kind: "clinical", unitPrice, qty },
    s.doctor
  );
  return finalizeServiceEvent(e.id);
}

describe("settleInvoiceFromEvents — settlement + snapshot", () => {
  it("turns finalized events into one draft invoice with a line each", async () => {
    const s = await scenario();
    await addFinalizedClinical(s, "Dressing", 300);
    await addFinalizedClinical(s, "Suture", 700, 2); // 1400

    const result = await settleInvoiceFromEvents(s.appointment.id);
    expect(result.created).toBe(true);
    expect(result.lineCount).toBe(2);
    expect(result.total).toBe(300 + 1400);

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: result.invoiceId! },
      include: { lines: { orderBy: { created_at: "asc" } } },
    });
    expect(invoice.status).toBe("draft");
    expect(invoice.appointment_id).toBe(s.appointment.id);
    expect(invoice.lines).toHaveLength(2);
    expect(invoice.lines.every((l) => l.origin === "ServiceEvent")).toBe(true);
    expect(invoice.lines.every((l) => l.service_event_id != null)).toBe(true);
  });

  it("snapshots currency INR on the ServiceEvent", async () => {
    const s = await scenario();
    const e = await addFinalizedClinical(s, "X-ray", 500);
    expect(e.currency).toBe("INR");
  });

  it("throws for a missing appointment", async () => {
    await expect(settleInvoiceFromEvents("nope")).rejects.toBeInstanceOf(AppointmentNotFoundError);
  });
});

describe("4-way reconciliation (Invoice ↔ Lines ↔ snapshot ↔ print)", () => {
  it("all four representations describe the same financial document", async () => {
    const s = await scenario();
    await addFinalizedClinical(s, "Consult", 400);
    await addFinalizedClinical(s, "Injection", 150, 3); // 450
    const { invoiceId } = await settleInvoiceFromEvents(s.appointment.id);

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId! },
      include: { lines: { orderBy: { created_at: "asc" } } },
    });
    const lineSum = invoice.lines.reduce((n, l) => n + l.amount, 0);
    const snapshot = JSON.parse(invoice.items_json) as InvoiceItem[]; // what /print parses
    const snapSum = snapshot.reduce((n, i) => n + i.amount, 0);

    // 1: Invoice.total  2: Σ lines  3: Σ snapshot  — all equal.
    expect(invoice.total).toBe(lineSum);
    expect(lineSum).toBe(snapSum);
    expect(invoice.total).toBe(400 + 450);

    // 4: the print snapshot row-for-row matches the lines.
    expect(snapshot).toHaveLength(invoice.lines.length);
    invoice.lines.forEach((l, i) => {
      expect(snapshot[i]).toEqual({
        description: l.description,
        qty: l.qty,
        unit_price: l.unit_price,
        amount: l.amount,
      });
    });
  });
});

describe("idempotency (retry → retry → retry)", () => {
  it("settling repeatedly with no new events creates exactly one invoice + one set of lines", async () => {
    const s = await scenario();
    await addFinalizedClinical(s, "A", 100);
    await addFinalizedClinical(s, "B", 200);

    const first = await settleInvoiceFromEvents(s.appointment.id);
    expect(first.created).toBe(true);
    const second = await settleInvoiceFromEvents(s.appointment.id);
    const third = await settleInvoiceFromEvents(s.appointment.id);
    expect(second.created).toBe(false);
    expect(third.created).toBe(false);
    expect(second.lineCount).toBe(0);

    const invoices = await prisma.invoice.findMany({ where: { appointment_id: s.appointment.id } });
    const lines = await prisma.invoiceLine.count({
      where: { invoice: { appointment_id: s.appointment.id } },
    });
    expect(invoices).toHaveLength(1); // one invoice
    expect(lines).toBe(2); // one set of lines, no duplicates
  });

  it("a newly-finalized event settles into a second invoice (1:N), never a duplicate line", async () => {
    const s = await scenario();
    await addFinalizedClinical(s, "First", 100);
    await settleInvoiceFromEvents(s.appointment.id);
    await addFinalizedClinical(s, "Second", 250);
    const again = await settleInvoiceFromEvents(s.appointment.id);
    expect(again.created).toBe(true);
    expect(again.lineCount).toBe(1);

    const invoices = await prisma.invoice.findMany({ where: { appointment_id: s.appointment.id } });
    expect(invoices).toHaveLength(2); // 1:N relaxation in action
  });

  it("double-attachment is impossible at the DB level (unique service_event_id)", async () => {
    const s = await scenario();
    const e = await addFinalizedClinical(s, "Only", 100);
    const { invoiceId } = await settleInvoiceFromEvents(s.appointment.id);
    await expect(
      prisma.invoiceLine.create({
        data: {
          invoice_id: invoiceId!,
          service_event_id: e.id, // already attached
          origin: "ServiceEvent",
          description: "dup",
          qty: 1,
          unit_price: 100,
          amount: 100,
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("determinism", () => {
  it("the same finalized events produce identical lines, snapshot, and total", async () => {
    async function settleTwin() {
      const s = await scenario();
      await addFinalizedClinical(s, "Alpha", 111);
      await addFinalizedClinical(s, "Beta", 222, 2); // 444
      const { invoiceId, total } = await settleInvoiceFromEvents(s.appointment.id);
      const invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId! },
        include: { lines: { orderBy: { created_at: "asc" } } },
      });
      const lineShape = invoice.lines.map((l) => ({
        description: l.description,
        category: l.category,
        qty: l.qty,
        unit_price: l.unit_price,
        amount: l.amount,
        origin: l.origin,
      }));
      return { total, lineShape, snapshot: invoice.items_json };
    }
    const a = await settleTwin();
    const b = await settleTwin();
    expect(b.total).toBe(a.total);
    expect(b.lineShape).toEqual(a.lineShape);
    expect(b.snapshot).toBe(a.snapshot); // byte-identical frozen snapshot
  });
});

describe("settlement invariant", () => {
  it("finalized events are attached exactly once or awaiting — never lost/double", async () => {
    const s = await scenario();
    await addFinalizedClinical(s, "One", 100);
    await addFinalizedClinical(s, "Two", 200);

    let inv = await checkSettlementInvariant(s.appointment.id);
    expect(inv.finalized).toBe(2);
    expect(inv.awaiting).toBe(2); // before settlement
    expect(inv.attached).toBe(0);
    expect(inv.healthy).toBe(true);

    await settleInvoiceFromEvents(s.appointment.id);
    inv = await checkSettlementInvariant(s.appointment.id);
    expect(inv.attached).toBe(2);
    expect(inv.awaiting).toBe(0);
    expect(inv.healthy).toBe(true);
    expect(inv.violations).toEqual([]);
  });
});

describe("completeVisitInvoicing — unified event-sourced (S1 Batch D)", () => {
  it("with NO events, seeds a Consultation ServiceEvent and settles it (event-sourced)", async () => {
    const s = await scenario();
    const invoice = await prisma.$transaction((tx) =>
      completeVisitInvoicing(tx, {
        id: s.appointment.id,
        clinic_id: s.clinic.id,
        patient_id: s.patient.id,
        doctor_id: s.appointment.doctor_id,
      })
    );
    expect(invoice).not.toBeNull();
    const lines = await prisma.invoiceLine.findMany({ where: { invoice_id: invoice!.id } });
    // Unified: the consultation fee is now a ServiceEvent line — no legacy fallback.
    expect(lines).toHaveLength(1);
    expect(lines[0].origin).toBe("ServiceEvent");
    const consult = await prisma.serviceEvent.findFirst({ where: { appointment_id: s.appointment.id, category: "Consultation" } });
    expect(consult?.status).toBe("finalized");
    const inv = await checkSettlementInvariant(s.appointment.id);
    expect(inv.healthy).toBe(true);
    expect(inv.awaiting).toBe(0);
  });

  it("VERIFICATION: completion via transitionStatus (no capture) is event-sourced — the fallback is unreachable", async () => {
    const s = await scenario(); // in_consultation, no openVisitCapture
    await transitionStatus(s.appointment.id, "completed", { actorUserId: s.doctor.userId });
    const invoice = await prisma.invoice.findFirstOrThrow({
      where: { appointment_id: s.appointment.id },
      include: { lines: { include: { serviceEvent: { select: { category: true } } } } },
    });
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0].origin).toBe("ServiceEvent"); // NOT a legacy items_json-only draft
    expect(invoice.lines[0].serviceEvent?.category).toBe("Consultation");
    const inv = await checkSettlementInvariant(s.appointment.id);
    expect(inv.awaiting).toBe(0);
    expect(inv.healthy).toBe(true);
  });

  it("with captured events, finalizes drafts and settles them", async () => {
    const s = await scenario();
    // captured but NOT yet finalized (draft) — simulating in-visit capture
    await addServiceEvent(
      { ...s.base, serviceId: null, name: "Nebulization", category: "Therapy", kind: "clinical", unitPrice: 350 },
      s.doctor
    );
    const invoice = await prisma.$transaction((tx) =>
      completeVisitInvoicing(tx, {
        id: s.appointment.id,
        clinic_id: s.clinic.id,
        patient_id: s.patient.id,
        doctor_id: s.appointment.doctor_id,
      })
    );
    expect(invoice).not.toBeNull();
    const lines = await prisma.invoiceLine.findMany({ where: { invoice_id: invoice!.id }, include: { serviceEvent: { select: { category: true } } } });
    // Consultation (seeded) + Nebulization (captured) — both event-sourced.
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.origin === "ServiceEvent")).toBe(true);
    expect(lines.some((l) => l.serviceEvent?.category === "Consultation")).toBe(true);
    const inv = await checkSettlementInvariant(s.appointment.id);
    expect(inv.healthy).toBe(true);
    expect(inv.awaiting).toBe(0);
  });
});
