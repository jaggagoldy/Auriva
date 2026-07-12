// H1 / SEC-3: SMS provider abstraction — selection, config gating, and the
// safe log fallback. No live network is touched (provider send() paths hit real
// vendor APIs and are exercised in staging, not unit tests).

import { describe, expect, it } from "vitest";
import {
  configuredProviderName,
  isSmsProviderConfigured,
  smsConfigErrors,
  getSmsSender,
  digitsOnly,
  otpMessage,
} from "./index";

const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

describe("configuredProviderName", () => {
  it("recognizes known providers case-insensitively", () => {
    expect(configuredProviderName(env({ SMS_PROVIDER: "twilio" }))).toBe("twilio");
    expect(configuredProviderName(env({ SMS_PROVIDER: "MSG91" }))).toBe("msg91");
    expect(configuredProviderName(env({ SMS_PROVIDER: "Exotel" }))).toBe("exotel");
    expect(configuredProviderName(env({ SMS_PROVIDER: "log" }))).toBe("log");
  });

  it("returns null for unknown or unset values", () => {
    expect(configuredProviderName(env({ SMS_PROVIDER: "nexmo" }))).toBeNull();
    expect(configuredProviderName(env({}))).toBeNull();
  });
});

describe("isSmsProviderConfigured", () => {
  it("is true only when a real provider has all required keys", () => {
    expect(
      isSmsProviderConfigured(
        env({ SMS_PROVIDER: "twilio", TWILIO_ACCOUNT_SID: "AC", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+1" })
      )
    ).toBe(true);
  });

  it("is false when a required key is missing", () => {
    expect(isSmsProviderConfigured(env({ SMS_PROVIDER: "twilio", TWILIO_ACCOUNT_SID: "AC" }))).toBe(false);
  });

  it("is false for the log provider (it is not real delivery)", () => {
    expect(isSmsProviderConfigured(env({ SMS_PROVIDER: "log" }))).toBe(false);
  });
});

describe("smsConfigErrors", () => {
  it("is clean in development regardless of missing keys", () => {
    expect(smsConfigErrors(env({ NODE_ENV: "development" }))).toEqual([]);
    expect(smsConfigErrors(env({ NODE_ENV: "development", SMS_PROVIDER: "twilio" }))).toEqual([]);
  });

  it("flags an unknown provider value even in development", () => {
    expect(smsConfigErrors(env({ NODE_ENV: "development", SMS_PROVIDER: "nexmo" }))).toHaveLength(1);
  });

  it("requires a configured real provider in production", () => {
    expect(smsConfigErrors(env({ NODE_ENV: "production" }))).toHaveLength(1);
    expect(smsConfigErrors(env({ NODE_ENV: "production", SMS_PROVIDER: "log" }))).toHaveLength(1);
    expect(
      smsConfigErrors(env({ NODE_ENV: "production", SMS_PROVIDER: "exotel", EXOTEL_SID: "s" }))[0]
    ).toContain("EXOTEL_API_KEY");
  });

  it("is clean in production with a fully-configured provider", () => {
    expect(
      smsConfigErrors(
        env({
          NODE_ENV: "production",
          SMS_PROVIDER: "msg91",
          MSG91_AUTH_KEY: "k",
          MSG91_TEMPLATE_ID: "t",
        })
      )
    ).toEqual([]);
  });
});

describe("getSmsSender", () => {
  it("returns the real provider when fully configured", () => {
    const sender = getSmsSender(
      env({ SMS_PROVIDER: "twilio", TWILIO_ACCOUNT_SID: "AC", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+1" })
    );
    expect(sender.name).toBe("twilio");
  });

  it("falls back to the log sender when unconfigured", () => {
    expect(getSmsSender(env({})).name).toBe("log");
    expect(getSmsSender(env({ SMS_PROVIDER: "twilio" })).name).toBe("log"); // missing keys
  });

  it("log sender always succeeds without sending", async () => {
    const result = await getSmsSender(env({})).sendOtp("+15550001111", "123456");
    expect(result.ok).toBe(true);
  });

  // B3: sendMessage — the same widened-interface method every appointment
  // confirmation/reminder goes through.
  it("log sender's sendMessage always succeeds without sending", async () => {
    const result = await getSmsSender(env({})).sendMessage("+15550001111", "Your appointment is confirmed.");
    expect(result.ok).toBe(true);
  });

  it("MSG91's sendMessage fails explicitly rather than guessing at an unverified endpoint", async () => {
    const sender = getSmsSender(
      env({ SMS_PROVIDER: "msg91", MSG91_AUTH_KEY: "k", MSG91_TEMPLATE_ID: "t" })
    );
    expect(sender.name).toBe("msg91");
    const result = await sender.sendMessage("+15550001111", "Your appointment is confirmed.");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("DLT");
  });
});

describe("helpers", () => {
  it("digitsOnly strips non-digits", () => {
    expect(digitsOnly("+91 98450-12345")).toBe("919845012345");
  });

  it("otpMessage embeds the code and never promises to share it", () => {
    const msg = otpMessage("246813");
    expect(msg).toContain("246813");
    expect(msg.toLowerCase()).toContain("do not share");
  });
});
