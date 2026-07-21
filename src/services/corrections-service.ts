// M3B B5 — Financial Corrections Framework. A paid invoice is IMMUTABLE. We
// never edit or delete it; we create COMPENSATING artifacts:
//   • CreditNote — reduces the receivable against the original invoice
//   • Refund     — money physically returned against a credit note
// Both are also persisted as Documents (credit_note / refund_receipt) via the
// B3 platform, so they print/download like any other artifact. Amount guards
// keep the ledger sane; nothing here mutates the Invoice. Owner-authorized at
// the API boundary.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { isPaymentMethod } from "@/domain/invoice-status";
import { DocumentType, TYPE_CATEGORY, TYPE_NUMBER_PREFIX } from "@/domain/document";

export class CorrectionError extends Error {}

async function orgId(clinicId: string) {
  return (await prisma.clinic.findUnique({ where: { id: clinicId }, select: { organization_id: true } }))?.organization_id ?? null;
}

async function nextNumber(tx: Prisma.TransactionClient, clinicId: string, type: DocumentType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${TYPE_NUMBER_PREFIX[type]}-${year}-`;
  const count = await tx.document.count({ where: { clinic_id: clinicId, type, number: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

// Build the immutable Document snapshot for a correction artifact.
async function createCorrectionDocument(
  tx: Prisma.TransactionClient,
  input: { clinicId: string; patientId: string; invoiceId: string; type: DocumentType; number: string; body: Record<string, unknown>; actorUserId?: string | null }
) {
  const [clinic, patient] = await Promise.all([
    tx.clinic.findUnique({ where: { id: input.clinicId }, select: { name: true, address: true, phone: true, logo_url: true } }),
    tx.patientProfile.findUnique({ where: { id: input.patientId }, select: { full_name: true } }),
  ]);
  const content = {
    branding: { clinic_name: clinic?.name ?? "Clinic", address: clinic?.address ?? null, phone: clinic?.phone ?? null, logo_url: clinic?.logo_url ?? null },
    meta: { patient_name: patient?.full_name ?? "Patient", token: null, doctor_name: null, appointment_type: "Correction", date: new Date().toISOString() },
    body: input.body,
  };
  await tx.document.create({
    data: {
      clinic_id: input.clinicId, patient_id: input.patientId, invoice_id: input.invoiceId,
      type: input.type, category: TYPE_CATEGORY[input.type], number: input.number, version: 1, status: "issued",
      content_json: JSON.stringify(content), generated_by_user_id: input.actorUserId ?? null,
    },
  });
}

/** Issue a credit note against a paid invoice (immutable). Amount ≤ the
 *  invoice total minus what's already credited. Reason required. */
export async function issueCreditNote(invoiceId: string, clinicId: string, actorUserId: string | null | undefined, amount: number, reason: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw new CorrectionError("Credit amount must be a positive whole number.");
  if (!reason?.trim()) throw new CorrectionError("A reason is required for a credit note.");

  const cn = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, clinic_id: clinicId },
      include: { payments: true, creditNotes: true },
    });
    if (!invoice) throw new CorrectionError("Invoice not found in this clinic.");
    const collected = invoice.payments.reduce((n, p) => n + p.amount, 0);
    if (collected <= 0) throw new CorrectionError("Only a paid invoice can be credited — use Concession before payment instead.");
    const alreadyCredited = invoice.creditNotes.filter((c) => c.status !== "void").reduce((n, c) => n + c.amount, 0);
    if (amount > invoice.total - alreadyCredited) {
      throw new CorrectionError(`Credit exceeds the invoice: ₹${invoice.total - alreadyCredited} creditable.`);
    }

    const number = await nextNumber(tx, clinicId, "credit_note");
    const created = await tx.creditNote.create({
      data: { clinic_id: clinicId, patient_id: invoice.patient_id, invoice_id: invoice.id, number, amount, reason: reason.trim(), status: "issued", created_by_user_id: actorUserId ?? null },
    });
    await createCorrectionDocument(tx, {
      clinicId, patientId: invoice.patient_id, invoiceId: invoice.id, type: "credit_note", number,
      body: { credit_note_number: number, original_invoice: invoice.invoice_number, amount, reason: reason.trim() }, actorUserId,
    });
    return created;
  });

  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "credit_note_issued", detail: `${cn.number} ₹${amount} (invoice ${invoiceId})` });
  return cn;
}

/** Record a refund against a credit note. Amount ≤ the credit note minus what's
 *  already refunded. When fully refunded, the credit note is marked refunded. */
export async function issueRefund(creditNoteId: string, clinicId: string, actorUserId: string | null | undefined, amount: number, method: string, reference?: string | null) {
  if (!Number.isInteger(amount) || amount <= 0) throw new CorrectionError("Refund amount must be a positive whole number.");
  if (!isPaymentMethod(method)) throw new CorrectionError("Refund method must be cash, upi or card.");

  const refund = await prisma.$transaction(async (tx) => {
    const cn = await tx.creditNote.findFirst({ where: { id: creditNoteId, clinic_id: clinicId }, include: { refunds: true } });
    if (!cn) throw new CorrectionError("Credit note not found in this clinic.");
    const refunded = cn.refunds.reduce((n, r) => n + r.amount, 0);
    if (amount > cn.amount - refunded) throw new CorrectionError(`Refund exceeds the credit note: ₹${cn.amount - refunded} refundable.`);

    const number = await nextNumber(tx, clinicId, "refund_receipt");
    const created = await tx.refund.create({
      data: { clinic_id: clinicId, credit_note_id: cn.id, amount, method, reference: reference ?? null, created_by_user_id: actorUserId ?? null },
    });
    if (refunded + amount >= cn.amount) await tx.creditNote.update({ where: { id: cn.id }, data: { status: "refunded" } });
    await createCorrectionDocument(tx, {
      clinicId, patientId: cn.patient_id, invoiceId: cn.invoice_id, type: "refund_receipt", number,
      body: { refund_number: number, credit_note_number: cn.number, amount, method, reference: reference ?? null }, actorUserId,
    });
    return created;
  });

  await recordAudit({ organizationId: await orgId(clinicId), actorUserId, action: "refund_issued", detail: `₹${amount} ${method} (credit note ${creditNoteId})` });
  return refund;
}

/** Correction history for an invoice — credit notes with their refunds. */
export async function getInvoiceCorrections(invoiceId: string, clinicId: string) {
  const creditNotes = await prisma.creditNote.findMany({
    where: { invoice_id: invoiceId, clinic_id: clinicId },
    orderBy: { created_at: "asc" },
    include: { refunds: { orderBy: { created_at: "asc" } } },
  });
  return creditNotes.map((c) => ({
    id: c.id,
    number: c.number,
    amount: c.amount,
    reason: c.reason,
    status: c.status,
    created_at: c.created_at.toISOString(),
    refunded: c.refunds.reduce((n, r) => n + r.amount, 0),
    refunds: c.refunds.map((r) => ({ id: r.id, amount: r.amount, method: r.method, reference: r.reference, created_at: r.created_at.toISOString() })),
  }));
}
