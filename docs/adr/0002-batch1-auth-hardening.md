# ADR-0002 — Batch 1 authentication hardening: real OTP and login gating

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Head of Engineering (AEO-001 Sprint 2, Batch 1)
- **Release / Sprint:** Release 1.2 / Sprint 2 — Batch 1 (Security & Multi-Tenancy Foundation)

## Context

Batch 0 validation found that most of Batch 1's surface (credentialed staff
login, hashed sessions, capability authorization, tenancy scoping on the list
endpoints, doctor-workspace protection) already existed in the approved
baseline. Two genuine authentication gaps remained:

1. **Patient OTP was a fixed public secret.** `/api/auth/otp/send` returned a
   hardcoded `123456` and `verify` accepted only `123456` — anyone could sign
   in as any patient by phone number (debt D2/L1, code marker SEC-3).
2. **Deactivation didn't actually deny access.** `User.is_active` is documented
   as the login gate and is set by `setStaffActive`, but `/api/auth/login`
   never checked it and deactivation didn't revoke live sessions — a
   deactivated staff member could still sign in and keep an existing 12h
   session.

No SMS provider is wired (see `src/lib/config.ts`), which constrains how "real"
OTP delivery can be right now.

## Decision

**Real one-time OTP.** Add an additive `OtpChallenge` table and an
`otp-service` that issues a cryptographically-random 6-digit code, stored only
as a scrypt hash (reusing the existing password hasher — a generic string
hash), with a 10-minute expiry, a 5-attempt per-challenge cap, single-use
consumption, and at most one live code per phone number. `verify` checks
against it; a single generic failure message covers wrong/expired/locked.
Because delivery isn't wired yet, the code is echoed in the `send` response
**only in non-production** (`shouldEchoOtp`), preserving the pilot/demo/test
flow while production never returns it.

**Enforce the login gate.** `/api/auth/login` rejects a deactivated account
*after* verifying the password (so it can't enumerate accounts), with a
distinct 403. `setStaffActive` deletes the member's sessions on deactivation so
access ends immediately, not at session expiry.

## Alternatives considered

- **Keep `123456` until an SMS provider lands** — rejected. The fixed secret is
  the single largest remaining auth hole; a real per-request, expiring,
  single-use code is a genuine improvement independent of delivery, and the
  non-production echo is no worse than today's behavior while production is
  strictly better (no secret returned).
- **Reuse the `Contact.verified_at` field instead of a new table** — rejected;
  it models a different fact (a contact point's verification state), has no
  place for a hashed challenge, expiry, or attempt count.
- **Check `is_active` on every authenticated request in `readSession`** —
  rejected as the primary mechanism (a per-request user lookup on every call);
  login-time gating plus immediate session revocation on deactivation gives the
  same "access ends now" guarantee without the steady-state cost.

## Consequences

- Positive: patient login is no longer a public constant; deactivation denies
  access immediately. Retires debt D2/L1. Both paths are regression-covered
  (`otp-service.test.ts`, `login/route.test.ts`, `onboarding-service.test.ts`).
- Negative / cost: without an SMS provider, non-production still echoes the code
  — a deliberate bridge, gated to never happen in production. A real provider
  key is the next required config (tracked in `config.ts`). OTP attempt-counter
  increments are read-then-write (no row lock), acceptable at pilot scale like
  the existing queue-number pattern (debt D11).
- Out of scope, logged as debt: `/api/doctors` still returns doctor email/phone
  to any authenticated caller cross-tenant (now tracked as D14 in
  `docs/technical-debt.md`, previously only an inline code comment).
