# Observability & Operations Guide

**Scope:** Release 1.1 Sprint 2 (OBS-1/2/3, INF-5). Extends Sprint 1's security/testing/CI foundation — this document covers logging, audit, health checks, and troubleshooting for day-to-day operation.

---

## 1. Logging Strategy

**Where:** `src/api/logger.ts` — the one place every log line in the API layer goes through. Route/service code never calls `console.*` directly (enforced by convention, not tooling — see Section 5 for how to check this hasn't drifted).

**Levels** (standardized, in increasing severity): `debug` → `info` → `warn` → `error`.
- `debug`: expected, low-noise internal state (e.g. an idempotency skip in the event platform).
- `info`: a normal operation completed (e.g. a login succeeded, an event handler finished).
- `warn`: something failed but the system handled it (e.g. a login attempt was rejected, a handler failed and will retry).
- `error`: something failed and needs attention (e.g. a handler exhausted its retries and moved to dead-letter, a database call in `serverError()`'s catch-all failed).

**Format:** every line is a single JSON object — `{ level, ts, context, requestId?, detail? }` — printed via `console.debug/log/warn/error` (still swappable for a real transport like pino/OTel later; nothing else in the codebase depends on the console call itself).

**Redaction:** `logger`'s internal `redact()` strips any object key matching a known-sensitive name (`password`, `password_hash`, `token`, `token_hash`, `otp`, `code`, `authorization`, `cookie`, `secret` — case-insensitive) to `"[REDACTED]"`, recursively, before the line is ever serialized. This is structural — a call site logging an object that happens to contain one of these keys cannot leak it, rather than relying on every call site remembering to scrub first.

**Correlation IDs:** `runWithRequestId`/`currentRequestId`/`withRequestId` in `logger.ts` thread one id (read from an incoming `x-request-id` header, or generated) through every log line emitted while handling one request, via `AsyncLocalStorage` — no need to pass an id through every function call manually. Adopted so far on the four auth routes (`/api/auth/login`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/logout`) — the highest-value surface for incident correlation (see Section 6, "Known Limitations," for why it stops there this sprint). The id is also echoed back as an `x-request-id` response header so a client/user can quote it when reporting an issue.

**Adopting correlation IDs on another route:**
```ts
import { withRequestId } from "@/api/logger";

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    // ...existing handler body, unchanged...
  });
}
```

---

## 2. Error Envelope Standard (OBS-2)

Every API error response is `{ error: <label>, message: <string> }`, built exclusively through `src/api/http.ts`'s helpers — never a hand-rolled `NextResponse.json(...)` for an error case.

| Status | Helper | Label | When |
|---|---|---|---|
| 400 | `badRequest(msg)` | Bad Request | Malformed/incomplete request |
| 401 | `unauthorized(msg)` | Unauthorized | No/invalid session |
| 403 | `forbidden(msg)` | Forbidden | Authenticated, but not authorized for this resource |
| 404 | `notFound(msg)` | Not Found | Resource doesn't exist (or, deliberately, to hide cross-tenant existence) |
| 409 | `conflict(msg)` | Conflict | A state-machine transition or uniqueness rule was violated |
| 422 | `unprocessableEntity(msg)` | Unprocessable Entity | *(new this sprint, available for future well-formed-but-semantically-invalid input; no existing route's status code changed to adopt it — that would be a contract change)* |
| 429 | `tooManyRequests(msg, retryAfterSeconds)` | Too Many Requests | Rate limit exceeded (SEC-5) — also sets a `Retry-After` header |
| 500 | `serverError(context, error)` | Internal Server Error | Unhandled/unexpected failure — logs via `logger.error` first |
| 503 | `serviceUnavailable(msg)` | Service Unavailable | *(new this sprint, INF-5)* `/api/ready` reports a dependency is unreachable |

**`mapDomainError(error)`** is the single place a thrown service-layer error class (e.g. `AppointmentNotFoundError`, `InvalidTransitionError`) maps to one of the above. Every route's `catch` block should be `mapDomainError(error) ?? serverError(context, error)` — if a route instead has its own local `instanceof` chain, that's the exact anti-pattern OBS-2 removed this sprint (see the three `/api/organizations/[id]/events*` routes' history). Adding a new service error class means adding one line to `mapDomainError`, not touching every route that might throw it.

**Preserved historical quirk** (documented in `http.ts`'s own header comment — real clients may depend on it):
1. `POST /api/appointments`'s missing-patient/doctor/clinic error uses label "Not Found" with HTTP **400**, not 404.

> **Updated (H2, 2026-07-09):** `serverError()` previously always returned the raw `error.message` as `details`. It is now **suppressed in production** (logged server-side only) to avoid leaking internals; `details` remains present outside production for developer ergonomics.

---

## 3. Audit Trail (OBS-3)

**Table:** `Audit_Logs` (Sprint 3's `AuditLog` model) — organization-scoped, `organization_id` is a required (non-null) column. Two producers feed it:

1. **Event-platform-driven** (`src/lib/event-handlers.ts`'s `auditLogHandler`, unchanged this sprint): every event in `AUDITED_EVENT_TYPES` (`appointment.booked/rescheduled/cancelled/checked_in`, `prescription.ready`, `invoice.generated`, `payment.received`, `staff.invited`) is automatically written here when published. **Appointment cancellation and invoice payment were already fully covered before this sprint** — verified, not re-implemented.
2. **Direct writes** via `src/lib/audit.ts`'s `recordAudit()` — the mechanism this sprint added, for actions that are facts about *who did something*, not business events other subscribers need to react to (so the event platform's retry/fan-out machinery would be the wrong tool). New actions covered: `user_login`, `user_logout`, `patient_profile_updated`, `doctor_profile_updated`, `patient_onboarding_completed`. `appointment.cancelled`'s actor attribution was also completed this sprint — the doctor-console and patient/reception cancel paths previously called `transitionStatus()` without an `actorUserId`, so cancellations were logged with no actor; both call sites now pass it.

**Known, documented gap — not silently absorbed:** `AuditLog.organization_id` cannot be null. A **self-registered** patient (OTP-only signup, no registering clinic — the common case) has no resolvable organization. For that patient's login/logout/profile-update/onboarding actions, `recordAudit()` is a deliberate no-op (logged at `debug` level, e.g. `"[audit] Skipped — no resolvable organization for action user_login"`) rather than fabricating a tenant. A **reception-registered** patient (has `registered_by_clinic_id`) *is* fully audited. Closing this gap for all patients would mean loosening `AuditLog.organization_id` to nullable — a schema change, explicitly out of this sprint's "extend, don't redesign" mandate. Flagged here for the Product Office/next architecture review, not fixed unilaterally.

**Adding a new audited action:**
```ts
import { recordAudit, resolveOrganizationIdForStaffUser /* or ...ForPatientProfile */ } from "@/lib/audit";

