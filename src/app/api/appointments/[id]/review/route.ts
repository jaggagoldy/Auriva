import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { isPlainObject } from "@/api/validation";
import { createReview } from "@/services/review-service";
import { recordAudit } from "@/lib/audit";

// PAT-2 (Release 1.2 Sprint 1) — a patient submits feedback for their own
// completed appointment. Patient-only: there is no staff-submitted review
// path, by design (a review is the patient's own account of their visit).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patientAuth = await requirePatientContext();
    if (!patientAuth.ok) return patientAuth.response;

    const body: unknown = await request.json().catch(() => null);
    if (!isPlainObject(body)) return badRequest("Request body must be a JSON object.");
    const { rating, comment } = body as { rating?: unknown; comment?: unknown };

    if (typeof rating !== "number") {
      return badRequest("A rating (1-5) is required.");
    }

    const { review, organizationId } = await createReview({
      appointmentId: id,
      patientProfileId: patientAuth.healthcareProfileId,
      rating,
      comment: typeof comment === "string" ? comment : null,
    });

    await recordAudit({
      organizationId,
      actorUserId: patientAuth.session.userId,
      action: "patient_review_submitted",
      detail: `Review ${review.id} submitted for appointment ${id}`,
    });

    return ok(review, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error submitting review", error);
  }
}
