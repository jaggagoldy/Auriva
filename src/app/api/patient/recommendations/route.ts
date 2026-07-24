import { ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { listRecommendationsForPatient } from "@/services/test-recommendation-service";

// P5 Health Vault — the active profile's recommended diagnostic tests.
export async function GET() {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;
    const recommendations = await listRecommendationsForPatient(auth.healthcareProfileId);
    return ok({ recommendations });
  } catch (error) {
    return serverError("Error loading recommended tests", error);
  }
}
