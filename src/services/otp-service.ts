// Batch 1 (SEC-3): real one-time patient OTP, replacing the fixed shared
// secret "123456". A code is cryptographically random, stored only as a
// scrypt hash (reusing the staff-password hasher — a generic string hash, not
// password-specific), short-lived, single-use, and attempt-capped per
// challenge. This is the server-side half of /api/auth/otp/send + verify.
//
// Delivery is handled by the caller, not here: the send route hands the code to
// the pluggable SMS layer (H1, `src/lib/sms/`). issueOtpChallenge returns the
// plaintext code so it can be delivered (and, when no real provider is
// configured, echoed in non-production); it is never persisted or logged in
// plaintext.

import { randomInt } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes — long enough to read an SMS, short enough to limit exposure
const MAX_ATTEMPTS = 5; // per challenge, independent of the endpoint rate limit

/** A uniformly-distributed 6-digit code (leading zeros preserved). */
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Issues a fresh OTP for a phone number, invalidating any prior un-consumed
 * challenge for that number (only one code is ever live at a time). Returns
 * the plaintext code for the caller to deliver/echo — it is stored only as a
 * hash.
 */
export async function issueOtpChallenge(
  phoneNumber: string
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$transaction([
    // Supersede any still-open code for this number so a new send always wins.
    prisma.otpChallenge.deleteMany({
      where: { phone_number: phoneNumber, consumed_at: null },
    }),
    prisma.otpChallenge.create({
      data: { phone_number: phoneNumber, code_hash: codeHash, expires_at: expiresAt },
    }),
  ]);

  return { code, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "locked" };

/**
 * Verifies a submitted code against the latest live challenge for the phone
 * number. Consumes the challenge on success (single-use). On a wrong code the
 * attempt counter is incremented; once it reaches MAX_ATTEMPTS the challenge
 * is locked and a new code must be requested. Returns a discriminated reason
 * so the route can log why without leaking it to the client.
 */
export async function verifyOtpChallenge(
  phoneNumber: string,
  code: string,
  options: { consume?: boolean } = {}
): Promise<OtpVerifyResult> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone_number: phoneNumber, consumed_at: null },
    orderBy: { created_at: "desc" },
  });

  if (!challenge) return { ok: false, reason: "invalid" };
  if (challenge.expires_at < new Date()) return { ok: false, reason: "expired" };
  if (challenge.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };

  const matches = await verifyPassword(code, challenge.code_hash);
  if (!matches) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "invalid" };
  }

  // Consume by default. Callers that need to verify validity without spending
  // the code (e.g. the multi-profile picker round-trip) pass { consume: false }
  // and consume it on the follow-up call that actually opens the session.
  if (options.consume !== false) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumed_at: new Date() },
    });
  }
  return { ok: true };
}
