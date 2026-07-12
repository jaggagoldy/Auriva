// Twilio SMS delivery via the REST API (no SDK dependency — the codebase's
// "zero new dependencies" convention; a single fetch to the documented
// Messages endpoint). Configured entirely by env:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (an SMS-capable number).

import { logger } from "@/api/logger";
import type { SmsSender, SmsResult } from "../index";
import { otpMessage } from "../index";

export function createTwilioSender(env: NodeJS.ProcessEnv): SmsSender {
  const sid = env.TWILIO_ACCOUNT_SID!;
  const token = env.TWILIO_AUTH_TOKEN!;
  const from = env.TWILIO_FROM!;

  async function send(phone: string, body: string): Promise<SmsResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams({ To: phone, From: from, Body: body });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!res.ok) {
        const error = data.message ?? `Twilio responded ${res.status}`;
        logger.error("[SMS:twilio] send failed", { phone, status: res.status, error });
        return { ok: false, error };
      }
      return { ok: true, id: data.sid };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Twilio request failed";
      logger.error("[SMS:twilio] send threw", { phone, error });
      return { ok: false, error };
    }
  }

  return {
    name: "twilio",
    sendOtp: (phone, code) => send(phone, otpMessage(code)),
    // B3: Twilio's Messages endpoint sends arbitrary body text — the same
    // call as sendOtp, just without the OTP-specific message composer.
    sendMessage: (phone, message) => send(phone, message),
  };
}
