import { describe, expect, it } from "vitest";
import {
  INVOICE_STATUSES,
  canTransitionInvoice,
  isInvoiceStatus,
  isPaymentMethod,
  type InvoiceStatus,
} from "./invoice-status";

// TEST-2: exhaustive over every (from, to) pair, mirroring
// appointment-status.test.ts's approach for this second choke point.
const LEGAL: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["issued", "void"],
  issued: ["paid", "void"],
  paid: [],
  void: [],
};

describe("invoice-status", () => {
  it("isInvoiceStatus recognizes every declared status and rejects garbage", () => {
    for (const status of INVOICE_STATUSES) {
      expect(isInvoiceStatus(status)).toBe(true);
    }
    expect(isInvoiceStatus("refunded")).toBe(false);
  });

  it("never allows a status to transition to itself", () => {
    for (const status of INVOICE_STATUSES) {
      expect(canTransitionInvoice(status, status)).toBe(false);
    }
  });

  for (const from of INVOICE_STATUSES) {
    for (const to of INVOICE_STATUSES) {
      if (from === to) continue;
      const shouldBeLegal = LEGAL[from].includes(to);
      it(`${shouldBeLegal ? "allows" : "rejects"} ${from} -> ${to}`, () => {
        expect(canTransitionInvoice(from, to)).toBe(shouldBeLegal);
      });
    }
  }

  it("paid and void are terminal — no further transition is legal", () => {
    for (const terminal of ["paid", "void"] as const) {
      for (const to of INVOICE_STATUSES) {
        expect(canTransitionInvoice(terminal, to)).toBe(false);
      }
    }
  });

  it("isPaymentMethod recognizes exactly cash/upi/card", () => {
    expect(isPaymentMethod("cash")).toBe(true);
    expect(isPaymentMethod("upi")).toBe(true);
    expect(isPaymentMethod("card")).toBe(true);
    expect(isPaymentMethod("bitcoin")).toBe(false);
  });
});
