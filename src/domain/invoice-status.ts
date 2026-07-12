// Invoice lifecycle (APS-041), enforced once in billing-service — the same
// single-choke-point pattern as appointment-status.ts. Corrections after
// issue are a void + new invoice, never an edit (APS-018 E1).

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "void"];

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["issued", "void"],
  issued: ["paid", "void"],
  paid: [],
  void: [],
};

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as string[]).includes(value);
}

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export type PaymentMethod = "cash" | "upi" | "card";

export function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "upi" || value === "card";
}

export interface InvoiceItem {
  description: string;
  qty: number;
  unit_price: number; // integer INR
  amount: number; // qty * unit_price, integer INR
}
