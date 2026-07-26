import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { withRequestId } from "@/api/logger";
import { getPublicDoctorSlots } from "@/services/public-booking-service";

export async function GET(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const doctorId = searchParams.get("doctor_id")?.trim();
      const daysParam = searchParams.get("days");
      const days = daysParam ? parseInt(daysParam, 10) : 7;

      if (!doctorId) {
        return badRequest("doctor_id parameter is required.");
      }

      const daySlots = await getPublicDoctorSlots(doctorId, isNaN(days) ? 7 : days);

      return ok({
        success: true,
        days: daySlots,
      });
    } catch (error) {
      return mapDomainError(error) ?? serverError("Error fetching public doctor slots", error);
    }
  });
}
