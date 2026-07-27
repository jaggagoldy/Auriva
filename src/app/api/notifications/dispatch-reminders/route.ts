import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { withRequestId } from "@/api/logger";
import { dispatchScheduledReminders } from "@/services/communication/communication-engine";
import { processEligibleRetries } from "@/services/communication/retry-engine";

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      // 1. Dispatch T-24h and T-2h automated reminders
      const reminderSummary = await dispatchScheduledReminders();

      // 2. Scheduler-agnostic retry runner processing eligible outbox messages
      const retrySummary = await processEligibleRetries(50);

      return ok({
        success: true,
        reminders: reminderSummary,
        retries: retrySummary,
      });
    } catch (error) {
      return mapDomainError(error) ?? serverError("Error processing communication reminders/retries", error);
    }
  });
}