await recordAudit({
  organizationId: await resolveOrganizationIdForStaffUser(userId, role),
  actorUserId: userId,
  action: "some_new_action",     // snake_case, matches existing action naming
  detail: "human-readable summary",
});
```
`recordAudit()` never throws — a failed audit write is logged (`logger.error`) but never fails the user-facing action it's describing (mirrors how the event platform's own handler-dispatch failures are handled: logged, not propagated).

---

## 4. Health & Readiness Endpoints (INF-5)

| Endpoint | Checks | Use it for |
|---|---|---|
| `GET /api/health` | Nothing external — process uptime, app version, timestamp only | **Liveness**: "is the process itself up and responding." A database outage must never make this fail — that would cause an orchestrator/monitor to restart a perfectly healthy process, which doesn't fix the database and takes traffic offline for no reason. |
| `GET /api/ready` | `SELECT 1` through Prisma | **Readiness**: "can this instance actually serve a real request right now." Returns `503` (`serviceUnavailable`) if the database is unreachable — this is the one Prisma-dependent check the platform has; a successful trivial query proves both DB connectivity and Prisma client availability at once (there's no separate signal for "Prisma is up" apart from it successfully running a query). |

Both are unauthenticated (infra/monitoring tooling hits these, not a signed-in user) and return no sensitive data. Both use the standard `ok()`/`serviceUnavailable()` envelope helpers from `src/api/http.ts` for consistency with every other route (OBS-2).

Deliberately infrastructure-agnostic — plain JSON + standard HTTP status codes, no Kubernetes-specific probe shape. Point any orchestrator's liveness probe at `/api/health` and readiness probe at `/api/ready`; point an uptime monitor (Pingdom, UptimeRobot, etc.) at either depending on whether you want "is it up" or "is it fully working."

---

## 5. Operational Troubleshooting

**"A request failed — how do I find out why?"**
1. If the client captured the `x-request-id` response header (currently populated on the 4 auth routes), grep logs for that id — every log line from that request's handling carries it.
2. Otherwise, search logs by `context` (each log call names what it's describing, e.g. `"auth.login failed"`) or by approximate timestamp.
3. Every log line is one JSON object per line — pipe through `jq` for filtering, e.g. `... | jq 'select(.level=="error")'`.

**"Is the platform actually usable right now?"**
1. `curl /api/health` — if this fails, the process itself is down; restart it.
2. `curl /api/ready` — if this fails but `/api/health` succeeds, the process is up but the database isn't reachable; check the database file/connection, not the app process.

**"Did action X actually happen, and who did it?"**
Query `Audit_Logs` for the relevant `organization_id` and `action` (see Section 3 for the action-name list and the self-registered-patient gap). The Admin workspace's Audit Timeline screen (ORG-7, if built) or a direct database query both read this same table — there's no separate "real" log to reconcile against.

**"An error response looks wrong / inconsistent."**
Check whether the route's `catch` block uses `mapDomainError(error) ?? serverError(...)` (Section 2). If it has its own `instanceof` chain instead, that's drift from the standard — fix it by wiring the error class into `mapDomainError()` in `src/api/http.ts` and simplifying the route, not by adding another local chain.

**"CI's lint step is red."** — Expected right now; see Sprint 1's report (`docs/release-1.1-sprint-1-report.md`, Known Limitations) — it's non-blocking, covering pre-existing debt outside both sprints' locked scope.

---

## 6. Known Limitations (carried from this sprint's implementation report — repeated here for operational visibility)

- Correlation IDs (`x-request-id`) are adopted on the 4 auth routes only, not all ~55 routes. Extending coverage is the same one-line `withRequestId(request, ...)` wrap shown in Section 1 — mechanical, not a design problem — deferred to keep this sprint's footprint proportionate to "where feasible."
- Audit coverage for patient-side actions is incomplete for self-registered (no registering clinic) patients — see Section 3. A schema change (nullable `organization_id`, or a separate platform-wide audit surface) would close this; out of this sprint's scope to decide unilaterally.
- Rate limiting (Sprint 1, SEC-5) and now this sprint's logging are both in-memory/per-process — neither is shared across instances if the platform is ever horizontally scaled. No action needed today (the deployment itself runs a single app instance for the pilot, per the Release Governance single-instance decision — the database, now PostgreSQL as of Release 1.2 Batch 4, is not the limiting factor); revisit together if the deployment scales beyond one instance.

---

## 7. Release 1.2 Hardening — Observability posture (H4, 2026-07-09)

This section supersedes the coverage figures in Sections 1 and 6 and records the
H4 gap-analysis outcome. **Business framing:** the goal is that when a pilot
clinic reports "it didn't work at 2:15pm," an operator can find and explain the
exact request — not to build a monitoring platform Auriva doesn't need yet.

### 7.1 What was already sufficient (verified, not rebuilt)
- **Audit coverage is complete for money and clinical actions.** Every published
  business event is in `AUDITED_EVENT_TYPES` — including `payment.received`,
  `appointment.completed`, `invoice.issued`, and `lab_order.resulted`. The
  visit→payment flow is therefore fully audited **via the event platform**; adding
  manual `recordAudit()` calls on those routes would be redundant. (The
  self-registered-patient `organization_id` gap in Section 3 is unchanged and
  remains the only known audit gap.)
- **Logging** (structured JSON + recursive redaction), **health/readiness**
  (`/api/health`, `/api/ready`), and **startup diagnostics** (`validateStartupConfig`
  fail-fast) needed no change.

### 7.2 What H4 changed (small, pilot-justified)
- **Per-request completion telemetry.** `withRequestId` now emits one
  `request.completed` line per wrapped request — `{ method, path (no query),
  status, duration_ms, requestId }` — inside the correlation context. This gives
  latency + outcome visibility to **every** wrapped route for free.
- **Correlation coverage extended to the pilot-critical write paths.** Wrapped
  routes are now: the 4 auth routes, public bookings, quick-setup, demo-enter,
  **and (new) `/api/clinic/consultation` and `/api/clinic/payment`** — the clinical
  and money halves of the core arrival→payment flow. These are the highest
  support-call-risk endpoints, so they are traceable and timed end to end.

### 7.3 Deliberately deferred (documented, not implemented)
- **Full 80-route correlation rollout.** The remaining routes are mostly reads;
  wrapping them is the same one-line `withRequestId(...)` change with low marginal
  value at pilot scale. Tracked as **TD-H4-1**; extend opportunistically or when a
  specific route proves hard to troubleshoot.
- **External monitoring / APM (Datadog, Grafana, OpenTelemetry, Sentry).** Not
  implemented — it cannot be meaningfully validated in this build environment, and
  a half-wired exporter is worse than a clean seam. **Deployment guidance:** ship
  the structured stdout logs (Section 1) to the platform's log aggregator; if
  metrics/tracing/alerting are wanted, add an OTel exporter or a Sentry SDK at the
  logger boundary (`src/api/logger.ts` is the single sink — the intended
  attachment point) and point the `request.completed` line's fields at your
  dashboard. See `docs/deployment-guide.md` §5 (Logging & Monitoring). Non-blocking
  for a low-volume pilot; recommended before scale.

---

## 8. Support Operational Playbook (H4 review addition)

Repeatable troubleshooting flows for support/ops. All searches key off the
structured logs (Section 1) and the `Audit_Logs` table (Section 3). Every wrapped
request has an `x-request-id` (returned to the client as a header); ask the
reporter to quote it when possible.

### Payment issue ("I completed a visit but the payment didn't record")
Search logs by `x-request-id` (or clinic + patient + timestamp). Expected event
sequence in `Audit_Logs` for that clinic/appointment:
1. `appointment.completed`
2. `invoice.issued`   (the visit invoice — auto-drafted on completion, issued on payment)
3. `payment.received`
- If **`appointment.completed` is missing** → the visit never completed; investigate
  the consultation route (`request.completed` line for `/api/clinic/consultation`).
- If **`payment.received` is missing** → the visit completed but money wasn't
  recorded; investigate `/api/clinic/payment` (check its `request.completed`
  status/duration and any `serverError` line with the same requestId).

### Booking issue ("a patient couldn't book online")
Search for the `/api/public/bookings` `request.completed` line (status tells the
story): `429` → rate-limited (per-IP/phone/doctor — see security report H2-9);
`409` → slot taken / bookings paused (`accepting_bookings` off); `4xx` → validation.
Expected audit event on success: `appointment.booked`.

### OTP / sign-in issue ("I never got my code")
Search for `auth.otp_send` (`/api/auth/otp/send` `request.completed`). If the app
returned `503`, delivery failed → check the **SMS provider's own dashboard/logs**
and credentials/balance (see `docs/sms-provider.md`). A `200` from Auriva means
the code was accepted for delivery — the gap is then downstream at the carrier/
provider, not in Auriva.

### "Is the platform up?"
`curl /api/health` (process) then `curl /api/ready` (database). See Section 5.
