import { CommunicationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { globalProviderRegistry } from "./provider-registry";

export interface RetryEngineSummary {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}

/**
 * Scheduler-agnostic retry runner: processes pending or failed communications ready for dispatch.
 */
export async function processEligibleRetries(batchSize = 20): Promise<RetryEngineSummary> {
  const now = new Date();

  const eligibleLogs = await prisma.communicationLog.findMany({
    where: {
      status: { in: [CommunicationStatus.PENDING, CommunicationStatus.FAILED] },
      scheduled_at: { lte: now },
      retry_count: { lt: 3 },
    },
    take: batchSize,
    orderBy: { scheduled_at: "asc" },
  });

  const summary: RetryEngineSummary = {
    processed: eligibleLogs.length,
    succeeded: 0,
    failed: 0,
    deadLettered: 0,
  };

  for (const log of eligibleLogs) {
    try {
      const provider = globalProviderRegistry.getProvider(log.provider);
      const result = await provider.send({
        recipient: log.recipient,
        content: log.rendered_text,
        channel: log.channel,
        templateKey: log.template_key,
      });

      if (result.status === "delivered") {
        await prisma.communicationLog.update({
          where: { id: log.id },
          data: {
            status: CommunicationStatus.DELIVERED,
            provider_message_id: result.providerMessageId,
            sent_at: result.completedAt,
          },
        });
        summary.succeeded++;
      } else {
        const nextRetryCount = log.retry_count + 1;
        const isDeadLetter = nextRetryCount >= log.max_retries;

        await prisma.communicationLog.update({
          where: { id: log.id },
          data: {
            status: isDeadLetter ? CommunicationStatus.DEAD_LETTER : CommunicationStatus.FAILED,
            retry_count: nextRetryCount,
            error_detail: result.error || "Delivery failed",
          },
        });

        if (isDeadLetter) summary.deadLettered++;
        else summary.failed++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown retry error";
      const nextRetryCount = log.retry_count + 1;
      const isDeadLetter = nextRetryCount >= log.max_retries;

      await prisma.communicationLog.update({
        where: { id: log.id },
        data: {
          status: isDeadLetter ? CommunicationStatus.DEAD_LETTER : CommunicationStatus.FAILED,
          retry_count: nextRetryCount,
          error_detail: msg,
        },
      });

      if (isDeadLetter) summary.deadLettered++;
      else summary.failed++;
    }
  }

  return summary;
}
