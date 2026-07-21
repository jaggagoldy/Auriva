// M3B Checkpoint B2 — Checkout (Reception Workspace) orchestration.
//
// Reads a visit's settled (draft) invoice as a checkout view — grouped charges
// (Clinical vs Administrative), the money summary (Estimated → Concession → Net
// → Collected → Outstanding), payments, reception notes, and a derived visit
// status. Mutations are reception-only and DRAFT-invoice-only:
//   • add a financial charge   (reception, kind=financial — a real ServiceEvent)
//   • apply / remove Concession (a ManualAdjustment InvoiceLine, negative)
//   • remove a reception-added charge
//   • set reception notes (operational, NOT clinical)
//   • record payment (split/partial — reuses billing-service.recordPayment)
//
// Principle 6: clinical lines are read-only here (never removable by reception).
// Everything reconciles via regenerateInvoice (total == Σ lines == Σ snapshot).

import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { recordPayment } from "@/services/billing-service";
import { regenerateInvoice, settleInvoiceFromEvents } from "@/services/billing-engine-service";
import { openVisitCapture } from "@/services/service-capture-service";
import { canActorAddKind, isServiceCategory } from "@/domain/service-catalog";
import { PaymentMethod } from "@/domain/invoice-status";

export class CheckoutError extends Error {}
export class CheckoutPermissionError extends Error {}

const CONCESSION_ORIGIN = "ManualAdjustment";
const RECEPTION_ROLE = "reception" as const;

export type VisitStatus = "Consulting" | "Ready for Checkout" | "Partially Paid" | "Completed";

async function requireDraftInvoice(invoiceId: string, clinicId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, clinic_id: clinicId },
    select: { id: true, status: true, appointment_id: true, patient_id: true },
  });
  if (!invoice) throw new CheckoutError("Invoice not found in this clinic.");
  if (invoice.status === "paid" || invoice.status === "void") {
    throw new CheckoutError(`This invoice is ${invoice.status} and can no longer be edited.`);
  }
  return invoice;
}

async function orgIdForClinic(clinicId: string): Promise<string | null> {
  const c = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { organization_id: true } });
  return c?.organization_id ?? null;
}

/** The full checkout view model for a visit's invoice. */
export async function getCheckout(invoiceId: string, clinicId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, clinic_id: clinicId },
    include: {
      payments: { orderBy: { received_at: "asc" } },
      lines: { orderBy: { created_at: "asc" }, include: { serviceEvent: { select: { kind: true } } } },
      appointment: {
        select: {
          queue_number: true,
          walk_in: true,
          scheduled_time: true,
          status: true,
          follow_up_source_appointment_id: true,
          doctor: { select: { full_name: true } },
        },
      },
      patient: { select: { full_name: true } },
    },
  });
  if (!invoice) throw new CheckoutError("Invoice not found in this clinic.");

  const clinical: CheckoutLine[] = [];
  const administrative: CheckoutLine[] = [];
  let concessionAmount = 0;
  let concessionLineId: string | null = null;

  for (const l of invoice.lines) {
    if (l.origin === CONCESSION_ORIGIN) {
      concessionAmount += -l.amount; // stored negative
      concessionLineId = l.id;
      continue;
    }
    const line: CheckoutLine = {
      id: l.id,
      description: l.description,
      category: l.category,
      qty: l.qty,
      unit_price: l.unit_price,
      amount: l.amount,
    };
    if (l.serviceEvent?.kind === "financial") administrative.push({ ...line, removable: true });
    else clinical.push({ ...line, removable: false }); // Principle 6: clinical read-only
  }

  const estimated = clinical.reduce((n, l) => n + l.amount, 0) + administrative.reduce((n, l) => n + l.amount, 0);
  const collected = invoice.payments.reduce((n, p) => n + p.amount, 0);
  const net = invoice.total; // = estimated − concession (regenerated)
  const outstanding = net - collected;

  const appt = invoice.appointment;
  const appointmentType = appt?.follow_up_source_appointment_id
    ? "Follow-up"
    : appt?.walk_in
      ? "Walk-in"
      : "Appointment";
  const visitStatus: VisitStatus =
    invoice.status === "paid"
      ? "Completed"
      : collected > 0
        ? "Partially Paid"
        : appt?.status === "in_consultation"
          ? "Consulting"
          : "Ready for Checkout";

  return {
    invoice: { id: invoice.id, invoice_number: invoice.invoice_number, status: invoice.status, appointment_id: invoice.appointment_id },
    visit: {
      patient_name: invoice.patient?.full_name ?? "Patient",
      token: appt?.queue_number ?? null,
      doctor_name: appt?.doctor?.full_name ?? null,
      appointment_type: appointmentType,
      scheduled_time: appt?.scheduled_time?.toISOString() ?? null,
      status: visitStatus,
    },
    groups: { clinical, administrative },
    concession: { amount: concessionAmount, lineId: concessionLineId },
    money: { estimated, concession: concessionAmount, net, collected, outstanding },
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      received_at: p.received_at.toISOString(),
    })),
    notes: invoice.checkout_notes,
  };
}

