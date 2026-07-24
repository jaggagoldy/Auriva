import { notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import { getClinicPlan } from "@/services/subscription-service";

// BRD-043 US-502 (Sprint 5): the clinic's current plan + live seat usage.
// READ-ONLY (ADR-004) — there is deliberately no PATCH here; a clinic can
// never change its own plan (see the upgrade-request endpoint, which only
// records a request). Owner / Managing Doctor only.
export async function GET() {
  try {
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;
    const plan = await getClinicPlan(auth.clinicId);
    if (!plan) return notFound("Clinic not found.");
    return ok(plan);
  } catch (error) {
    return serverError("Error loading plan", error);
  }
}
