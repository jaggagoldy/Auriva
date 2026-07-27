import { CommunicationChannel, CommunicationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { DeliveryResult } from "./communication-types";

export interface CreateOutboxLogInput {
  appointmentId?: string;
  patientId: string;
  clinicId: string;
  channel: CommunicationChannel;
  provider: string;
  recipient: string;
  templateKey: string;
  templateVersion: string;
  payloadJson: string;
  renderedText: string;
  scheduledAt?: Date;
}

/**
 * Enqueues a communication message into the persistent NotificationLog outbox.
 */
export function enqueueOutboxMessage(input: CreateOutboxLogInput) {
  return prisma.communicationLog.create({
    data: {
      appointment_id: input.appointmentId,
      patient_id: input.patientId,
      clinic_id: input.clinicId,
      channel: input.channel,
      status: CommunicationStatus.PENDING,
      provider: input.provider,
      recipient: input.recipient,
      template_key: input.templateKey,
      template_version: input.templateVersion,
      payload_json: input.payloadJson,
      rendered_text: input.renderedText,
      scheduled_at: input.scheduledAt || new Date(),
    },
  });
}

/**
 * Updates a CommunicationLog entry with final delivery result metrics.
 */
export function updateDeliveryStatus(
  logId: string,
  result: DeliveryResult
) {
  const newStatus =
    result.status === "delivered"
      ? CommunicationStatus.DELIVERED
      : result.retryable
      ? CommunicationStatus.FAILED
      : CommunicationStatus.DEAD_LETTER;

  return prisma.communicationLog.update({
    where: { id: logId },
    data: {
      status: newStatus,
      provider_message_id: result.providerMessageId,
      error_detail: result.error,
      sent_at: result.status === "delivered" ? result.completedAt : undefined,
    },
  });
}
