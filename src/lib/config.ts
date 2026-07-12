// INF-6: startup configuration validation. No new configuration framework —
// plain `process.env`, the same "existing environment approach" already
// used elsewhere in this codebase (src/lib/prisma.ts, src/api/session.ts).
// This is the established home for validating whatever required
// configuration the app grows over time — the fail-fast pattern below is
// what each next real required variable gets added to as it appears
// (DATABASE_URL as of Release 1.2 Batch 4/ADR-0006; SMS/alert provider
// config from the H1/RG-001 hardening passes).

import { isSmsProviderConfigured, smsConfigErrors } from "@/lib/sms";
import { alertConfigErrors } from "@/lib/alerts";

const VALID_NODE_ENVS = ["development", "production", "test"] as const;

export class ConfigValidationError extends Error {}

/**
 * Validates required configuration and returns every problem found (not
 * just the first) — so a misconfigured deployment gets one clear report
 * instead of a fix-one-restart-find-the-next loop.
 */
export function collectConfigErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  const errors: string[] = [];

  if (env.NODE_ENV && !(VALID_NODE_ENVS as readonly string[]).includes(env.NODE_ENV)) {
    errors.push(
      `NODE_ENV is "${env.NODE_ENV}", expected one of: ${VALID_NODE_ENVS.join(", ")}.`
    );
  }

  // Release 1.2 Batch 4 / ADR-0006: PostgreSQL, connection env-driven, no
  // hardcoded fallback of any kind — required in every environment
  // (including local dev/test), unlike the SMS/alert checks below which are
  // production-only. Without this check, a missing DATABASE_URL surfaces as
  // a cryptic Prisma connection error on the first query a request happens
  // to make, not a clear diagnostic at startup.
  if (!env.DATABASE_URL?.trim()) {
    errors.push("DATABASE_URL is required (PostgreSQL connection string) but is not set.");
  }

  // H1 / SEC-3: the OTP SMS provider. In production a fully-configured real
  // provider is required (OTP delivery is the pilot gate); non-production only
  // catches an unknown SMS_PROVIDER value. See src/lib/sms/index.ts.
  errors.push(...smsConfigErrors(env));

  // RG-001: operational alerting. Production requires a configured real alert
  // channel (mandatory Code-Freeze criterion — a prod deploy must not run blind).
  // See src/lib/alerts/index.ts.
  errors.push(...alertConfigErrors(env));

  return errors;
}

/**
 * Batch 1 (SEC-3): whether the OTP send route may echo the freshly-issued
 * code back in its response. No SMS provider is wired yet (see the note
 * above), so until one is, non-production deployments have no other way to
 * deliver the code to a pilot/demo/test. This MUST be false in production —
 * echoing a live OTP to the caller there would defeat the whole point of
 * issuing a real per-request secret. When a real provider key is added above,
 * this becomes `!isSmsProviderConfigured(env)` instead.
 *
 * H1 / SEC-3 update: a real SMS provider now exists, so echo only when there is
 * no configured provider to actually deliver the code — and never in production.
 */
export function shouldEchoOtp(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && !isSmsProviderConfigured(env);
}

/**
 * H2 (security hardening): whether Demo Mode ("Skip & explore" + the sandbox
 * seed/reset endpoints) is enabled. Default ON everywhere — customer discovery
 * is an explicit goal of this release — but an operator can hard-disable it with
 * `DEMO_MODE_ENABLED=false` (e.g. a dedicated pilot instance that should expose
 * no sandbox surface). The demo owner account carries NO password, so even when
 * enabled it can never be reached through the normal credential login — only
 * through the rate-limited enter endpoint, and only ever within the demo org.
 */
export function isDemoModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.DEMO_MODE_ENABLED ?? "true").trim().toLowerCase() !== "false";
}

/** Throws ConfigValidationError with every problem listed if configuration
 * is invalid — called once at process startup (src/instrumentation.ts). */
export function validateStartupConfig(env: NodeJS.ProcessEnv = process.env): void {
  const errors = collectConfigErrors(env);
  if (errors.length > 0) {
    throw new ConfigValidationError(
      `Invalid application configuration:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}
