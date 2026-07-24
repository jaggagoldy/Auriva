# 13 — Events

← [12 API Concepts](./12-api-concepts.md) · [Index](./00-README.md) · Next: [14 Security](./14-security.md)

## What the Event Platform is

**OPS-001C — Shared Event Platform** is a Sprint-3 platform-foundation deliverable, ✅ **Complete**. It provides: publish, retry, dead-letter-queue (DLQ), and replay, plus audit hooks. It generalizes an instinct that already existed in the codebase — `AppointmentEvent`, an append-only fact trail on appointments — into a platform-wide mechanism.

**Data model:**
- `EventLog` — the durable record of a published fact (`event_type`, `organization_id`, `actor_id`, `entity_id`, `correlation_id`, `payload_json`, timestamps).
- `EventHandlerLog` — per-subscriber delivery state (`status`: PENDING/PROCESSING/COMPLETED/FAILED/DEAD_LETTER, `retry_count`, `last_error`, `last_attempt_at`), unique per `(event_log_id, handler_name)`.

**Architectural rationale (from the fuller APS-018 design document, `docs/event-architecture.md`):** Auriva's modules should publish **facts** ("AppointmentBooked") to a shared backbone rather than calling each other directly — a publisher should never need to know or care who subscribes. This is what lets a clinic without Billing activated simply mean "billing events have no subscriber," rather than needing conditional wiring per module combination. The rule of thumb: **the actor's own transaction is synchronous (a command); everyone else finds out by event.** Authorization checks, slot availability, payment confirmation, and prescription signing all remain synchronous commands — only the resulting *facts* are published as events.

**What's actually wired today:** `staff.provisioned` (managed-provisioning notification path) is confirmed wired through this bus. The platform-wide event catalog described in `docs/event-architecture.md` (identity/organization/workforce, patient, scheduling, clinical, financial domains, etc.) is the **architectural design** for where this generalizes — not a claim that every one of those ~30+ catalog events has a live publisher/subscriber in the shipped Professional Edition today. Treat the full catalog document as the platform's intended shape, and this KB's "what's built" framing (Delivery Dashboard: "publish/retry/DLQ exists; `staff.provisioned` wired") as the currently-verified subset.

## What the Event Platform is explicitly NOT

This is the single most important thing to get right about this system, because the name invites confusion:

> **The Event Platform is event *publishing* infrastructure — retry, DLQ, replay, and audit hooks for facts moving between backend modules. It is NOT a user-facing notification system.**

There is **no** SMS delivery, **no** email delivery, and **no** push-notification delivery anywhere in the shipped product. The in-app `Notification` model (patient-facing, see [11-database-concepts.md](./11-database-concepts.md)) is a **projection** built from Event Platform events — but the Notification/Announcement/Preferences *platform* that a reader might reasonably infer from "Auriva has an Event Platform" **does not exist**. This was explicitly corrected in `AGENTS.md`:

> **Corrected 2026-07-08:** earlier drafts mislabeled OPS-001 as a "Notification Platform" that was never built — see APS-032. The notification/announcement/preferences platform does **not** exist.

## What actually delivers a notification to a human today

| Channel | Exists? |
|---|---|
| In-app notification list (`Notification` rows, patient-facing) | ✅ Yes — `GET /api/patients/[id]/notifications`, `patient/notification-center.tsx` |
| SMS | ❌ No provider wired for general notifications (a separate SMS path exists narrowly for patient OTP delivery once a provider is configured — see [14-security.md](./14-security.md) — but that is authentication, not a notification system) |
| Email | ❌ No |
| Push | ❌ No |
| WhatsApp | Used only as a **delivery mechanism for staff invite links** (copy-link/WhatsApp share, per ADR-003) — not a notification channel for ongoing app events |

This is called out explicitly as a **Known Limitation** in `docs/RELEASE-CANDIDATE.md`: *"Notifications are in-app only (no SMS/email delivery)."*

## Priority and audit classes (from the fuller architectural design)

| Priority | Meaning |
|---|---|
| P0 | Clinical-safety (delivery + acknowledgement monitored, seconds) |
| P1 | Operational-realtime (live boards, seconds) |
| P2 | Standard business (minutes) |
| P3 | Analytical/batch (hours acceptable) |

| Audit class | Meaning |
|---|---|
| A2 | Full, immutable, register-feeding — all clinical/financial/access facts |
| A1 | Standard operational trail |
| A0 | Telemetry — aggregatable, prunable |

## Governance rules (from `docs/event-architecture.md`, for context)

- **Naming convention:** `<domain>.<entity>.<fact>` — lowercase, dot-separated, past-tense fact, schema-versioned on the wire (e.g. `scheduling.appointment.booked.v1`).
- **The publishing domain is the only legal publisher of its own events** — no cross-domain event forgery.
- **At-least-once delivery + idempotent consumers is law** — this is precisely why `Notification.source_event_id` is unique (see [11](./11-database-concepts.md)): a redelivered event must be a safe no-op, not a duplicate notification.
- **Events carry what happened, never "do this."** Commands stay synchronous, direct calls.

## Practical implications for anyone extending Auriva

1. If asked to "add a notification channel" (SMS/email/push), recognize this as new infrastructure — not a flip of an existing switch. It needs an actual provider integration (see the SMS/OTP provider gap in [15-operations.md](./15-operations.md) and [17-roadmap.md](./17-roadmap.md)).
2. If asked "does Auriva have an event bus," the accurate answer is: yes, for internal fact-publishing with retry/DLQ/replay/audit — not for outbound human notifications.
3. Any new module that needs to react to another module's action should be designed as an event subscriber, consistent with the "dependencies point downward, upward communication is by events" architectural rule — never a new direct service-to-service call.
