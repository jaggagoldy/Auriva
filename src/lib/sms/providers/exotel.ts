// Exotel SMS delivery via the REST API (no SDK dependency). Configured entirely
// by env:
//   EXOTEL_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_FROM (an approved
//   sender id), and optionally EXOTEL_SUBDOMAIN (defaults to api.exotel.com).

import { logger } from "@/api/logger";
import type { SmsSender, SmsResult } from "../index";
import { otpMessage } from "../index";

export function createExotelSender(env: NodeJS.ProcessEnv): SmsSender {
  const sid = env.EXOTEL_SID!;
  const apiKey = env.EXOTEL_API_KEY!;
  const apiToken = env.EXOTEL_API_TOKEN!;
  const from = env.EXOTEL_FROM!;
  const subdomain = (env.EXOTEL_SUBDOMAIN ?? "api.exotel.com").trim();

  async function send(phone: string, bodyText: string): Promise<SmsResult> {
    const url = `https://${subdomain}/v1/Accounts/${encodeURIComponent(sid)}/Sms/send.json`;
    const auth = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");
    const body = new URLSearchParams({ From: from, To: phone, Body: bodyText });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        SMSMessage?: { Sid?: string };
        RestException?: { Message?: string };
      };
      if (!res.ok) {
        const error = data.RestException?.Message ?? `Exotel responded ${res.status}`;
        logger.error("[SMS:exotel] send failed", { phone, status: res.status, error });
        return { ok: false, error };
      }
      return { ok: true, id: data.SMSMessage?.Sid };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Exotel request failed";
      logger.error("[SMS:exotel] send threw", { phone, error });
      return { ok: false, error };
    }
  }

  return {
    name: "exotel",
    sendOtp: (phone, code) => send(phone, otpMessage(code)),
    // B3: Exotel's Sms/send endpoint sends arbitrary body text.
    sendMessage: (phone, message) => send(phone, message),
  };
}
