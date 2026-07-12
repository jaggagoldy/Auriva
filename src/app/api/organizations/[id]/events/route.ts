import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireOrganizationContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import { listEvents, replayEvent } from "@/services/event-log-service";

// Developer Event Hub (Epic C: Shared Event Platform). Org-scoped like every
// other /api/organizations/[id]/* route — an org can only see and replay its
// own events.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("event_type");
    const status = searchParams.get("status");
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const events = await listEvents({
      organizationId: auth.organizationId,
      eventType,
      status,
      limit,
    });
    return ok(events);
  } catch (error) {
    return serverError("Error listing events", error);
  }
}

/** POST { event_log_id }: replay an event to every currently-registered subscriber. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    if (!body.event_log_id || typeof body.event_log_id !== "string") {
      return badRequest("event_log_id is required.");
    }

    const event = await replayEvent(body.event_log_id, auth.organizationId);
    return ok(event);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error replaying event", error);
  }
}
