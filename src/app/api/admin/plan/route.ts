import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requirePlatformAdminContext } from "@/api/session";
import { setOrganizationPlan } from "@/services/subscription-service";

// BRD-043 US-505 (Sprint 5): the Auriva-internal plan toggle — the ONLY path
// that mutates Organization.plan (ADR-004). Gated by is_platform_admin, which
// no clinic-facing signup/invite flow ever sets, so a clinic Owner session
// (super_admin) can never reach this. Explicitly OUTSIDE the /clinic shell.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    if (!body.organization_id || !body.plan) {
      return badRequest("organization_id and plan are required.");
    }
    const updated = await setOrganizationPlan({
      organizationId: String(body.organization_id),
      plan: String(body.plan),
      actorUserId: auth.session.userId,
    });
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating plan", error);
  }
}
