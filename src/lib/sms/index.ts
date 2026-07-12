// Release 1.2 Hardening (H1 / SEC-3): a pluggable SMS-delivery abstraction for
// OTP codes. This closes the #1 pilot gate from the Milestone 1 Release
// Candidate Report — until now a real OTP was issued but only echoed on-screen
// in non-production (no delivery channel).
//
// Design goals (from the hardening brief): production-ready, pluggable, no
// vendor lock-in. The interface is deliberately scoped to the ONE thing the app
// actually sends today — an OTP code — rather than a speculative general-purpose
// SMS bus (there is no notification platform; see OPS-002). When a real
// non-OTP SMS need appears, widen SmsSender then, not before.
//
// Selection & configuration are 100% environment-driven (SMS_PROVIDER +
// provider-specific keys) so switching Twilio↔MSG91↔Exotel is a deploy-time
// config change, never a code change. Startup validation (src/lib/config.ts)
// fails fast in production if the selected provider is missing or misconfigured.

import { logger } from "@/api/logger";
import { createTwilioSender } from "./providers/twilio";
import { createMsg91Sender } from "./providers/msg91";
import { createExotelSender } from "./providers/exotel";
import { createLogSender } from "./providers/log";

export interface SmsResult {
  ok: boolean;
  /** Provider-side message id on success (for correlation/audit). */
  id?: string;
  /** Human-readable failure reason on error (never contains the OTP). */
  error?: string;
}

export interface SmsSender {
  /** Stable provider name for logging/audit (e.g. "twilio", "log"). */
  readonly name: string;
  /** Delivers a one-time code to a phone number. Implementations compose the
   * message; the code is never logged in plaintext by real providers. */
  sendOtp(phone: string, code: string): Promise<SmsResult>;
  /**
   * B3 (Release 1.2 Batch 2): delivers an arbitrary free-text message —
   * widening SmsSender exactly as this file's own header comment
   * anticipated ("when a real non-OTP SMS need appears, widen SmsSender
   * then, not before"). Used for appointment booking confirmations and
   * reminders. Not every provider can do this unconditionally in
   * production — see the MSG91 adapter's comment.
   */
  sendMessage(phone: string, message: string): Promise<SmsResult>;
}

export type SmsProviderName = "twilio" | "msg91" | "exotel" | "log";

/** The real (paid) providers — "log" is the dev/no-op delivery channel. */
const REAL_PROVIDERS: readonly SmsProviderName[] = ["twilio", "msg91", "exotel"];

/** Environment variables each real provider requires to actually send. */
const REQUIRED_VARS: Record<Exclude<SmsProviderName, "log">, string[]> = {
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"],
  msg91: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"],
  exotel: ["EXOTEL_SID", "EXOTEL_API_KEY", "EXOTEL_API_TOKEN", "EXOTEL_FROM"],
};

/** Digits-only phone (some providers, e.g. MSG91, reject a leading "+"). */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** The SMS_PROVIDER value if it names a known provider, else null (unknown/unset). */
export function configuredProviderName(env: NodeJS.ProcessEnv = process.env): SmsProviderName | null {
  const raw = (env.SMS_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "log") return "log";
  if ((REAL_PROVIDERS as readonly string[]).includes(raw)) return raw as SmsProviderName;
  return null;
}

/** True only when a REAL provider is selected AND all its required vars are set. */
export function isSmsProviderConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const name = configuredProviderName(env);
  if (!name || name === "log") return false;
  return REQUIRED_VARS[name].every((v) => Boolean(env[v]?.trim()));
}

/**
 * Configuration problems for the SMS layer, folded into the app's startup
 * validation (collectConfigErrors). Production requires a fully-configured real
 * provider — OTP delivery is the pilot gate, so a prod deploy without it must
 * fail fast rather than silently issue codes nobody receives. Non-production is
 * lenient: an unknown SMS_PROVIDER value is a (typo-catching) error, but a
 * missing key just falls back to the on-screen echo.
 */
export function smsConfigErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (env.SMS_PROVIDER ?? "").trim();
  const name = configuredProviderName(env);
  const isProd = env.NODE_ENV === "production";

  if (raw && !name) {
    return [`SMS_PROVIDER is "${raw}", expected one of: twilio, msg91, exotel, log.`];
  }

  if (!isProd) return []; // dev/test: echo fallback is fine

  if (!name) {
    return ['SMS_PROVIDER must be set to one of "twilio", "msg91", or "exotel" in production.'];
  }
  if (name === "log") {
    return ['SMS_PROVIDER "log" cannot be used in production — OTP codes would never be delivered.'];
  }
  const missing = REQUIRED_VARS[name].filter((v) => !env[v]?.trim());
  return missing.length
    ? [`SMS provider "${name}" is missing required configuration: ${missing.join(", ")}.`]
    : [];
}

/**
 * Resolves the active sender. A real provider is used only when fully
 * configured; otherwise (dev, or a half-configured provider) we fall back to the
 * "log" sender, which records the delivery intent server-side and lets the send
 * route echo the code on-screen for non-production testing.
 */
export function getSmsSender(env: NodeJS.ProcessEnv = process.env): SmsSender {
  const name = configuredProviderName(env);
  if (name && name !== "log" && isSmsProviderConfigured(env)) {
    switch (name) {
      case "twilio":
        return createTwilioSender(env);
      case "msg91":
        return createMsg91Sender(env);
      case "exotel":
        return createExotelSender(env);
    }
  }
  if (name && name !== "log" && env.NODE_ENV !== "production") {
    logger.warn("[SMS] provider selected but not fully configured — falling back to log sender", { provider: name });
  }
  return createLogSender();
}

/** Convenience used by the OTP send route. */
export function sendOtpSms(phone: string, code: string, env: NodeJS.ProcessEnv = process.env): Promise<SmsResult> {
  return getSmsSender(env).sendOtp(phone, code);
}

/** B3: convenience used by the appointment-confirmation/reminder handlers. */
export function sendGenericSms(phone: string, message: string, env: NodeJS.ProcessEnv = process.env): Promise<SmsResult> {
  return getSmsSender(env).sendMessage(phone, message);
}

/** Standard OTP message body for the free-text providers (Twilio, Exotel). */
export function otpMessage(code: string): string {
  return `Your Auriva verification code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`;
}
