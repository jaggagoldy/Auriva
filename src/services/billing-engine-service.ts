// M3A Checkpoint 3 — the billing engine. Turns finalized ServiceEvents into an
// invoice: InvoiceLines (relational source of truth) + a frozen items_json
// snapshot (the print representation). Three properties are load-bearing and
// tested explicitly:
//
//   • DETERMINISTIC — the same finalized events always produce the same lines,
//     snapshot, and total. Events are ordered (added_at, then id) so there is no
//     ordering ambiguity; nothing here reads a clock for business logic.
//   • IDEMPOTENT — settling again with no newly-finalized events is a no-op. A
//     finalized event is "settled" iff an InvoiceLine references it; the unique
//     InvoiceLine.service_event_id makes double-attachment impossible even under
//     concurrency (the second writer hits P2002).
//   • RECONCILABLE — Invoice.total == Σ InvoiceLine.amount == Σ snapshot.amount,
//     by construction, and the snapshot is the same shape print consumes.
//
// It does NOT activate billing policy, issue/collect payment, or render UI.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { InvoiceItem } from "@/domain/invoice-status";
import { nextInvoiceNumber, resolveConsultationFee } from "@/services/billing-service";

export class AppointmentNotFoundError extends Error {}

/** InvoiceLine.origin for a line generated from a ServiceEvent (mirrors the
 *  C1 backfill's "LegacyMigration"). */
const ORIGIN_SERVICE_EVENT = "ServiceEvent";

type SettlementResult = { invoiceId: string | null; created: boolean; lineCount: number; total: number };

/**
 * Settle an appointment's finalized-but-unsettled ServiceEvents into a single
 * new draft invoice. Idempotent: if nothing is awaiting settlement, it creates
 * nothing and returns `{ created: false }`. Runs in the caller's transaction
 * when given one (so it can join the completion transaction), else its own.
 */
export async function settleInvoiceFromEvents(
  appointmentId: string,
  opts: { tx?: Prisma.TransactionClient } = {}
): Promise<SettlementResult> {
  const run = async (tx: Prisma.TransactionClient): Promise<SettlementResult> => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, clinic_id: true, patient_id: true },
    });
    if (!appointment) throw new AppointmentNotFoundError(`Appointment ${appointmentId} not found.`);

    // Unsettled finalized events, in a deterministic order (no ambiguity).
    const events = await tx.serviceEvent.findMany({
      where: { appointment_id: appointmentId, status: "finalized", invoiceLine: null },
      orderBy: [{ added_at: "asc" }, { id: "asc" }],
    });
    if (events.length === 0) return { invoiceId: null, created: false, lineCount: 0, total: 0 };

    const lines = events.map((e) => ({
      service_event_id: e.id,
      origin: ORIGIN_SERVICE_EVENT,
      description: e.name,
      category: e.category,
      qty: e.qty,
      unit_price: e.unit_price,
      amount: e.amount,
    }));
    const total = lines.reduce((sum, l) => sum + l.amount, 0);
    // The frozen print snapshot — identical shape to what draftInvoiceForAppointment
    // writes and what /print/invoice parses, so all representations reconcile.
    const snapshot: InvoiceItem[] = lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unit_price: l.unit_price,
      amount: l.amount,
    }));

    const invoice = await tx.invoice.create({
      data: {
        invoice_number: await nextInvoiceNumber(tx, appointment.clinic_id),
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        status: "draft",
        items_json: JSON.stringify(snapshot),
        total,
        lines: { create: lines },
      },
      select: { id: true },
    });
    return { invoiceId: invoice.id, created: true, lineCount: lines.length, total };
  };

  return opts.tx ? run(opts.tx) : prisma.$transaction(run);
}

/**
 * The completion-hook orchestrator (WF-17). S1 Batch D — UNIFIED: every
 * completion is event-sourced. If the visit has no Consultation charge yet
 * (e.g. completion driven purely by a status transition, no consult surface
 * opened), we seed the base Consultation ServiceEvent server-side; then we
 * finalize all draft charges and settle. The legacy `draftInvoiceForAppointment`
 * fallback is gone — the consultation fee is always a ServiceEvent.
 * Returns the invoice id, or null if settlement produced nothing new (e.g. the
 * consultation was already settled/paid up front under a prepaid policy).
 */
export async function completeVisitInvoicing(
  tx: Prisma.TransactionClient,
  appointment: {
    id: string;
    clinic_id: string;
    patient_id: string;
    doctor_id: string;
    follow_up_source_appointment_id?: string | null;
  }
): Promise<{ id: string } | null> {
  // Ensure the consultation charge exists as a ServiceEvent (idempotent).
  const hasConsultation = await tx.serviceEvent.count({
    where: { appointment_id: appointment.id, category: "Consultation", status: { in: ["draft", "finalized"] } },
  });
  if (hasConsultation === 0) {
    const { fee, doctorName } = await resolveConsultationFee(tx, {
      doctorId: appointment.doctor_id,
      isFollowUp: Boolean(appointment.follow_up_source_appointment_id),
    });
    await tx.serviceEvent.create({
      data: {
        clinic_id: appointment.clinic_id,
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        name: `${appointment.follow_up_source_appointment_id ? "Follow-up consultation" : "Consultation"} — ${doctorName}`,
        category: "Consultation",
        kind: "clinical",
        unit_price: fee,
        qty: 1,
        amount: fee,
        status: "finalized",
        finalized_at: new Date(),
        needs_catalog_review: false,
        added_by_role: "doctor",
      },
    });
  }

  return settleAllForAppointment(tx, appointment.id);
}

