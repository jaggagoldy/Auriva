import prisma from "@/lib/prisma";
import { CommunicationChannel, CommunicationStatus } from "@prisma/client";
import { DispatchCommunicationInput, DeliveryResult } from "./communication-types";
import { renderTemplate } from "./template-engine";
import { evaluatePreferences } from "./preference-engine";
import { globalProviderRegistry } from "./provider-registry";
import { enqueueOutboxMessage, updateDeliveryStatus } from "./delivery-queue";

export class PreferenceBlockedError extends Error {}

/**
 * Central Communication Platform Orchestrator:
 * Validates clinic preferences, renders versioned templates, registers outbox logs,
 * and dispatches via configured providers.
 */
export async function dispatchCommunication(
  input: DispatchCommunicationInput
): Promise<DeliveryResult> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
    select: {
      notifications_enabled: true,
      whatsapp_enabled: true,
      sms_enabled: true,
      reminders_enabled: true,
    },
  });

  if (!clinic) {
    throw new Error(`Clinic '${input.clinicId}' not found.`);
  }

  // Preference Engine check
  const prefCheck = evaluatePreferences(input.channel, input.templateKey, clinic);
  if (!prefCheck.allowed) {
    throw new PreferenceBlockedError(prefCheck.reason || "Communication blocked by clinic preferences.");
  }

  // Template Engine rendering
  const rendered = renderTemplate(input.templateKey, input.variables, input.templateVersion || "v1");

  // Select Provider
  const provider = globalProviderRegistry.getProviderForChannel(input.channel);

  // Enqueue to NotificationLog Outbox
  const logRecord = await enqueueOutboxMessage({
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    clinicId: input.clinicId,
    channel: input.channel,
    provider: provider.name,
    recipient: input.recipient,
    templateKey: rendered.templateKey,
    templateVersion: rendered.templateVersion,
    payloadJson: JSON.stringify(input.variables),
    renderedText: rendered.renderedText,
    scheduledAt: input.scheduledAt,
  });

  // Dispatch via Provider
  let result: DeliveryResult;
  try {
    result = await provider.send({
      recipient: input.recipient,
      content: rendered.renderedText,
      channel: input.channel,
      templateKey: rendered.templateKey,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Provider dispatch exception";
    result = {
      status: "failed",
      provider: provider.name,
      error: msg,
      retryable: true,
      completedAt: new Date(),
    };
  }

  // Update Outbox Log Record
  await updateDeliveryStatus(logRecord.id, result);

  return result;
}

/**
 * Calculates upcoming appointments for T-24h and T-2h automated reminders
 * and dispatches communication events.
 */
export async function dispatchScheduledReminders(): Promise<{ dispatched24h: number; dispatched2h: number }> {
  const now = new Date();
  
  // T-24h Window (23.5h to 24.5h from now)
  const window24Start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const window24End = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  // T-2h Window (1.5h to 2.5h from now)
  const window2Start = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
  const window2End = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

  const appts24 = await prisma.appointment.findMany({
    where: {
      scheduled_time: { gte: window24Start, lte: window24End },
      status: { in: ["scheduled", "waiting"] },
    },
    include: {
      patient: { include: { user: { select: { phone_number: true } } } },
      doctor: { select: { full_name: true } },
      clinic: { select: { id: true, name: true } },
    },
  });

  const appts2 = await prisma.appointment.findMany({
    where: {
      scheduled_time: { gte: window2Start, lte: window2End },
      status: { in: ["scheduled", "waiting"] },
    },
    include: {
      patient: { include: { user: { select: { phone_number: true } } } },
      doctor: { select: { full_name: true } },
      clinic: { select: { id: true, name: true } },
    },
  });

  let dispatched24h = 0;
  let dispatched2h = 0;

  for (const appt of appts24) {
    const phone = appt.patient.user?.phone_number;
    if (!phone) continue;

    try {
      await dispatchCommunication({
        appointmentId: appt.id,
        patientId: appt.patient_id,
        clinicId: appt.clinic.id,
        recipient: phone,
        channel: CommunicationChannel.SMS,
        templateKey: "reminder_24h",
        variables: {
          doctorName: appt.doctor.full_name,
          clinicName: appt.clinic.name,
          scheduledTime: appt.scheduled_time.toLocaleString(),
        },
      });
      dispatched24h++;
    } catch {
      // Ignored if blocked by preferences or unconfigured
    }
  }

  for (const appt of appts2) {
    const phone = appt.patient.user?.phone_number;
    if (!phone) continue;

    try {
      await dispatchCommunication({
        appointmentId: appt.id,
        patientId: appt.patient_id,
        clinicId: appt.clinic.id,
        recipient: phone,
        channel: CommunicationChannel.SMS,
        templateKey: "reminder_2h",
        variables: {
          doctorName: appt.doctor.full_name,
          clinicName: appt.clinic.name,
          scheduledTime: appt.scheduled_time.toLocaleString(),
        },
      });
      dispatched2h++;
    } catch {
      // Ignored if blocked by preferences or unconfigured
    }
  }

  return { dispatched24h, dispatched2h };
}
