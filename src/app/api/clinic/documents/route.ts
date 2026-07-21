import { NextRequest } from "next/server";
import { badRequest, mapDomainError, notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import {
  DocumentError,
  ensureVisitDocuments,
  getDocument,
  getInvoiceDocument,
  regenerateDocument,
} from "@/services/document-service";

// M3B B3 — Clinical Document Platform. Scoped to the caller's clinic.
//   GET ?appointment_id=  → the visit's Clinical Artifacts (ensures the set exists)
//   GET ?id=              → one document (immutable snapshot + metadata)
//   POST { action:"regenerate", appointment_id, type }  → new version
function mapDocError(error: unknown) {
  if (error instanceof DocumentError) return /not found/i.test(error.message) ? notFound(error.message) : badRequest(error.message);
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const appointmentId = url.searchParams.get("appointment_id");
    const invoiceId = url.searchParams.get("invoice_id");
    if (id) return ok(await getDocument(id, auth.clinicId));
    if (appointmentId) return ok(await ensureVisitDocuments(appointmentId, auth.clinicId, auth.session.userId));
    if (invoiceId) {
      const doc = await getInvoiceDocument(invoiceId, auth.clinicId);
      return doc ? ok(doc) : notFound("No invoice document for this invoice.");
    }
    return badRequest("id, appointment_id or invoice_id is required.");
  } catch (error) {
    return mapDocError(error) ?? mapDomainError(error) ?? serverError("Error loading documents", error);
  }
}

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;
      const body = await request.json();
      if (body.action === "regenerate") {
        const appointmentId = typeof body.appointment_id === "string" ? body.appointment_id : "";
        const type = typeof body.type === "string" ? body.type : "";
        if (!appointmentId || !type) return badRequest("appointment_id and type are required.");
        return ok(await regenerateDocument(appointmentId, auth.clinicId, type, auth.session.userId));
      }
      return badRequest("Unknown action.");
    } catch (error) {
      return mapDocError(error) ?? serverError("Error generating document", error);
    }
  });
}
