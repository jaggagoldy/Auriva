// M3B B3 — Clinical Document Platform Foundation. Generates permanent, immutable
// clinical artifacts (Documents) from a visit: Invoice, Receipt, Visit Summary.
// Each generation snapshots content_json (never live data), assigns a unified
// number, and versions (regenerate → version+1, prior superseded). A new type =
// a new assembler in CONTENT_ASSEMBLERS + a renderer — no engine change.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  B3_DOCUMENT_TYPES,
  DocumentType,
  TYPE_CATEGORY,
  TYPE_NUMBER_PREFIX,
  isDocumentType,
} from "@/domain/document";

export class DocumentError extends Error {}

// ---- content_json shapes (the immutable snapshot) ---------------------------
interface Branding { clinic_name: string; address: string | null; phone: string | null; logo_url: string | null }
interface Meta { patient_name: string; token: number | null; doctor_name: string | null; appointment_type: string; date: string | null }
export interface DocumentContent {
  branding: Branding;
  meta: Meta;
  body: Record<string, unknown>;
}

async function loadVisitContext(tx: Prisma.TransactionClient, appointmentId: string, clinicId: string) {
  const appt = await tx.appointment.findFirst({
    where: { id: appointmentId, clinic_id: clinicId },
    include: {
      patient: { select: { full_name: true } },
      doctor: { select: { full_name: true } },
      clinic: { select: { name: true, address: true, phone: true, logo_url: true } },
    },
  });
  if (!appt) throw new DocumentError("Visit not found in this clinic.");
  const branding: Branding = {
    clinic_name: appt.clinic.name,
    address: appt.clinic.address,
    phone: appt.clinic.phone,
    logo_url: appt.clinic.logo_url,
  };
  const meta: Meta = {
    patient_name: appt.patient?.full_name ?? "Patient",
    token: appt.queue_number,
    doctor_name: appt.doctor?.full_name ?? null,
    appointment_type: appt.follow_up_source_appointment_id ? "Follow-up" : appt.walk_in ? "Walk-in" : "Appointment",
    date: appt.scheduled_time?.toISOString() ?? null,
  };
  return { appt, branding, meta };
}

type Assembler = (tx: Prisma.TransactionClient, appointmentId: string, clinicId: string) => Promise<DocumentContent | null>;

// A new document type only adds an entry here + a renderer. No engine change.
const CONTENT_ASSEMBLERS: Partial<Record<DocumentType, Assembler>> = {
  invoice: async (tx, appointmentId, clinicId) => {
    const { branding, meta } = await loadVisitContext(tx, appointmentId, clinicId);
    const invoice = await tx.invoice.findFirst({
      where: { appointment_id: appointmentId, clinic_id: clinicId },
      orderBy: { created_at: "asc" },
      include: { lines: { orderBy: { created_at: "asc" } } },
    });
    if (!invoice) return null;
    return {
      branding, meta,
      body: {
        invoice_number: invoice.invoice_number,
        lines: invoice.lines.map((l) => ({ description: l.description, qty: l.qty, unit_price: l.unit_price, amount: l.amount })),
        total: invoice.total,
      },
    };
  },
  receipt: async (tx, appointmentId, clinicId) => {
    const { branding, meta } = await loadVisitContext(tx, appointmentId, clinicId);
    const invoice = await tx.invoice.findFirst({
      where: { appointment_id: appointmentId, clinic_id: clinicId },
      orderBy: { created_at: "asc" },
      include: { payments: { orderBy: { received_at: "asc" } } },
    });
    if (!invoice || invoice.payments.length === 0) return null; // no receipt without a payment
    return {
      branding, meta,
      body: {
        invoice_number: invoice.invoice_number,
        payments: invoice.payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference, received_at: p.received_at.toISOString() })),
        total_paid: invoice.payments.reduce((n, p) => n + p.amount, 0),
      },
    };
  },
  visit_summary: async (tx, appointmentId, clinicId) => {
    const { appt, branding, meta } = await loadVisitContext(tx, appointmentId, clinicId);
    const services = await tx.serviceEvent.findMany({
      where: { appointment_id: appointmentId, kind: "clinical", status: { in: ["finalized"] } },
      orderBy: { added_at: "asc" },
      select: { name: true, category: true },
    });
    let medicines: unknown[] = [];
    try { medicines = appt.prescription_medicines_json ? JSON.parse(appt.prescription_medicines_json) : []; } catch { medicines = []; }
    return {
      branding, meta,
      body: {
        chief_complaint: appt.chief_complaint ?? null,
        diagnosis: appt.diagnosis ?? null,
        medicines,
        services: services.map((s) => ({ name: s.name, category: s.category })),
        advice: appt.prescription_notes ?? null,
        follow_up_date: appt.follow_up_date?.toISOString() ?? null,
      },
    };
  },
};

/** Unified numbering: `${PREFIX}-${year}-${seq}`, per clinic + type + year.
 *  Version-1 rows are one-per-number, so counting them gives the next seq. */
