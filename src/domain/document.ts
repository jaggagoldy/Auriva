// M3B B3 — Clinical Document Platform: the document taxonomy. Pure domain (no
// Prisma/Next). B3 implements visit_summary / invoice / receipt; the rest are
// declared so the platform grows by adding a type + renderer + assembler — no
// model change. `category`/`status` carry reserved future values.

// Types the platform will hold. B3 GENERATES only the first three; the others
// are reserved (Clinical Documentation Platform / future).
export const DOCUMENT_TYPES = [
  "visit_summary",
  "invoice",
  "receipt",
  // M3B B5 — financial corrections:
  "credit_note",
  "refund_receipt",
  // reserved (not generated in B3):
  "prescription",
  "medical_certificate",
  "referral",
  "lab_request",
  "radiology_request",
  "procedure_notes",
  "consent",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// The three B3 generates.
export const B3_DOCUMENT_TYPES: DocumentType[] = ["invoice", "receipt", "visit_summary"];

export const DOCUMENT_CATEGORIES = ["Financial", "Clinical", "Diagnostic", "Administrative"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

// draft is RESERVED (future drafted certificates/referrals); B3 only issues.
export const DOCUMENT_STATUSES = ["draft", "issued", "superseded", "void"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Which category a type belongs to. */
export const TYPE_CATEGORY: Record<DocumentType, DocumentCategory> = {
  invoice: "Financial",
  receipt: "Financial",
  credit_note: "Financial",
  refund_receipt: "Financial",
  visit_summary: "Clinical",
  prescription: "Clinical",
  medical_certificate: "Clinical",
  referral: "Clinical",
  procedure_notes: "Clinical",
  consent: "Administrative",
  lab_request: "Diagnostic",
  radiology_request: "Diagnostic",
};

/** Unified numbering prefix per type — one extensible strategy, not per-type
 *  hardcoding: `${PREFIX}-${year}-${seq}`. */
export const TYPE_NUMBER_PREFIX: Record<DocumentType, string> = {
  invoice: "INV",
  receipt: "RCPT",
  credit_note: "CN",
  refund_receipt: "RFND",
  visit_summary: "VS",
  prescription: "RX",
  medical_certificate: "CERT",
  referral: "REF",
  lab_request: "LAB",
  radiology_request: "RAD",
  procedure_notes: "PN",
  consent: "CNST",
};

export const TYPE_LABEL: Record<DocumentType, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  credit_note: "Credit Note",
  refund_receipt: "Refund Receipt",
  visit_summary: "Visit Summary",
  prescription: "Prescription",
  medical_certificate: "Medical Certificate",
  referral: "Referral Letter",
  lab_request: "Lab Request",
  radiology_request: "Radiology Request",
  procedure_notes: "Procedure Notes",
  consent: "Consent Form",
};

export function isDocumentType(v: string): v is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(v);
}
export function isDocumentCategory(v: string): v is DocumentCategory {
  return (DOCUMENT_CATEGORIES as readonly string[]).includes(v);
}
export function isDocumentStatus(v: string): v is DocumentStatus {
  return (DOCUMENT_STATUSES as readonly string[]).includes(v);
}
