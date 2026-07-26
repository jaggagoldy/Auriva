import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { logger, withRequestId } from "@/api/logger";
import { getPublicClinicBySlug, PublicClinicNotFoundError } from "@/services/public-booking-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withRequestId(request, async () => {
    try {
      const { slug } = await params;
      if (!slug || slug.trim().length === 0) {
        return badRequest("Clinic slug is required.");
      }

      const profile = await getPublicClinicBySlug(slug.trim());

      logger.info("public.clinic.fetched", { clinicId: profile.id, slug: profile.slug });

      return ok({
        success: true,
        clinic: profile,
      });
    } catch (error) {
      if (error instanceof PublicClinicNotFoundError) {
        return badRequest(error.message);
      }
      return mapDomainError(error) ?? serverError("Error fetching public clinic profile", error);
    }
  });
}
