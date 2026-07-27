import { randomUUID } from "crypto";
import { CommunicationChannel } from "@prisma/client";
import { logger } from "@/api/logger";
import { CommunicationProvider, DeliveryResult } from "../communication-types";

/**
 * Default Mock Provider: logs messages to stdout/application logs for outbox verification
 * without sending real external network requests.
 */
export class MockProvider implements CommunicationProvider {
  name = "mock";
  supportedChannels = [
    CommunicationChannel.WHATSAPP,
    CommunicationChannel.SMS,
    CommunicationChannel.EMAIL,
    CommunicationChannel.IN_APP,
  ];

  async send(message: {
    recipient: string;
    content: string;
    channel: CommunicationChannel;
    templateKey: string;
  }): Promise<DeliveryResult> {
    const providerMessageId = `mock-${randomUUID()}`;

    logger.info("[CommunicationPlatform:MockProvider] Message dispatched", {
      recipient: message.recipient,
      channel: message.channel,
      templateKey: message.templateKey,
      content: message.content,
      providerMessageId,
    });

    return {
      status: "delivered",
      provider: this.name,
      providerMessageId,
      retryable: false,
      completedAt: new Date(),
    };
  }

  validate(recipient: string): boolean {
    return recipient.trim().length >= 7;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
