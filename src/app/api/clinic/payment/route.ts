import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import { collectVisitPayment } from "@/services/consultation-service";
import { isPaymentMethod } from "@/domain/invoice-status";

// Milestone 1 Batch 5: record the money for a visit's invoice, inside /clinic.
// reception-capable; scoped to the caller's clinic (the service verifies the
// invoice belongs to it).
// H4 (observability): correlation-id wrapped — the money half of the pilot's
// core flow; a failed/queried payment must be traceable end to end.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;

      const body = await request.json();
      const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : "";
      const amount = typeof body.amount === "number" ? body.amount : NaN;
      const method = typeof body.method === "string" ? body.method : "";

      if (!invoiceId) return badRequest("invoice_id is required.");
      if (!isPaymentMethod(method)) return badRequest("method must be cash, upi or card.");

      const invoice = await collectVisitPayment({
        invoiceId,
        clinicId: auth.clinicId,
        amount,
        method,
        reference: typeof body.reference === "string" ? body.reference : null,
        actorUserId: auth.session.userId,
      });
      return ok({ success: true, invoice_id: invoice.id, status: invoice.status, total: invoice.total });
    } catch (error) {
      return mapDomainError(error) ?? serverError("Error recording payment", error);
    }
  });
}
