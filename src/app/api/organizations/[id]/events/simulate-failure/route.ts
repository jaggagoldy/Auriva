import { NextRequest } from "next/server";
import { ok, serverError } from "@/api/http";
import { requireOrganizationContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import { simulateFailure } from "@/services/event-log-service";

/**
 * Publishes a synthetic event to a handler that always throws — a
 * developer-facing way to prove the retry/backoff/dead-letter path actually
 * works, without waiting for (or faking) a real business failure.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const event = await simulateFailure(auth.organizationId, auth.session.userId);
    return ok(event, 201);
  } catch (error) {
    return serverError("Error simulating a handler failure", error);
  }
}
