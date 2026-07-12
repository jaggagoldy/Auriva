// The dev / no-op delivery channel. Used when no real provider is configured
// (development, or a half-configured deploy). It records the delivery intent
// server-side so a developer can see the code in logs, and lets the send route
// echo the code on-screen for non-production testing. NEVER selected in
// production (startup validation forbids it — see src/lib/sms/index.ts).

import { logger } from "@/api/logger";
import type { SmsSender, SmsResult } from "../index";

export function createLogSender(): SmsSender {
  return {
    name: "log",
    async sendOtp(phone: string, code: string): Promise<SmsResult> {
      // Dev-only: the code is intentionally visible here (this IS the dev
      // delivery channel; the send route also echoes it in the response).
      logger.info("[SMS:log] OTP delivery (dev channel, no SMS sent)", { phone, code });
      return { ok: true, id: "log" };
    },
    async sendMessage(phone: string, message: string): Promise<SmsResult> {
      logger.info("[SMS:log] message delivery (dev channel, no SMS sent)", { phone, message });
      return { ok: true, id: "log" };
    },
  };
}
