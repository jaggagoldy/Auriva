import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from "@/api/http";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { withRequestId } from "@/api/logger";
import {
  cancelBookingByToken,
  BookingNotFoundError,
  BookingPolicyViolationError,
  OptimisticConcurrencyError,
} from "@/services/booking-management-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withRequestId(request, async () => {
    try {
      const { token } = await params;
      const body = await request.json().catch(() => ({}));
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      const expectedUpdatedAt = typeof body.expected_updated_at === "string" ? body.expected_updated_at : undefined;

      if (!token) {
        return badRequest("token is required.");
      }

      // Rate limit IP & token
      const rateLimit = checkRateLimit([
        { key: `cancel:ip:${clientIp(request)}`, limit: 10, windowMs: 15 * 60 * 1000 },
        { key: `cancel:token:${token}`, limit: 5, windowMs: 60 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        return tooManyRequests("Too many cancellation attempts.", rateLimit.retryAfterSeconds);
      }

      const result = await cancelBookingByToken({
        token,
        reason,
        expectedUpdatedAt,
      });

      return ok({
        success: true,
        message: "Appointment cancelled successfully.",
        appointment_id: result.appointmentId,
        status: result.status,
      });
    } catch (error) {
      if (
        error instanceof BookingNotFoundError ||
        error instanceof BookingPolicyViolationError ||
        error instanceof OptimisticConcurrencyError
      ) {
        return badRequest(error.message);
      }
      return mapDomainError(error) ?? serverError("Error cancelling appointment", error);
    }
  });
}
