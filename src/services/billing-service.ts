// Billing (APS-041): the cash ledger's single choke point. Invoice status
// changes and payment recording happen only here, mirroring the
// appointment-service pattern. Amounts are integer INR.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  canTransitionInvoice,
} from "@/domain/invoice-status";
import { publishEvent } from "@/lib/events";

export class InvoiceNotFoundError extends Error {}
export class InvalidInvoiceTransitionError extends Error {}
export class InvalidPaymentError extends Error {}

const INVOICE_INCLUDE = {
  patient: { select: { id: true, full_name: true } },
  appointment: { select: { id: true, scheduled_time: true, doctor_id: true } },
  payments: { orderBy: { received_at: "asc" as const } },
} satisfies Prisma.InvoiceInclude;

const DEFAULT_CONSULT_FEE = 500; // INR — used when the doctor has no fee set

function sumItems(items: InvoiceItem[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

/** Next sequential invoice number for a clinic: INV-<year>-<n>. */
async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  clinicId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await tx.invoice.count({
    where: { clinic_id: clinicId, invoice_number: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

/**
 * Sprint 3 (OPS-001): the fee fallback chain — a specific fee always beats a
 * general one. For a follow-up visit (auto-scheduled from a prior visit's
 * follow-up date, Sprint 2): doctor's follow_up_fee, else the same chain as
 * an ordinary consultation. For an ordinary visit: doctor's consultation_fee
 * → department's default_consultation_fee → clinic's
 * default_consultation_fee → the global constant. Nothing here is a
 * separate "fee table" — every link is a field that already exists on its
 * natural owner.
 */
async function resolveConsultationFee(
  tx: Prisma.TransactionClient,
  input: { doctorId: string; isFollowUp: boolean }
): Promise<{ fee: number; doctorName: string }> {
  const doctor = await tx.staffProfile.findUnique({
    where: { id: input.doctorId },
    select: {
      full_name: true,
      consultation_fee: true,
      follow_up_fee: true,
      clinic_id: true,
      department_id: true,
    },
  });
  const doctorName = doctor?.full_name ?? "Doctor";

  if (input.isFollowUp && doctor?.follow_up_fee != null) {
    return { fee: doctor.follow_up_fee, doctorName };
  }
  if (doctor?.consultation_fee != null) {
    return { fee: doctor.consultation_fee, doctorName };
  }

  const department = doctor?.department_id
    ? await tx.department.findUnique({
        where: { id: doctor.department_id },
        select: { default_consultation_fee: true },
      })
    : null;
  if (department?.default_consultation_fee != null) {
    return { fee: department.default_consultation_fee, doctorName };
  }

  const clinic = doctor?.clinic_id
    ? await tx.clinic.findUnique({ where: { id: doctor.clinic_id }, select: { default_consultation_fee: true } })
    : null;
  if (clinic?.default_consultation_fee != null) {
    return { fee: clinic.default_consultation_fee, doctorName };
  }

  return { fee: DEFAULT_CONSULT_FEE, doctorName };
}

/**
 * Auto-drafts the visit invoice when a consultation completes (WF-17: charges
 * assemble from the encounter). Runs inside the caller's transaction so the
 * status change and its invoice commit together. Idempotent per appointment
 * (the schema's unique appointment link).
 */
export async function draftInvoiceForAppointment(
  tx: Prisma.TransactionClient,
  appointment: {
    id: string;
    clinic_id: string;
    patient_id: string;
    doctor_id: string;
    follow_up_source_appointment_id?: string | null;
  }
) {
  const existing = await tx.invoice.findUnique({
    where: { appointment_id: appointment.id },
  });
  if (existing) return existing;

  const { fee, doctorName } = await resolveConsultationFee(tx, {
    doctorId: appointment.doctor_id,
    isFollowUp: Boolean(appointment.follow_up_source_appointment_id),
  });
  const items: InvoiceItem[] = [
    {
      description: `${appointment.follow_up_source_appointment_id ? "Follow-up consultation" : "Consultation"} — ${doctorName}`,
      qty: 1,
      unit_price: fee,
      amount: fee,
    },
  ];

  return tx.invoice.create({
    data: {
      invoice_number: await nextInvoiceNumber(tx, appointment.clinic_id),
      clinic_id: appointment.clinic_id,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      status: "draft",
      items_json: JSON.stringify(items),
      total: sumItems(items),
    },
  });
}

export interface InvoiceSearchFilters {
  clinicId: string;
  status?: string | null;
  patientId?: string | null;
  today?: boolean;
}

export function listInvoices(filters: InvoiceSearchFilters) {
  const where: Prisma.InvoiceWhereInput = { clinic_id: filters.clinicId };
  if (filters.status) where.status = filters.status;
  if (filters.patientId) where.patient_id = filters.patientId;
  if (filters.today) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.created_at = { gte: start };
  }
  return prisma.invoice.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: INVOICE_INCLUDE,
  });
}

/**
 * Sprint 2: a patient's own invoices across every clinic they've visited —
 * no clinic scoping, because "see your own bill" is the patient's own
 * record, not something an organization can wall off (APS-029 Part I A8).
 */
export function listInvoicesForPatient(patientId: string) {
  return prisma.invoice.findMany({
    where: { patient_id: patientId },
    orderBy: { created_at: "desc" },
    include: INVOICE_INCLUDE,
  });
}

export function getInvoice(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: INVOICE_INCLUDE,
  });
}

