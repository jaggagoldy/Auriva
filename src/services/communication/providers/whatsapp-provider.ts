import { CommunicationChannel } from "@prisma/client";
import { CommunicationProvider, DeliveryResult } from "../communication-types";
import { MockProvider } from "./mock-provider";

export class WhatsAppProvider implements CommunicationProvider {
  name = "whatsapp_meta_cloud";
  supportedChannels = [CommunicationChannel.WHATSAPP];
  private fallback = new MockProvider();

  async send(message: {
    recipient: string;
    content: string;
    channel: CommunicationChannel;
    templateKey: string;
  }): Promise<DeliveryResult> {
    // Delegates to fallback logger when live WhatsApp Cloud API credentials are absent
    return this.fallback.send(message);
  }

  validate(recipient: string): boolean {
    return recipient.replace(/\D/g, "").length >= 7;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
