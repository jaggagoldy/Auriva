import { ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { getPlansForPatientApp } from "@/services/treatment-plan-service";

// C2 — the patient's own treatment plans (read-only), scoped to their active
// healthcare profile.
export async function GET() {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;
    return ok(await getPlansForPatientApp(auth.healthcareProfileId));
  } catch (error) {
    return serverError("Error loading treatment plans", error);
  }
}