/** Manual invoice (front-desk billing without an appointment link). */
export async function createInvoice(input: {
  clinicId: string;
  patientId: string;
  items: InvoiceItem[];
}) {
  if (!input.items.length) {
    throw new InvalidPaymentError("An invoice needs at least one line item.");
  }
  return prisma.$transaction(async (tx) =>
    tx.invoice.create({
      data: {
        invoice_number: await nextInvoiceNumber(tx, input.clinicId),
        clinic_id: input.clinicId,
        patient_id: input.patientId,
        status: "draft",
        items_json: JSON.stringify(input.items),
        total: sumItems(input.items),
      },
      include: INVOICE_INCLUDE,
    })
  );
}

/**
 * Sprint 2: adds one line item (a lab charge, a procedure charge, or a
 * discount — modeled as a negative unit_price) to a still-draft invoice.
 * `amount` is always computed server-side from qty*unit_price, never
 * trusted from the caller. Only legal while draft — once issued, a
 * correction is a void + new invoice (APS-018 E1), never an edit, same rule
 * transitionInvoice already enforces for status.
 */
export async function addInvoiceItem(
  invoiceId: string,
  clinicId: string,
  item: { description: string; qty: number; unit_price: number }
) {
  if (!item.description.trim() || !Number.isFinite(item.qty) || item.qty <= 0 || !Number.isFinite(item.unit_price)) {
    throw new InvalidPaymentError("A line item needs a description, a positive quantity, and a unit price.");
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, clinic_id: clinicId } });
    if (!invoice) throw new InvoiceNotFoundError(`Invoice ${invoiceId} not found.`);
    if (invoice.status !== "draft") {
      throw new InvalidInvoiceTransitionError(
        `Cannot add a line item to a "${invoice.status}" invoice — issue a correction as a new invoice instead.`
      );
    }

    const items: InvoiceItem[] = JSON.parse(invoice.items_json);
    const amount = item.qty * item.unit_price;
    const nextItems: InvoiceItem[] = [...items, { description: item.description.trim(), qty: item.qty, unit_price: item.unit_price, amount }];
    const total = sumItems(nextItems);
    if (total < 0) {
      throw new InvalidPaymentError("An invoice's total cannot go below zero — reduce the discount.");
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { items_json: JSON.stringify(nextItems), total },
      include: INVOICE_INCLUDE,
    });
  });
}

/**
 * Milestone 1 Batch 5: replaces a DRAFT invoice's line items wholesale — used
 * by the solo consultation flow to set the visit's charge to the chosen
 * Treatment (name + price) instead of the generic consultation-fee line that
 * transitionStatus auto-drafts on completion. Draft-only (same rule as
 * addInvoiceItem: once issued, a correction is a void + new invoice, never an
 * edit). Total is recomputed server-side, never trusted from the caller.
 */
export async function setDraftInvoiceItems(
  invoiceId: string,
  clinicId: string,
  items: InvoiceItem[]
) {
  if (!items.length) {
    throw new InvalidPaymentError("An invoice needs at least one line item.");
  }
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, clinic_id: clinicId } });
    if (!invoice) throw new InvoiceNotFoundError(`Invoice ${invoiceId} not found.`);
    if (invoice.status !== "draft") {
      throw new InvalidInvoiceTransitionError(
        `Cannot change the charges on a "${invoice.status}" invoice — issue a correction as a new invoice instead.`
      );
    }
    const total = sumItems(items);
    if (total < 0) {
      throw new InvalidPaymentError("An invoice's total cannot be negative.");
    }
    return tx.invoice.update({
      where: { id: invoiceId },
      data: { items_json: JSON.stringify(items), total },
      include: INVOICE_INCLUDE,
    });
  });
}

