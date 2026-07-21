import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import { canAccessAdminPortal } from "@/domain/authorization";
import { CorrectionError, getInvoiceCorrections, issueCreditNote, issueRefund } from "@/services/corrections-service";

// M3B B5 — Financial Corrections. OWNER-authorized (canAccessAdminPortal):
// credit notes and refunds change the financial record, so they require the
// practice owner, not front-desk reception.
//   GET  ?invoice_id=  → correction history (credit notes + refunds)
//   POST { action:"credit_note", invoice_id, amount, reason }
//   POST { action:"refund",      credit_note_id, amount, method, reference? }
function mapErr(error: unknown) {
  if (error instanceof CorrectionError) return /not found/i.test(error.message) ? notFound(error.message) : badRequest(error.message);
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception"); // viewing history is reception-visible
    if (!auth.ok) return auth.response;
    const invoiceId = new URL(request.url).searchParams.get("invoice_id") ?? "";
    if (!invoiceId) return badRequest("invoice_id is required.");
    return ok(await getInvoiceCorrections(invoiceId, auth.clinicId));
  } catch (error) {
    return mapErr(error) ?? serverError("Error loading corrections", error);
  }
}

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;
      if (!canAccessAdminPortal(auth.session.role)) {
        return forbidden("Credit notes and refunds require the practice owner.");
      }
      const body = await request.json();

      if (body.action === "credit_note") {
        const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";
        if (!invoiceId || typeof body.amount !== "number") return badRequest("invoice_id and amount are required.");
        return ok(await issueCreditNote(invoiceId, auth.clinicId, auth.session.userId, body.amount, String(body.reason ?? "")));
      }
      if (body.action === "refund") {
        const creditNoteId = typeof body.credit_note_id === "string" ? body.credit_note_id : "";
        if (!creditNoteId || typeof body.amount !== "number") return badRequest("credit_note_id and amount are required.");
        return ok(await issueRefund(creditNoteId, auth.clinicId, auth.session.userId, body.amount, String(body.method ?? ""), typeof body.reference === "string" ? body.reference : null));
      }
      return badRequest("Unknown action.");
    } catch (error) {
      return mapErr(error) ?? serverError("Error creating correction", error);
    }
  });
}
