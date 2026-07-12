# ADR-0005 — Time-based appointment reminders (not event-driven)

- **Status:** Accepted
- **Date:** 2026-07-10
- **Deciders:** Engineering Execution Office (Release 1.2 / Batch 2, Founder MVP Blocker B3)
- **Release / Sprint:** Release 1.2 / Batch 2

## Context

B3 requires exactly two triggers: a booking confirmation and one reminder
before the scheduled appointment. Every existing notification trigger
(`appointment.booked/rescheduled/cancelled`, `invoice.issued`,
`lab_order.resulted`, `appointment.completed`) is event-driven — a real state
change publishes an event, handlers react. "3 hours before an appointment"
is not a state change; nothing happens when that threshold crosses except
the passage of time. The Event Platform (`src/lib/events.ts`) has no
scheduling primitive, and none exists anywhere else in the codebase.

## Decision

A small time-based sweep (`src/services/appointment-reminder-service.ts`)
runs on a plain `setInterval` started from `src/instrumentation.ts` (every
5 minutes). It queries `scheduled` appointments whose `scheduled_time` falls
within a fixed 3-hour window and, for each, calls the *existing*
`publishEvent()` with a **deterministic** `eventId`
(`appointment-reminder-<appointmentId>`). From that point everything is
back on the unmodified Event Platform: the same `NotificationHandler` and
`SmsDeliveryHandler` used for `appointment.booked` are simply registered for
the new `appointment.reminder_due` event type as well, sharing the same
copy table. Idempotency across repeated sweep ticks is not reimplemented —
it falls out of `publishEvent`'s existing EventLog upsert +
`dispatchHandler`'s existing per-handler COMPLETED-skip.

The sweep interval itself follows the same single-instance-pilot pattern
already accepted for `src/lib/rate-limit.ts` (in-memory, per-process) and
`src/lib/alerts.ts` (in-memory 5xx-rate window) — documented there as
"good enough for a single-instance pilot," not introduced fresh here.

## Alternatives considered

- **An external cron hitting a `/api/cron/*` endpoint** — rejected for this
  batch. More production-conventional (works across serverless/multi-instance
  deployments) but requires provisioning an external scheduler as a
  deployment task, which doesn't exist yet and isn't part of this batch's
  scope. The sweep function itself (`runAppointmentReminderSweep`) is a
  plain, directly-callable, fully-tested function with no dependency on
  *how* it's invoked — swapping the trigger from `setInterval` to an
  external cron endpoint later is a small, isolated change, not a rewrite.
- **Forcing a fake `EventLog` row for "time passed"** — rejected. The Event
  Platform models real business events; fabricating one for a derived
  time condition would be a category error, not a reuse of the platform.
- **A new `reminder_sent_at` column on `Appointment`** — rejected. Would
  duplicate the idempotency the Event Platform's own EventLog already
  provides for free via a deterministic `eventId`, for no benefit.

## Consequences

- Positive: zero schema change, zero new event-dispatch mechanism, zero new
  idempotency bookkeeping — the only genuinely new primitive is the 5-minute
  interval itself. Regression-covered
  (`notification-handlers.test.ts` — reminder-window, cancelled-appointment
  exclusion, and repeated-sweep idempotency cases).
- Negative / cost: single-instance only, like the rate limiter and alert
  dedupe it mirrors — running more than one app instance would sweep and
  publish redundantly (harmless, since `publishEvent`'s dedup still holds,
  but wasteful). Tracked as the same known single-instance caveat already
  carried by `TD-H2-3`/RG-001's in-memory rate limiter, not a new debt
  category.
- The reminder window (3 hours, fixed, not configurable per clinic) and
  sweep cadence (5 minutes) are named constants in
  `appointment-reminder-service.ts`, not settings — deliberately, per B3's
  "no notification preferences" exclusion.
