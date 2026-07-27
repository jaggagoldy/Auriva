import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from "@/api/http";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { withRequestId } from "@/api/logger";
import {
  rescheduleBookingByToken,
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
      const body = await request.json();
      const newScheduledTime = typeof body.new_scheduled_time === "string" ? body.new_scheduled_time : "";
      const expectedUpdatedAt = typeof body.expected_updated_at === "string" ? body.expected_updated_at : undefined;

      if (!token || !newScheduledTime) {
        return badRequest("token and new_scheduled_time are required.");
      }

      // Rate limit IP & token
      const rateLimit = checkRateLimit([
        { key: `reschedule:ip:${clientIp(request)}`, limit: 10, windowMs: 15 * 60 * 1000 },
        { key: `reschedule:token:${token}`, limit: 5, windowMs: 60 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        return tooManyRequests("Too many reschedule attempts.", rateLimit.retryAfterSeconds);
      }

      const result = await rescheduleBookingByToken({
        token,
        newScheduledTime,
        expectedUpdatedAt,
      });

      return ok({
        success: true,
        message: "Appointment rescheduled successfully.",
        appointment_id: result.appointmentId,
        new_scheduled_time: result.newScheduledTime,
        new_manage_token: result.newToken,
      });
    } catch (error) {
      if (
        error instanceof BookingNotFoundError ||
        error instanceof BookingPolicyViolationError ||
        error instanceof OptimisticConcurrencyError
      ) {
        return badRequest(error.message);
      }
      return mapDomainError(error) ?? serverError("Error rescheduling appointment", error);
    }
  });
}
