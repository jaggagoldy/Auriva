import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { withRequestId } from "@/api/logger";
import { getBookingDetailsByToken, BookingNotFoundError } from "@/services/booking-management-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withRequestId(request, async () => {
    try {
      const { token } = await params;
      if (!token || token.trim().length === 0) {
        return badRequest("Manage token is required.");
      }

      const booking = await getBookingDetailsByToken(token.trim());

      return ok({
        success: true,
        booking,
      });
    } catch (error) {
      if (error instanceof BookingNotFoundError) {
        return badRequest(error.message);
      }
      return mapDomainError(error) ?? serverError("Error fetching booking details", error);
    }
  });
}
