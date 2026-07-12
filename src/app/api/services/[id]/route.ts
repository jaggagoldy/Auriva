import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { archiveService, updateService } from "@/services/service-catalog-service";

// Milestone 1: update / archive a single treatment. Product Office matrix:
// Owner + reception/admin staff (reception capability) manage the catalog;
// plain doctors are read-only. The service layer scopes every mutation to the
// caller's clinic, so a treatment id from another clinic 404s.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const { id } = await params;

    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return badRequest("A JSON body is required.");
    }

    const service = await updateService(auth.clinicId, id, {
      name: typeof body.name === "string" ? body.name : undefined,
      durationMinutes:
        typeof body.duration_minutes === "number" ? body.duration_minutes : undefined,
      price: typeof body.price === "number" ? body.price : undefined,
      bufferMinutes:
        body.buffer_minutes === null || typeof body.buffer_minutes === "number"
          ? body.buffer_minutes
          : undefined,
      isActive: typeof body.is_active === "boolean" ? body.is_active : undefined,
      sortOrder: typeof body.sort_order === "number" ? body.sort_order : undefined,
    });
    return ok(service);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating treatment", error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    // Archive (soft) rather than hard-delete — keeps future references intact.
    return ok(await archiveService(auth.clinicId, id));
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error archiving treatment", error);
  }
}