export interface CheckoutLine {
  id: string;
  description: string;
  category: string | null;
  qty: number;
  unit_price: number;
  amount: number;
  removable?: boolean;
}

interface FinancialChargeInput {
  serviceId?: string | null;
  name?: string;
  category?: string;
  unitPrice?: number;
  qty?: number;
}

/** Reception adds a financial charge (Registration, Consumable, Administrative,
 *  …) to the open draft invoice — a real finalized ServiceEvent + its line. */
export async function addFinancialCharge(
  invoiceId: string,
  clinicId: string,
  actorUserId: string | null | undefined,
  input: FinancialChargeInput
) {
  const invoice = await requireDraftInvoice(invoiceId, clinicId);
  if (!invoice.appointment_id) throw new CheckoutError("This invoice is not linked to a visit.");
  const qty = input.qty ?? 1;
  if (!Number.isInteger(qty) || qty < 1) throw new CheckoutError("Quantity must be at least 1.");

  await prisma.$transaction(async (tx) => {
    let name: string;
    let category: string;
    let unitPrice: number;
    let serviceVersion: number | null = null;

    if (input.serviceId) {
      const service = await tx.service.findFirst({ where: { id: input.serviceId, clinic_id: clinicId } });
      if (!service) throw new CheckoutError("Service not found in this clinic.");
      if (!canActorAddKind(RECEPTION_ROLE, service.kind === "financial" ? "financial" : "clinical")) {
        throw new CheckoutPermissionError("Reception can only add financial charges.");
      }
      name = service.name;
      category = service.category;
      unitPrice = service.price;
      serviceVersion = service.version;
    } else {
      const cat = input.category ?? "Administrative";
      if (!isServiceCategory(cat)) throw new CheckoutError("Unknown charge category.");
      if (!input.name?.trim()) throw new CheckoutError("A charge name is required.");
      if (input.unitPrice == null || !Number.isInteger(input.unitPrice) || input.unitPrice < 0) {
        throw new CheckoutError("A valid price is required.");
      }
      name = input.name.trim();
      category = cat;
      unitPrice = input.unitPrice;
    }

    const event = await tx.serviceEvent.create({
      data: {
        clinic_id: clinicId,
        patient_id: invoice.patient_id,
        appointment_id: invoice.appointment_id!,
        service_id: input.serviceId ?? null,
        service_version: serviceVersion,
        name,
        category,
        kind: "financial",
        unit_price: unitPrice,
        qty,
        amount: unitPrice * qty,
        status: "finalized",
        finalized_at: new Date(),
        needs_catalog_review: !input.serviceId,
        added_by_user_id: actorUserId ?? null,
        added_by_role: RECEPTION_ROLE,
      },
    });
    await tx.invoiceLine.create({
      data: {
        invoice_id: invoice.id,
        service_event_id: event.id,
        origin: "ServiceEvent",
        description: name,
        category,
        qty,
        unit_price: unitPrice,
        amount: unitPrice * qty,
      },
    });
    await regenerateInvoice(tx, invoice.id);
  });

  await recordAudit({
    organizationId: await orgIdForClinic(clinicId),
    actorUserId,
    action: "checkout_charge_added",
    detail: `${input.name ?? "catalog charge"} on ${invoice.id}`,
  });
  return getCheckout(invoiceId, clinicId);
}

/** Apply (or update) the visit's Concession — a single negative adjustment
 *  line on the open invoice. Reception-permitted, reason required, audited. */
export async function applyConcession(
  invoiceId: string,
  clinicId: string,
  actorUserId: string | null | undefined,
  amount: number,
  reason: string
) {
  const invoice = await requireDraftInvoice(invoiceId, clinicId);
  if (!Number.isInteger(amount) || amount <= 0) throw new CheckoutError("Concession must be a positive amount.");
  if (!reason?.trim()) throw new CheckoutError("A reason is required for a concession.");

  await prisma.$transaction(async (tx) => {
    const charges = await tx.invoiceLine.findMany({ where: { invoice_id: invoice.id, origin: { not: CONCESSION_ORIGIN } } });
    const chargeTotal = charges.reduce((n, l) => n + l.amount, 0);
    if (amount > chargeTotal) throw new CheckoutError(`Concession cannot exceed the charges (₹${chargeTotal}).`);

    const existing = await tx.invoiceLine.findFirst({ where: { invoice_id: invoice.id, origin: CONCESSION_ORIGIN } });
    const data = {
      description: `Concession — ${reason.trim()}`,
      category: "Adjustment",
      qty: 1,
      unit_price: -amount,
      amount: -amount,
      discount_amount: amount,
    };
    if (existing) await tx.invoiceLine.update({ where: { id: existing.id }, data });
    else await tx.invoiceLine.create({ data: { invoice_id: invoice.id, origin: CONCESSION_ORIGIN, ...data } });
    await regenerateInvoice(tx, invoice.id);
  });

  await recordAudit({
    organizationId: await orgIdForClinic(clinicId),
    actorUserId,
    action: "checkout_concession_applied",
    detail: `₹${amount} — ${reason.trim()} (invoice ${invoice.id})`,
  });
  return getCheckout(invoiceId, clinicId);
}

