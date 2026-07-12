# SMS Provider (H1 / SEC-3, widened in Release 1.2 Batch 2 / B3)

Engineering reference for the pluggable SMS delivery layer. Originally built to
close the #1 pilot gate from the Milestone 1 Release Candidate Report (a real
OTP was issued but only echoed on-screen — no delivery channel); widened in
Batch 2 to also carry appointment booking confirmations and reminders (see
`docs/patient-communication-and-feedback.md` §1a, ADR-0005).

**Approved provider for the Solo Practice MVP: Twilio** (Release Governor
decision, Batch 2 review, 2026-07-10). MSG91 and Exotel remain implemented
but are not the pilot path — MSG91 specifically cannot deliver non-OTP
messages without a separate DLT transactional template (TD-B2-1), so it does
not gate pilot readiness either way.

## Design

- **One interface, no lock-in.** `SmsSender` in `src/lib/sms/index.ts`
  exposes `sendOtp(phone, code)` and `sendMessage(phone, message)`. Providers
  live in `src/lib/sms/providers/`.
- **Env-driven selection.** `SMS_PROVIDER = twilio | msg91 | exotel | log`. A
  factory (`getSmsSender`) picks the implementation; switching providers is a
  deploy-time config change, never a code change.
- **Zero new dependencies.** Each provider is a single documented `fetch` to the
  vendor's REST API (no SDKs).
- **Fail-fast in production.** `collectConfigErrors` (startup validation) rejects
  a production boot without a fully-configured real provider, and forbids the
  `log` provider in production. Already test-covered for Twilio specifically
  (`src/lib/config.test.ts`).
- **Safe dev fallback.** With no provider configured (or a half-configured one),
  the `log` sender records the delivery intent (and, for OTP, the send route
  echoes the code on-screen) — non-production only, never in production.

## Configuration

See [`.env.example`](../.env.example). Required variables per provider:

| Provider | Required env |
|----------|--------------|
| `twilio` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| `msg91`  | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (DLT-approved OTP template) |
| `exotel` | `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_FROM` (+ optional `EXOTEL_SUBDOMAIN`) |
| `log`    | none (dev/test only) |

## Behaviour

- `POST /api/auth/otp/send` issues the code (`otp-service`), then delivers via the
  configured provider. On provider failure it returns **503** ("Could not send
  the verification code") so the caller can retry; the code was never exposed.
- The OTP itself is unchanged: cryptographically random, stored only as a scrypt
  hash, single-use, attempt-capped, and rate-limited at the endpoint.
- Real providers **never** log the OTP in plaintext. Only the `log` (dev) channel
  prints it, and only in non-production.
- Booking confirmation and the appointment reminder (`SmsDeliveryHandler`,
  `src/lib/event-handlers.ts`) go through `sendMessage`, the same provider,
  same env vars, no separate configuration.

## Batch 3 (B2): Twilio staging setup & verification runbook

**This section is a runbook for a human operator with billing authority — it
requires creating and funding a real Twilio account, which is outside what
engineering execution can perform.** The engineering side of this batch (config
validation, the delivery code path) is already complete and test-covered;
what follows is the human procedure to activate and verify it.

1. **Create/access a Twilio account** at twilio.com. A trial account can send
   real SMS to a small set of verified numbers — enough for staging
   verification — but cannot send to arbitrary patient numbers; move to a
   paid account before the real pilot.
2. **Get credentials** from the Twilio Console dashboard: *Account SID* and
   *Auth Token* (both on the console home page).
3. **Get a sender number**: Phone Numbers → Buy a Number, choosing one with
   SMS capability for your target country. This becomes `TWILIO_FROM`.
4. **Set three environment variables** in the staging deployment (not
   committed to the repo — see `.env.example`):
   ```
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=<from step 2>
   TWILIO_AUTH_TOKEN=<from step 2>
   TWILIO_FROM=<from step 3, E.164 format, e.g. +15551234567>
   ```
5. **Restart the app.** `validateStartupConfig()` (`src/lib/config.ts`) fails
   startup immediately with a clear message if any of the three are missing —
   if the app starts cleanly, configuration is structurally valid. This does
   **not** prove Twilio will accept the credentials, only that the app has
   what it needs to try.
6. **Verify OTP delivery end-to-end:** log in as a patient on staging with a
   real phone number you control. A real SMS should arrive with the OTP
   (compare against `otpMessage()` in `src/lib/sms/index.ts`). If it doesn't
   arrive, check the app logs for `[SMS:twilio] send failed` — the logged
   error is Twilio's own rejection reason (bad number format, unverified
   trial-account destination, insufficient balance, etc.).
7. **Verify booking confirmation + reminder end-to-end:** book a real
   appointment on staging (as that same real-number patient) with a
   `scheduled_time` a few minutes out. Confirm the confirmation SMS arrives
   immediately, and the reminder SMS arrives once the appointment crosses
   into the 3-hour window (for a fast staging check, an appointment already
   inside the window at booking time should get its reminder within one
   5-minute sweep tick — see `REMINDER_SWEEP_INTERVAL_MS`).
8. **Record the outcome** (delivered / not delivered, any Twilio error codes
   seen) — this is the actual "verified" evidence RC1/RC2 will ask for.

**What engineering cannot do on your behalf:** create the Twilio account,
provide payment details, or observe a real phone receiving a real SMS. Steps
1–3 and the "did it arrive" checks in 6–8 need a human with a real phone and
a funded account.

## Not exercised in CI

Provider `send()` paths hit live vendor APIs and are validated in staging with
real credentials, not in unit tests. Unit tests cover selection, config gating,
and the log fallback (`src/lib/sms/index.test.ts`, `src/lib/config.test.ts`).
