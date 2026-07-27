import { CommunicationChannel } from "@prisma/client";

export interface ClinicCommunicationPreferences {
  notifications_enabled: boolean;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  reminders_enabled: boolean;
}

export interface PreferenceCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Evaluates whether a clinic's notification preferences allow dispatching on a target channel.
 */
export function evaluatePreferences(
  channel: CommunicationChannel,
  templateKey: string,
  preferences: ClinicCommunicationPreferences
): PreferenceCheckResult {
  if (!preferences.notifications_enabled) {
    return {
      allowed: false,
      reason: "Automated communications are disabled for this clinic.",
    };
  }

  if (channel === CommunicationChannel.WHATSAPP && !preferences.whatsapp_enabled) {
    return {
      allowed: false,
      reason: "WhatsApp channel communications are disabled for this clinic.",
    };
  }

  if (channel === CommunicationChannel.SMS && !preferences.sms_enabled) {
    return {
      allowed: false,
      reason: "SMS channel communications are disabled for this clinic.",
    };
  }

  if (templateKey.startsWith("reminder_") && !preferences.reminders_enabled) {
    return {
      allowed: false,
      reason: "Automated appointment reminders are disabled for this clinic.",
    };
  }

  return { allowed: true };
}
