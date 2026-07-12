import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { updateRecommendation, TestRecommendationError } from "@/services/test-recommendation-service";

// P5 Health Vault — the patient advances a recommendation (booked → completed
// → report_uploaded) and/or files a report url. Scoped to the active profile.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const updated = await updateRecommendation({
      id,
      patientId: auth.healthcareProfileId,
      status: typeof body.status === "string" ? body.status : undefined,
      reportUrl: body.report_url === null || typeof body.report_url === "string" ? body.report_url : undefined,
    });
    return ok({ recommendation: updated });
  } catch (error) {
    if (error instanceof TestRecommendationError) return badRequest(error.message);
    return serverError("Error updating the recommendation", error);
  }
}