async function nextDocumentNumber(tx: Prisma.TransactionClient, clinicId: string, type: DocumentType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${TYPE_NUMBER_PREFIX[type]}-${year}-`;
  const count = await tx.document.count({ where: { clinic_id: clinicId, type, version: 1, number: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

/**
 * Generate (or regenerate) a document for a visit. Snapshots content_json;
 * regeneration supersedes the prior issued version and increments the version
 * (the number is stable across versions). Returns null if the source isn't
 * ready (e.g. a receipt with no payment yet).
 */
export async function generateDocument(
  type: DocumentType,
  appointmentId: string,
  clinicId: string,
  actorUserId?: string | null
): Promise<{ id: string; number: string; version: number } | null> {
  if (!isDocumentType(type)) throw new DocumentError(`Unknown document type "${type}".`);
  const assembler = CONTENT_ASSEMBLERS[type];
  if (!assembler) throw new DocumentError(`Document type "${type}" is not generatable in B3.`);

  const result = await prisma.$transaction(async (tx) => {
    const content = await assembler(tx, appointmentId, clinicId);
    if (!content) return null;

    const prior = await tx.document.findFirst({
      where: { appointment_id: appointmentId, type, status: "issued" },
      orderBy: { version: "desc" },
    });
    const number = prior ? prior.number : await nextDocumentNumber(tx, clinicId, type);
    const version = prior ? prior.version + 1 : 1;
    if (prior) await tx.document.update({ where: { id: prior.id }, data: { status: "superseded" } });

    const invoice = type === "visit_summary"
      ? null
      : await tx.invoice.findFirst({ where: { appointment_id: appointmentId, clinic_id: clinicId }, orderBy: { created_at: "asc" }, select: { id: true, patient_id: true } });
    const patientId = invoice?.patient_id ?? (await tx.appointment.findUniqueOrThrow({ where: { id: appointmentId }, select: { patient_id: true } })).patient_id;

    const doc = await tx.document.create({
      data: {
        clinic_id: clinicId,
        patient_id: patientId,
        appointment_id: appointmentId,
        invoice_id: invoice?.id ?? null,
        type,
        category: TYPE_CATEGORY[type],
        number,
        version,
        status: "issued",
        content_json: JSON.stringify(content),
        generated_by_user_id: actorUserId ?? null,
      },
      select: { id: true, number: true, version: true },
    });
    return doc;
  });

  if (result) {
    await recordAudit({
      organizationId: (await prisma.clinic.findUnique({ where: { id: clinicId }, select: { organization_id: true } }))?.organization_id ?? null,
      actorUserId,
      action: "document_generated",
      detail: `${type} ${result.number} v${result.version}`,
    });
  }
  return result;
}

/** Idempotently ensure the visit's B3 documents exist (generate missing ones).
 *  Safe to call on checkout completion and on view. */
export async function ensureVisitDocuments(appointmentId: string, clinicId: string, actorUserId?: string | null) {
  for (const type of B3_DOCUMENT_TYPES) {
    const existing = await prisma.document.findFirst({ where: { appointment_id: appointmentId, type, status: "issued" } });
    if (!existing) await generateDocument(type, appointmentId, clinicId, actorUserId);
  }
  return getVisitDocuments(appointmentId, clinicId);
}

/** Regenerate a type (new version). */
export async function regenerateDocument(appointmentId: string, clinicId: string, type: string, actorUserId?: string | null) {
  if (!isDocumentType(type)) throw new DocumentError("Unknown document type.");
  await generateDocument(type, appointmentId, clinicId, actorUserId);
  return getVisitDocuments(appointmentId, clinicId);
}

/** The visit's Clinical Artifacts — current issued documents grouped by category. */
export async function getVisitDocuments(appointmentId: string, clinicId: string) {
  const docs = await prisma.document.findMany({
    where: { appointment_id: appointmentId, clinic_id: clinicId, status: "issued" },
    orderBy: [{ category: "asc" }, { type: "asc" }],
    select: { id: true, type: true, category: true, number: true, version: true, generated_at: true },
  });
  return docs.map((d) => ({
    id: d.id,
    type: d.type,
    category: d.category,
    number: d.number,
    version: d.version,
    generated_at: d.generated_at.toISOString(),
  }));
}

/** Resolve an invoice to its (ensured) invoice Document — for repointing legacy
 *  invoice print at the Document Platform (S1 Batch B). */
export async function getInvoiceDocument(invoiceId: string, clinicId: string): Promise<{ id: string } | null> {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, clinic_id: clinicId }, select: { appointment_id: true } });
  if (!invoice?.appointment_id) return null;
  await ensureVisitDocuments(invoice.appointment_id, clinicId);
  return prisma.document.findFirst({
    where: { appointment_id: invoice.appointment_id, type: "invoice", status: "issued" },
    select: { id: true },
  });
}

/** One document with its immutable snapshot + metadata (for the viewer/print). */
export async function getDocument(id: string, clinicId: string) {
  const doc = await prisma.document.findFirst({ where: { id, clinic_id: clinicId } });
  if (!doc) throw new DocumentError("Document not found in this clinic.");
  const generatedBy = doc.generated_by_user_id
    ? await prisma.staffProfile.findFirst({ where: { user_id: doc.generated_by_user_id }, select: { full_name: true } })
    : null;
  // Prior version (for "supersedes vX")
  const prior = doc.version > 1
    ? await prisma.document.findFirst({ where: { appointment_id: doc.appointment_id, type: doc.type, version: doc.version - 1 }, select: { version: true } })
    : null;
  return {
    id: doc.id,
    type: doc.type,
    category: doc.category,
    number: doc.number,
    version: doc.version,
    status: doc.status,
    generated_at: doc.generated_at.toISOString(),
    generated_by: generatedBy?.full_name ?? null,
    supersedes_version: prior?.version ?? null,
    content: JSON.parse(doc.content_json) as DocumentContent,
  };
}
