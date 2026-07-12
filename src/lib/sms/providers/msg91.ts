// MSG91 OTP delivery via the v5 OTP API (India DLT-compliant). We generate the
// code ourselves (otp-service) and hand it to MSG91 to deliver against a
// pre-approved DLT template. Configured entirely by env:
//   MSG91_AUTH_KEY, MSG91_TEMPLATE_ID (a DLT-approved OTP template).
// The sender id is part of the approved template registration, not this call.

import { logger } from "@/api/logger";
import type { SmsSender, SmsResult } from "../index";
import { digitsOnly } from "../index";

export function createMsg91Sender(env: NodeJS.ProcessEnv): SmsSender {
  const authKey = env.MSG91_AUTH_KEY!;
  const templateId = env.MSG91_TEMPLATE_ID!;

  return {
    name: "msg91",
    // B3: unlike Twilio/Exotel, MSG91's OTP delivery above goes through a
    // dedicated DLT-compliant OTP endpoint (/api/v5/otp) that cannot send
    // arbitrary free text — India's DLT regulations require a separate
    // pre-registered template per message category (booking confirmation,
    // reminder, etc.), each needing its own template id. Implementing this
    // against an unverified endpoint/payload shape risks silently failing
    // against a live paid API, so this returns a clear, explicit failure
    // instead of guessing. OTP delivery (sendOtp above) is fully unaffected.
    // Revisit when MSG91 is the provider chosen for a real deployment and a
    // transactional template can be registered and verified against it.
    async sendMessage(phone: string, _message: string): Promise<SmsResult> {
      logger.error("[SMS:msg91] sendMessage not supported — requires a separate DLT transactional template", { phone });
      return {
        ok: false,
        error: "MSG91 requires a separate DLT-approved template for non-OTP messages; not yet configured.",
      };
    },
    async sendOtp(phone: string, code: string): Promise<SmsResult> {
      // MSG91 wants the number with country code and no "+".
      const mobile = digitsOnly(phone);
      const url = new URL("https://control.msg91.com/api/v5/otp");
      url.searchParams.set("template_id", templateId);
      url.searchParams.set("mobile", mobile);
      url.searchParams.set("otp", code);

      try {
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { authkey: authKey, "Content-Type": "application/json" },
        });
        const data = (await res.json().catch(() => ({}))) as { type?: string; message?: string; request_id?: string };
        // MSG91 signals success with type: "success"; failures carry a message.
        if (!res.ok || data.type === "error") {
          const error = data.message ?? `MSG91 responded ${res.status}`;
          logger.error("[SMS:msg91] send failed", { phone, status: res.status, error });
          return { ok: false, error };
        }
        return { ok: true, id: data.request_id };
      } catch (err) {
        const error = err instanceof Error ? err.message : "MSG91 request failed";
        logger.error("[SMS:msg91] send threw", { phone, error });
        return { ok: false, error };
      }
    },
  };
}
