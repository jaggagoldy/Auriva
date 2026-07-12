import { NextRequest } from "next/server";
import { requirePlatformAdminContext } from "@/api/session";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { transitionReleaseStatus } from "@/services/release-service";

/** The single choke-point for Release workflow transitions (Draft ->
 * Internal QA -> Ready for Review -> Approved -> Published -> Archived —
 * see src/domain/release-status.ts). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    if (!body?.status || typeof body.status !== "string") {
      return badRequest("A target status is required.");
    }

    const release = await transitionReleaseStatus(id, body.status);
    return ok(release);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error transitioning release status", error);
  }
}
