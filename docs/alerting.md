# Auriva — Operational Alerting (RG-001)

Engineering reference for the production alerting capability. This closes the
distinction the Product Office rightly insisted on: **"logs exist" is not "someone
is notified when production is failing."** Alerting is a **mandatory Code-Freeze
entry criterion**.

## What it does

Three concrete production conditions dispatch an alert to a configured channel:

| # | Condition | Trigger point | Severity |
|---|-----------|---------------|----------|
| 1 | **Readiness / database unreachable** | `/api/ready` catch (`SELECT 1` fails) | critical |
| 2 | **Application crash** | `unhandledRejection` / `uncaughtException` (`src/instrumentation.ts`) | critical |
| 3 | **5xx error-rate spike** | `serverError()` — ≥10 server errors in a rolling minute (`src/api/http.ts`) | critical |

The true "health endpoint is down" case (the process itself is dead) cannot
self-alert — that is what an **external uptime monitor** hitting `/api/health` is
for (see §Deployment below). Auriva alerts on everything it can observe from
inside a still-running process.

## Design

- **Pluggable, no lock-in** (`src/lib/alerts/`): one `AlertChannel` interface,
  env-selected. Real channels are webhook POSTs (Slack `{text}`, Discord
  `{content}`, or a generic webhook) — no vendor SDK.
- **Never breaks the app:** `reportAlert()` is fire-and-forget and never throws;
  a channel outage degrades to a logged failure, not a request failure.
- **No alert storms:** alerts are deduped per (severity+title) within a 5-minute
  window, so a broadly-failing production sends one alert, not thousands.
- **Fail-fast config:** production requires `ALERT_CHANNEL` (real) + a webhook URL,
  enforced at startup (`validateStartupConfig`) — a prod deploy cannot silently run
  blind. `log` is forbidden in production.
- **Single-instance caveat:** the 5xx-rate counter is in-memory per process (same
  as the rate limiter). Fine for a single-instance pilot; a shared counter is a
  post-scale concern.

## Configuration

See `.env.example`. In production set:

```
ALERT_CHANNEL=slack          # or discord | webhook
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
```

A single founder Slack/Discord channel (or generic webhook to email) is a
perfectly acceptable starting destination — the requirement is *delivery*, not
sophistication.

## Verification procedure (satisfies the "VERIFIED alert" criterion)

**Status: mechanics verified for real (RC1 engineering push, 2026-07-10);
delivery to an actual Slack/Discord workspace still requires a human.**

This file previously claimed live delivery "cannot be done in the build
sandbox — no outbound webhook." That was incomplete: a real local HTTP
server is enough to prove the actual code path — payload construction,
headers, and error handling — with a genuine network round-trip, no `fetch`
mocking. What a local server *cannot* prove is that a message lands in a
human's actual Slack/Discord workspace, since that needs a real account.
Both halves are now handled honestly, separately:

**Verified with a real local server, now permanent regression coverage
(`src/lib/alerts/index.test.ts`, `src/api/http.test.ts`,
`src/app/api/ready/route.test.ts`):**
1. A real HTTP POST is delivered for the `webhook`, `slack`, and `discord`
   channel shapes — `{ text }` for Slack, `{ content }` for Discord, the
   full structured alert for a generic webhook — each confirmed against
   what a real local server actually received, not an assumed shape.
2. A non-2xx response from the receiving endpoint is logged, not thrown —
   confirmed against a real server actually returning 500.
3. **Condition 1 (readiness/DB-unreachable):** `/api/ready`'s route-level
   wiring is directly tested — a simulated DB failure produces both the 503
   response and exactly one `reportAlert` call with the correct
   severity/title/detail.
4. **Condition 3 (5xx rate):** `http.ts`'s own threshold/dedupe logic is
   directly tested — the 10th error in a rolling minute fires exactly one
   alert; further errors in the same window do not re-fire. (This test
   also caught and fixed a real test-isolation bug — the 5xx counter is
   shared module state across the whole test file — worth knowing as a
   general caution for anyone adding tests against this counter later.)

**Still requires a human, in a real staging environment, and is not
overstated as done:**
1. Configure `ALERT_CHANNEL` + `ALERT_WEBHOOK_URL` against a **real** Slack/
   Discord workspace/webhook (not a local test server) and confirm a
   message is actually visible to a human.
2. **Condition 2 (crash):** triggering a real `uncaughtException` in a
   staging deploy and confirming the orchestrator actually restarts the
   process — this is inherently a live-deployment behavior no local test
   can substitute for.
3. Record screenshots of delivered alerts as the acceptance evidence for
   RC2/RC3.

## Explicitly NOT included (still deferred, documented)

- No metrics/APM/tracing pipeline (Datadog/Grafana/OTel) — deferred, attaches at
  `src/api/logger.ts` when wanted (TD-H4-1). Non-blocking for pilot.
- No paging/on-call rotation, no alert severity routing — a single channel is the
  pilot bar.