/** Remove the concession. */
export async function removeConcession(invoiceId: string, clinicId: string, actorUserId?: string | null) {
  const invoice = await requireDraftInvoice(invoiceId, clinicId);
  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.deleteMany({ where: { invoice_id: invoice.id, origin: CONCESSION_ORIGIN } });
    await regenerateInvoice(tx, invoice.id);
  });
  await recordAudit({ organizationId: await orgIdForClinic(clinicId), actorUserId, action: "checkout_concession_removed", detail: invoice.id });
  return getCheckout(invoiceId, clinicId);
}

/** Remove a reception-added financial charge (draft only). Clinical lines are
 *  never removable here (Principle 6). */
export async function removeCheckoutCharge(lineId: string, clinicId: string, actorUserId?: string | null) {
  const line = await prisma.invoiceLine.findUnique({
    where: { id: lineId },
    include: { invoice: { select: { id: true, clinic_id: true, status: true } }, serviceEvent: { select: { id: true, kind: true } } },
  });
  if (!line || line.invoice.clinic_id !== clinicId) throw new CheckoutError("Charge not found in this clinic.");
  if (line.invoice.status !== "draft") throw new CheckoutError("This invoice can no longer be edited.");
  if (line.serviceEvent?.kind !== "financial") throw new CheckoutPermissionError("Only reception-added financial charges can be removed here.");

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.delete({ where: { id: line.id } });
    if (line.serviceEvent) await tx.serviceEvent.update({ where: { id: line.serviceEvent.id }, data: { status: "removed", removed_at: new Date() } });
    await regenerateInvoice(tx, line.invoice.id);
  });
  await recordAudit({ organizationId: await orgIdForClinic(clinicId), actorUserId, action: "checkout_charge_removed", detail: line.invoice.id });
  return getCheckout(line.invoice.id, clinicId);
}

/** Reception operational notes (not clinical). */
export async function setCheckoutNotes(invoiceId: string, clinicId: string, notes: string, actorUserId?: string | null) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, clinic_id: clinicId }, select: { id: true } });
  if (!invoice) throw new CheckoutError("Invoice not found in this clinic.");
  await prisma.invoice.update({ where: { id: invoice.id }, data: { checkout_notes: notes.trim() || null } });
  await recordAudit({ organizationId: await orgIdForClinic(clinicId), actorUserId, action: "checkout_notes_updated", detail: invoice.id });
  return getCheckout(invoiceId, clinicId);
}

/** Record a payment (split/partial) — reuses the billing-service choke point. */
export async function recordCheckoutPayment(input: {
  invoiceId: string;
  clinicId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  actorUserId?: string | null;
}) {
  await recordPayment({
    invoiceId: input.invoiceId,
    clinicId: input.clinicId,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? null,
    receivedByUserId: input.actorUserId ?? null,
  });
  return getCheckout(input.invoiceId, input.clinicId);
}

/**
 * M3B B4 — prepare the consultation invoice for prepaid/hybrid "collect up
 * front": seed the base Consultation event (idempotent), finalize it, and settle
 * it into an invoice reception can collect BEFORE the doctor. Returns the
 * invoiceId (existing one if the consultation is already settled).
 */
export async function prepareConsultationInvoice(appointmentId: string, clinicId: string, actorUserId?: string | null): Promise<string | null> {
  await openVisitCapture(appointmentId, clinicId, actorUserId); // seeds the Consultation draft (idempotent)
  await prisma.serviceEvent.updateMany({
    where: { appointment_id: appointmentId, category: "Consultation", status: "draft" },
    data: { status: "finalized", finalized_at: new Date() },
  });
  const result = await settleInvoiceFromEvents(appointmentId);
  if (result.invoiceId) return result.invoiceId;
  const existing = await prisma.invoice.findFirst({ where: { appointment_id: appointmentId, clinic_id: clinicId }, orderBy: { created_at: "asc" }, select: { id: true } });
  return existing?.id ?? null;
}
