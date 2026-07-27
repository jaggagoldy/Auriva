import { CommunicationChannel } from "@prisma/client";
import { CommunicationProvider } from "./communication-types";
import { MockProvider } from "./providers/mock-provider";
import { SmsProvider } from "./providers/sms-provider";
import { WhatsAppProvider } from "./providers/whatsapp-provider";

export class ProviderRegistry {
  private providers: Map<string, CommunicationProvider> = new Map();

  constructor() {
    // Register default built-in providers
    this.registerProvider(new MockProvider());
    this.registerProvider(new SmsProvider());
    this.registerProvider(new WhatsAppProvider());
  }

  registerProvider(provider: CommunicationProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): CommunicationProvider {
    return this.providers.get(name) || this.providers.get("mock")!;
  }

  getProviderForChannel(channel: CommunicationChannel): CommunicationProvider {
    if (channel === CommunicationChannel.WHATSAPP && this.providers.has("whatsapp_meta_cloud")) {
      return this.providers.get("whatsapp_meta_cloud")!;
    }
    if (channel === CommunicationChannel.SMS && this.providers.has("sms_gateway")) {
      return this.providers.get("sms_gateway")!;
    }
    return this.providers.get("mock")!;
  }
}

export const globalProviderRegistry = new ProviderRegistry();
