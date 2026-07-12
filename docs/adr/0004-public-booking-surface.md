# ADR-0004 — Public (unauthenticated) booking surface

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Head of Engineering (AEO-001 Sprint 2, Batch 3)
- **Release / Sprint:** Release 1.2 / Sprint 2 — Batch 3 (Booking Foundation)

## Context

The #1 solo-practitioner pain point (blueprint §3.2) is missed calls = lost
bookings: every booking today requires an existing patient-portal session or a
staff member. A patient needs to book from a shared link (SMS signature,
Instagram bio, Google listing) with no login and no phone call. This is the
app's first and only mutating surface reachable with no session, so it needs
deliberate blast-radius control.

## Decision

Add a dedicated, unauthenticated `/api/public/*` namespace rather than removing
auth from existing endpoints:

- `GET /api/public/doctors/[id]` — doctor professional identity + clinic
  name/address + bookable slots. Exposes **no** contact PII (contrast the
  authenticated `/api/doctors`, debt D14) and nothing patient-specific.
- `POST /api/public/bookings` — creates a scheduled appointment and, for an
  unknown phone, an inline unverified Healthcare Profile.
- `/book/[doctorId]` — the public page.

The write path orchestrates existing primitives, not new ones: duplicate
detection reuses the phone `Contact` rows, inline creation reuses
`createHealthcareProfile` (the same call walk-in uses), and slot/limit/status
validation reuses `scheduleAppointment` verbatim. Abuse is contained by rate
limiting both the source IP and the target phone number (SEC-5, same shape as
the auth endpoints).

## Alternatives considered

- **Open the existing `/api/doctors/[id]/slots` and booking routes to
  anonymous callers** — rejected; it would widen the exposure of authenticated
  endpoints and entangle public and private contracts. A separate namespace
  keeps the unauthenticated surface small and auditable.
- **Require a lightweight OTP before public booking** — rejected for Sprint 2;
  it reintroduces the phone-call/friction the feature exists to remove. The
  created profile is `unverified` and becomes verified naturally on first OTP
  login, and rate limiting bounds abuse. Revisit if spam proves material.

## Consequences

- Positive: patients self-book with zero friction; returning patients are
  matched by phone, not duplicated; the practitioner sees the booking in their
  existing queue/dashboard. Regression-covered (`booking-service.test.ts`) and
  verified live end-to-end.
- Negative / cost: an unauthenticated endpoint can create rows — mitigated by
  dual rate limits, minimal capability (only a scheduled appointment + an
  unverified profile), and downstream slot validation. Public booking can't
  disambiguate multiple family profiles on one number (it books the
  name-match or first) — the portal's profile switcher is the authenticated
  path for that.
- One-click reception "phone booking" can reuse `bookPublicAppointment` behind
  the authenticated staff guard — noted as remaining work, not built here.
