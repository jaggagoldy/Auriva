import { CommunicationChannel, CommunicationStatus } from "@prisma/client";

export interface DeliveryResult {
  status: "delivered" | "failed";
  provider: string;
  providerMessageId?: string;
  error?: string;
  retryable: boolean;
  completedAt: Date;
}

export interface CommunicationProvider {
  name: string;
  supportedChannels: CommunicationChannel[];
  send(message: {
    recipient: string;
    content: string;
    channel: CommunicationChannel;
    templateKey: string;
  }): Promise<DeliveryResult>;
  validate(recipient: string): boolean;
  healthCheck(): Promise<boolean>;
}

export interface RenderedTemplate {
  templateKey: string;
  templateVersion: string;
  renderedText: string;
}

export interface DispatchCommunicationInput {
  appointmentId?: string;
  patientId: string;
  clinicId: string;
  recipient: string;
  channel: CommunicationChannel;
  templateKey: string;
  templateVersion?: string;
  variables: Record<string, unknown>;
  scheduledAt?: Date;
}