/** Status changes (issue / void) — the only legal path between states. */
export async function transitionInvoice(
  invoiceId: string,
  clinicId: string,
  nextStatus: Extract<InvoiceStatus, "issued" | "void">
) {
  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, clinic_id: clinicId },
    });
    if (!invoice) throw new InvoiceNotFoundError(`Invoice ${invoiceId} not found.`);

    const from = invoice.status as InvoiceStatus;
    if (!canTransitionInvoice(from, nextStatus)) {
      throw new InvalidInvoiceTransitionError(
        `Cannot move an invoice from "${from}" to "${nextStatus}".`
      );
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: nextStatus,
        ...(nextStatus === "issued" ? { issued_at: new Date() } : {}),
        ...(nextStatus === "void" ? { voided_at: new Date() } : {}),
      },
      include: INVOICE_INCLUDE,
    });
  });

  // PAT-1: notification trigger. Additive — transitionInvoice's own
  // behavior/return value is unchanged; this only adds an event emission
  // this lifecycle point never had before.
  if (nextStatus === "issued") {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { organization_id: true },
    });
    if (clinic) {
      await publishEvent({
        eventType: "invoice.issued",
        organizationId: clinic.organization_id,
        entityId: updated.id,
        correlationId: updated.appointment?.id ?? updated.id,
        payload: { invoiceId: updated.id },
      });
    }
  }

  return updated;
}

/**
 * Records a payment; the invoice becomes `paid` when payments cover the
 * total. Draft invoices are issued implicitly on first payment (the walk-up
 * "consult ends, patient pays at the desk" path must be one action).
 */
export async function recordPayment(input: {
  invoiceId: string;
  clinicId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  receivedByUserId?: string | null;
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new InvalidPaymentError("Payment amount must be a positive integer (INR).");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, clinic_id: input.clinicId },
      include: { payments: true },
    });
    if (!invoice) throw new InvoiceNotFoundError(`Invoice ${input.invoiceId} not found.`);
    if (invoice.status === "void" || invoice.status === "paid") {
      throw new InvalidPaymentError(`Cannot record a payment on a ${invoice.status} invoice.`);
    }

    const alreadyPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    if (alreadyPaid + input.amount > invoice.total) {
      throw new InvalidPaymentError(
        `Payment exceeds balance: ₹${invoice.total - alreadyPaid} due.`
      );
    }

    await tx.payment.create({
      data: {
        invoice_id: invoice.id,
        clinic_id: input.clinicId,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? null,
        received_by_user_id: input.receivedByUserId ?? null,
      },
    });

    const covered = alreadyPaid + input.amount >= invoice.total;
    return tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: covered ? "paid" : "issued",
        issued_at: invoice.issued_at ?? new Date(),
        ...(covered ? { paid_at: new Date() } : {}),
      },
      include: INVOICE_INCLUDE,
    });
  });

  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
    select: { organization_id: true },
  });
  if (clinic) {
    await publishEvent({
      eventType: "payment.received",
      organizationId: clinic.organization_id,
      entityId: updated.id,
      correlationId: updated.appointment?.id ?? updated.id,
      actorId: input.receivedByUserId,
      payload: { invoiceId: updated.id, amount: input.amount, method: input.method },
    });
  }

  return updated;
}

/** Today's money for the Command Center: collected, outstanding, counts. */
export async function billingDaySummary(clinicId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [payments, openInvoices] = await Promise.all([
    prisma.payment.aggregate({
      where: { clinic_id: clinicId, received_at: { gte: start } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.invoice.findMany({
      where: { clinic_id: clinicId, status: { in: ["draft", "issued"] } },
      select: { total: true, payments: { select: { amount: true } } },
    }),
  ]);

  const outstanding = openInvoices.reduce(
    (sum, inv) => sum + inv.total - inv.payments.reduce((s, p) => s + p.amount, 0),
    0
  );

  return {
    collected_today: payments._sum.amount ?? 0,
    payments_today: payments._count,
    outstanding_total: outstanding,
    open_invoices: openInvoices.length,
  };
}
