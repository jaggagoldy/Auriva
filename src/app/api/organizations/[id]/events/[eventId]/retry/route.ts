import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireOrganizationContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import { retryHandler } from "@/services/event-log-service";

/** POST { handler_name }: manually retry one handler, skipping its backoff delay. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const { id, eventId } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    if (!body.handler_name || typeof body.handler_name !== "string") {
      return badRequest("handler_name is required.");
    }

    const event = await retryHandler(eventId, auth.organizationId, body.handler_name);
    return ok(event);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error retrying event handler", error);
  }
}