/**
 * C1 — if this appointment is a booked Treatment Plan session, capture the
 * plan's service as the session's finalized ServiceEvent (the charge) and mark
 * the session completed. Returns true if it was a plan session. Lives here (not
 * in treatment-plan-service) to avoid an appointment↔plan import cycle; it is a
 * plain data operation. A plan session charges exactly once, and only on
 * completion — so unattended sessions never charge (financial integrity).
 */
export async function capturePlanSessionCharge(tx: Prisma.TransactionClient, appointmentId: string): Promise<boolean> {
  const session = await tx.treatmentPlanSession.findFirst({
    where: { appointment_id: appointmentId, status: "planned" },
    include: { plan: true },
  });
  if (!session) return false;
  const service = await tx.service.findFirst({ where: { id: session.plan.service_id, clinic_id: session.plan.clinic_id } });
  if (!service) return false; // no service → can't charge; leave the session as-is

  const event = await tx.serviceEvent.create({
    data: {
      clinic_id: session.plan.clinic_id,
      patient_id: session.plan.patient_id,
      appointment_id: appointmentId,
      service_id: service.id,
      service_version: service.version,
      name: `${service.name} (session ${session.sequence})`,
      category: service.category,
      kind: "clinical",
      unit_price: service.price,
      qty: 1,
      amount: service.price,
      status: "finalized",
      finalized_at: new Date(),
      needs_catalog_review: false,
      added_by_role: "doctor",
    },
  });
  await tx.treatmentPlanSession.update({ where: { id: session.id }, data: { status: "completed", service_event_id: event.id } });
  return true;
}

/**
 * Finalize a visit's remaining draft ServiceEvents and settle them into an
 * invoice — the event-sourced settlement path WITHOUT any consultation-fee seed.
 * `completeVisitInvoicing` = ensure-consultation + this. C1 uses this directly
 * for a plan session (whose charge is the plan's service, not a consult fee).
 */
export async function settleAllForAppointment(tx: Prisma.TransactionClient, appointmentId: string): Promise<{ id: string } | null> {
  await tx.serviceEvent.updateMany({
    where: { appointment_id: appointmentId, status: "draft" },
    data: { status: "finalized", finalized_at: new Date() },
  });
  const result = await settleInvoiceFromEvents(appointmentId, { tx });
  return result.invoiceId ? { id: result.invoiceId } : null;
}

/**
 * Rebuild an invoice's `total` and frozen `items_json` snapshot from its
 * current `InvoiceLine`s (M3B B2). Keeps the 4-way reconciliation intact
 * (total == Σ lines == Σ snapshot) after a draft invoice's lines change —
 * reception financial charges or a concession. Adjustment lines are negative,
 * so they net down both total and snapshot by construction.
 */
export async function regenerateInvoice(tx: Prisma.TransactionClient, invoiceId: string): Promise<number> {
  const lines = await tx.invoiceLine.findMany({
    where: { invoice_id: invoiceId },
    orderBy: { created_at: "asc" },
  });
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const snapshot: InvoiceItem[] = lines.map((l) => ({
    description: l.description,
    qty: l.qty,
    unit_price: l.unit_price,
    amount: l.amount,
  }));
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { total, items_json: JSON.stringify(snapshot) },
  });
  return total;
}

/**
 * The C3 settlement invariant, enforceable in code and asserted in tests: for a
 * given appointment, every finalized ServiceEvent is attached to exactly one
 * InvoiceLine OR is awaiting settlement — never lost, never double-attached, and
 * no line points at a draft/removed event. Returns a report; `violations` empty
 * means healthy. (Double-attachment is additionally impossible at the DB level
 * via the unique InvoiceLine.service_event_id.)
 */
export async function checkSettlementInvariant(
  appointmentId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const events = await db.serviceEvent.findMany({
    where: { appointment_id: appointmentId },
    include: { invoiceLine: { select: { id: true } } },
  });

  const violations: string[] = [];
  let finalized = 0;
  let attached = 0;
  let awaiting = 0;

  for (const e of events) {
    const hasLine = e.invoiceLine != null;
    if (e.status === "finalized") {
      finalized += 1;
      if (hasLine) attached += 1;
      else awaiting += 1;
    }
    if (hasLine && (e.status === "draft" || e.status === "removed")) {
      violations.push(`event ${e.id} is "${e.status}" but has an InvoiceLine (${e.invoiceLine?.id}).`);
    }
  }

  return { finalized, attached, awaiting, violations, healthy: violations.length === 0 };
}
