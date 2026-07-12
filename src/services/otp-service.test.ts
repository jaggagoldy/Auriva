// Batch 1 (SEC-3): coverage for the real one-time OTP that replaced the fixed
// "123456". Integration tests against the real SQLite DB (same convention as
// the other service tests) — the security properties (single-use, expiry,
// attempt lockout, one-live-code-per-number) are exactly what a regression
// here would silently undo, so they are asserted against real rows.

import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { issueOtpChallenge, verifyOtpChallenge } from "./otp-service";

const phones: string[] = [];
function newPhone() {
  const p = `+1555${randomUUID().replace(/\D/g, "").slice(0, 7)}`;
  phones.push(p);
  return p;
}

afterEach(async () => {
  await prisma.otpChallenge.deleteMany({ where: { phone_number: { in: phones } } });
});

describe("otp-service", () => {
  it("issues a 6-digit code, stored only as a hash", async () => {
    const phone = newPhone();
    const { code } = await issueOtpChallenge(phone);
    expect(code).toMatch(/^\d{6}$/);

    const row = await prisma.otpChallenge.findFirst({ where: { phone_number: phone } });
    expect(row).not.toBeNull();
    expect(row!.code_hash).not.toBe(code); // never the plaintext
    expect(row!.code_hash.startsWith("scrypt$")).toBe(true);
  });

  it("verifies the correct code exactly once (single-use)", async () => {
    const phone = newPhone();
    const { code } = await issueOtpChallenge(phone);

    expect(await verifyOtpChallenge(phone, code)).toEqual({ ok: true });
    // Replaying the same code fails — it was consumed.
    expect(await verifyOtpChallenge(phone, code)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a wrong code", async () => {
    const phone = newPhone();
    const { code } = await issueOtpChallenge(phone);
    const wrong = code === "000000" ? "111111" : "000000";
    expect(await verifyOtpChallenge(phone, wrong)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects when no code was ever issued", async () => {
    expect(await verifyOtpChallenge(newPhone(), "123456")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired code", async () => {
    const phone = newPhone();
    const { code } = await issueOtpChallenge(phone);
    await prisma.otpChallenge.updateMany({
      where: { phone_number: phone },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    expect(await verifyOtpChallenge(phone, code)).toEqual({ ok: false, reason: "expired" });
  });

  it("locks the challenge after 5 wrong attempts", async () => {
    const phone = newPhone();
    const { code } = await issueOtpChallenge(phone);
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i++) {
      expect(await verifyOtpChallenge(phone, wrong)).toEqual({ ok: false, reason: "invalid" });
    }
    // Even the correct code is now refused — a new one must be requested.
    expect(await verifyOtpChallenge(phone, code)).toEqual({ ok: false, reason: "locked" });
  });

  it("supersedes a prior un-consumed code when a new one is issued", async () => {
    const phone = newPhone();
    const { code: first } = await issueOtpChallenge(phone);
    const { code: second } = await issueOtpChallenge(phone);

    const rows = await prisma.otpChallenge.findMany({ where: { phone_number: phone } });
    expect(rows).toHaveLength(1); // only the latest survives

    expect(await verifyOtpChallenge(phone, first)).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyOtpChallenge(phone, second)).toEqual({ ok: true });
  });
});
