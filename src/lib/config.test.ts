// TEST-4: configuration validation regression coverage (INF-6).

import { describe, expect, it } from "vitest";
import { collectConfigErrors, validateStartupConfig, ConfigValidationError, isDemoModeEnabled } from "./config";

// Production requires a fully-configured SMS provider (H1/SEC-3) AND a real
// alert channel (RG-001), so a "valid production" env must include both.
const PROD_SMS = {
  SMS_PROVIDER: "twilio",
  TWILIO_ACCOUNT_SID: "AC_test",
  TWILIO_AUTH_TOKEN: "token_test",
  TWILIO_FROM: "+10000000000",
  ALERT_CHANNEL: "slack",
  ALERT_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/xxx",
} as const;

// Release 1.2 Batch 4 (B1): DATABASE_URL is required in every environment
// now (no hardcoded fallback exists post-migration) — every "valid config"
// fixture below needs it so these tests keep validating what they're
// actually about (NODE_ENV/SMS/alert checks), not incidentally failing on
// an unrelated, already-covered check (see its own describe block below).
const DB = { DATABASE_URL: "postgresql://test:test@localhost:5432/test" } as const;

describe("collectConfigErrors", () => {
  it("reports no errors for a valid NODE_ENV", () => {
    expect(
      collectConfigErrors({ NODE_ENV: "production", ...DB, ...PROD_SMS } as unknown as NodeJS.ProcessEnv)
    ).toEqual([]);
    expect(collectConfigErrors({ NODE_ENV: "development", ...DB } as unknown as NodeJS.ProcessEnv)).toEqual([]);
    expect(collectConfigErrors({ NODE_ENV: "test", ...DB } as unknown as NodeJS.ProcessEnv)).toEqual([]);
  });

  it("reports an error when NODE_ENV is unset but DATABASE_URL is present (NODE_ENV itself is optional)", () => {
    expect(collectConfigErrors({ ...DB } as unknown as NodeJS.ProcessEnv)).toEqual([]);
  });

  it("reports an error for an invalid NODE_ENV", () => {
    const errors = collectConfigErrors({ NODE_ENV: "staging", ...DB, ...PROD_SMS } as unknown as NodeJS.ProcessEnv);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("staging");
  });

  it("requires a real SMS provider in production", () => {
    const errors = collectConfigErrors({ NODE_ENV: "production", ...DB } as unknown as NodeJS.ProcessEnv);
    expect(errors.some((e) => e.includes("SMS_PROVIDER"))).toBe(true);
  });

  it("rejects the log provider in production", () => {
    const errors = collectConfigErrors({ NODE_ENV: "production", ...DB, SMS_PROVIDER: "log" } as unknown as NodeJS.ProcessEnv);
    expect(errors.some((e) => e.toLowerCase().includes("log"))).toBe(true);
  });

  it("reports the specific missing keys for a selected provider in production", () => {
    const errors = collectConfigErrors({ NODE_ENV: "production", ...DB, SMS_PROVIDER: "twilio" } as unknown as NodeJS.ProcessEnv);
    expect(errors.some((e) => e.includes("TWILIO_AUTH_TOKEN"))).toBe(true);
  });

  it("catches an unknown SMS_PROVIDER even in development", () => {
    const errors = collectConfigErrors({ NODE_ENV: "development", ...DB, SMS_PROVIDER: "nexmo" } as unknown as NodeJS.ProcessEnv);
    expect(errors.some((e) => e.includes("nexmo"))).toBe(true);
  });
});

describe("collectConfigErrors — DATABASE_URL (Release 1.2 Batch 4 / B1)", () => {
  it("requires DATABASE_URL in every environment, not just production", () => {
    expect(collectConfigErrors({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv).some((e) => e.includes("DATABASE_URL"))).toBe(true);
    expect(collectConfigErrors({ NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv).some((e) => e.includes("DATABASE_URL"))).toBe(true);
    expect(collectConfigErrors({ NODE_ENV: "production", ...PROD_SMS } as unknown as NodeJS.ProcessEnv).some((e) => e.includes("DATABASE_URL"))).toBe(true);
  });

  it("treats a blank/whitespace-only DATABASE_URL the same as unset", () => {
    expect(collectConfigErrors({ DATABASE_URL: "   " } as unknown as NodeJS.ProcessEnv).some((e) => e.includes("DATABASE_URL"))).toBe(true);
  });

  it("is satisfied by any non-empty DATABASE_URL (format validation is Prisma's job, not this app's)", () => {
    expect(collectConfigErrors({ ...DB } as unknown as NodeJS.ProcessEnv)).toEqual([]);
  });
});

describe("validateStartupConfig", () => {
  it("does not throw for valid configuration", () => {
    expect(() =>
      validateStartupConfig({ NODE_ENV: "production", ...DB, ...PROD_SMS } as unknown as NodeJS.ProcessEnv)
    ).not.toThrow();
  });

  it("throws ConfigValidationError with every problem listed for invalid configuration", () => {
    expect(() => validateStartupConfig({ NODE_ENV: "bogus", ...DB, ...PROD_SMS } as unknown as NodeJS.ProcessEnv)).toThrow(
      ConfigValidationError
    );
    try {
      validateStartupConfig({ NODE_ENV: "bogus", ...DB, ...PROD_SMS } as unknown as NodeJS.ProcessEnv);
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toContain("bogus");
    }
  });

  it("fails fast without a DATABASE_URL, in any environment", () => {
    expect(() => validateStartupConfig({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)).toThrow(
      ConfigValidationError
    );
  });

  it("fails fast in production without an SMS provider", () => {
    expect(() => validateStartupConfig({ NODE_ENV: "production", ...DB } as unknown as NodeJS.ProcessEnv)).toThrow(
      ConfigValidationError
    );
  });
});

describe("isDemoModeEnabled (H2)", () => {
  it("defaults to enabled everywhere (customer discovery is a release goal)", () => {
    expect(isDemoModeEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isDemoModeEnabled({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("is disabled only by an explicit DEMO_MODE_ENABLED=false kill-switch", () => {
    expect(isDemoModeEnabled({ DEMO_MODE_ENABLED: "false" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isDemoModeEnabled({ DEMO_MODE_ENABLED: "FALSE" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isDemoModeEnabled({ DEMO_MODE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
