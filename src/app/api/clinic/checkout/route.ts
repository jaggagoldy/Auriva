import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import { isPaymentMethod } from "@/domain/invoice-status";
import {
  CheckoutError,
  CheckoutPermissionError,
  addFinancialCharge,
  applyConcession,
  getCheckout,
  recordCheckoutPayment,
  removeCheckoutCharge,
  removeConcession,
  setCheckoutNotes,
} from "@/services/checkout-service";

// M3B B2 — the Reception Checkout Workspace API. Scoped to the caller's clinic.
//   GET  ?invoice_id=                                   → checkout view model
//   POST { action:"add_charge",  invoice_id, service_id? | {name,category,unit_price}, qty? }
//   POST { action:"concession",  invoice_id, amount, reason }
//   POST { action:"remove_concession", invoice_id }
//   POST { action:"remove_charge",     line_id }
//   POST { action:"notes",       invoice_id, notes }
//   POST { action:"pay",         invoice_id, amount, method, reference? }
// Every mutation returns the refreshed view (server truth on money).

function mapCheckoutError(error: unknown) {
  if (error instanceof CheckoutPermissionError) return forbidden(error.message);
  if (error instanceof CheckoutError) {
    return /not found/i.test(error.message) ? notFound(error.message) : badRequest(error.message);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const invoiceId = new URL(request.url).searchParams.get("invoice_id") ?? "";
    if (!invoiceId) return badRequest("invoice_id is required.");
    return ok(await getCheckout(invoiceId, auth.clinicId));
  } catch (error) {
    return mapCheckoutError(error) ?? serverError("Error loading checkout", error);
  }
}

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const actorUserId = auth.session.userId;
      const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";

      switch (body.action) {
        case "add_charge": {
          if (!invoiceId) return badRequest("invoice_id is required.");
          return ok(
            await addFinancialCharge(invoiceId, auth.clinicId, actorUserId, {
              serviceId: typeof body.service_id === "string" ? body.service_id : null,
              name: typeof body.name === "string" ? body.name : undefined,
              category: typeof body.category === "string" ? body.category : undefined,
              unitPrice: typeof body.unit_price === "number" ? body.unit_price : undefined,
              qty: typeof body.qty === "number" ? body.qty : undefined,
            })
          );
        }
        case "concession": {
          if (!invoiceId) return badRequest("invoice_id is required.");
          if (typeof body.amount !== "number") return badRequest("amount is required.");
          return ok(await applyConcession(invoiceId, auth.clinicId, actorUserId, body.amount, String(body.reason ?? "")));
        }
        case "remove_concession": {
          if (!invoiceId) return badRequest("invoice_id is required.");
          return ok(await removeConcession(invoiceId, auth.clinicId, actorUserId));
        }
        case "remove_charge": {
          const lineId = typeof body.line_id === "string" ? body.line_id : "";
          if (!lineId) return badRequest("line_id is required.");
          return ok(await removeCheckoutCharge(lineId, auth.clinicId, actorUserId));
        }
        case "notes": {
          if (!invoiceId) return badRequest("invoice_id is required.");
          return ok(await setCheckoutNotes(invoiceId, auth.clinicId, String(body.notes ?? ""), actorUserId));
        }
        case "pay": {
          if (!invoiceId) return badRequest("invoice_id is required.");
          if (typeof body.amount !== "number") return badRequest("amount is required.");
          if (!isPaymentMethod(String(body.method))) return badRequest("method must be cash, upi or card.");
          return ok(
            await recordCheckoutPayment({
              invoiceId,
              clinicId: auth.clinicId,
              amount: body.amount,
              method: body.method,
              reference: typeof body.reference === "string" ? body.reference : null,
              actorUserId,
            })
          );
        }
        default:
          return badRequest("Unknown action.");
      }
    } catch (error) {
      return mapCheckoutError(error) ?? serverError("Error in checkout", error);
    }
  });
}
