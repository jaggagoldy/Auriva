# Auriva — Production Deployment Guide (Release 1.2 Hardening, H3)

> The single consolidated source for deploying Auriva. Supersedes infrastructure
> notes previously scattered across the RC report, security report, and
> technical-debt register. Companion docs: `production-checklist.md` (go/no-go),
> `operations-runbook.md` (day-2 ops), `.env.example` (variable reference).
>
> **Guiding principle (Product Office):** Auriva must **never silently assume**
> production infrastructure. Every external dependency below is stated explicitly,
> with what happens if it is missing.

---

## 1. Infrastructure Requirements

| Component | Requirement | Status in code | If missing |
|-----------|-------------|----------------|-----------|
| **Runtime** | Node.js 20 LTS or 22 LTS | Not pinned (no `engines`/`.nvmrc`) | May run on an untested Node — **pin before pilot** (checklist item) |
| **Database** | **PostgreSQL 14+** | ✅ `prisma/schema.prisma` targets PostgreSQL, env-driven via `DATABASE_URL` — see §3 | N/A — resolved (Release 1.2 Batch 4) |
| **TLS** | HTTPS termination (proxy or platform) | App sets HSTS (active only over HTTPS) | HSTS/secure-cookies ineffective; credentials in the clear |
| **Reverse proxy** | Trusted proxy that **overwrites `X-Forwarded-For`** | `clientIp()` trusts the first XFF hop | IP-based rate limits are spoofable (H2-5) |
| **SMS provider** | Twilio / MSG91 / Exotel configured | ✅ Pluggable (H1); **fails fast** if unset in prod | Server refuses to start (by design) |
| **SMTP / email** | Not required today | No email is sent (in-app only; OPS-002 unbuilt) | N/A — reserved for a future release |
| **Object storage** | Not required today | Images are profile/logo/clinic refs; no upload pipeline yet | N/A |
| **Log aggregation** | stdout collector (e.g. platform logs, Loki, CloudWatch) | Structured JSON to stdout w/ redaction + correlation ids | Logs still emit; just not centrally searchable |
| **Process manager / orchestrator** | Restart on crash; probe `/api/health` & `/api/ready` | Endpoints exist (INF-5) | No automatic recovery |

**Single-instance note.** Rate limiting is in-memory (`src/lib/rate-limit.ts`).
Run **one instance** for the pilot, or accept per-instance limits until a shared
store (Redis) is added. Do not autoscale horizontally yet.

---

## 2. Environment Variables

Full reference with placeholders: **`.env.example`**. Summary:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | yes (`production`) | Enables prod behavior (secure cookies, no error-detail leakage, no OTP echo) |
| `DATABASE_URL` | **yes, always** | Postgres connection string, e.g. `postgresql://user@host:5432/auriva?schema=public` |
| `SMS_PROVIDER` | **yes in prod** | `twilio` \| `msg91` \| `exotel` (never `log` in prod) |
| Twilio | if selected | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| MSG91 | if selected | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` |
| Exotel | if selected | `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`, `EXOTEL_FROM` (+ opt. `EXOTEL_SUBDOMAIN`) |
| `DEMO_MODE_ENABLED` | optional | `false` to disable Skip-&-explore/demo endpoints (default on) |

**Startup validation.** `src/instrumentation.ts` runs `validateStartupConfig()`
before serving traffic; an invalid production config (e.g. no SMS provider) makes
the process **fail fast with a clear diagnostic** rather than start broken. Secrets
live only in the environment — none are committed (`.env*` is gitignored except the
placeholder `.env.example`).

---

## 3. Database: PostgreSQL (Release 1.2 Batch 4 — done)

**Status: complete.** `prisma/schema.prisma` targets `postgresql`, connection
string from `DATABASE_URL` (never hardcoded). The SQLite-era migration
history (27 files) was **archived, not deleted**, to
`prisma/migrations-sqlite-archive/` (outside Prisma's scanned
`prisma/migrations/` directory) rather than discarded, since none of it was
ever committed to version control — see
`docs/adr/0006-postgresql-migration.md` for the full reasoning, including why
the migration history was reset to a fresh baseline rather than translated
(no production data exists yet to preserve).

**What was actually verified, not just configured** (engineering-executable —
a local PostgreSQL 16 instance, unlike Twilio/B2, requires no external
account):
- `prisma migrate dev` applied a fresh baseline migration to a real local
  Postgres 16 database with zero errors.
- `prisma db seed` completed successfully against it.
- The full test suite — 360 real integration tests — passed against real
  Postgres (`vitest run`, 360/360, ~19s), not SQLite.
- The three H5 hot-path indexes (`Appointments_clinic_id_scheduled_time_idx`,
  `Appointments_patient_id_idx`, `Payments_clinic_id_received_at_idx`) were
  confirmed structurally usable via `EXPLAIN ANALYZE` — at current seed-data
  volume the planner correctly prefers a sequential scan (the table is tiny;
  that's the right choice, not a defect), and switches to the index when
  forced to consider it (`SET enable_seqscan = off`), confirming the index
  is valid for the exact query shapes the app runs. Real production-volume
  index usage can only be confirmed under real production data — this is
  disclosed as the honest limit of pre-pilot verification, not overclaimed.

**For a new deployment target** (this repo's local Postgres was for dev/CI
verification only):

1. Provision a PostgreSQL 14+ instance; set `DATABASE_URL`.
2. `npx prisma migrate deploy` — applies the same baseline migration
   verified above.
3. `npx prisma db seed` if desired, or start empty for a real clinic.
4. `npm test` against that instance before going live, same as was done here.

---

## 4. Build & Run

```bash
npm ci                 # reproducible install
npx prisma migrate deploy   # apply migrations (Postgres, per §3)
npx prisma generate         # generate client
npm run build          # next build (production bundle)
npm run start          # next start (serves on PORT, default 3000)
```

Place the app behind the reverse proxy (§1) which terminates TLS and sets a
trustworthy `X-Forwarded-For`. Point the orchestrator's liveness probe at
`/api/health` and readiness probe at `/api/ready`.

---

## 5. Logging & Monitoring

- **Logs:** structured JSON to stdout (`src/api/logger.ts`) with automatic
  redaction of sensitive fields and per-request correlation ids. Ship stdout to a
  log aggregator. Log level via the logger's own controls.
- **Health:** `GET /api/health` — liveness (process up); no dependency checks.
- **Readiness:** `GET /api/ready` — verifies the database with `SELECT 1`; returns
  503 when the DB is unreachable. Use for load-balancer gating and deploy checks.
- **Audit trail:** login/logout, profile edits, onboarding, appointment
  cancellations, and payments are audited (`Audit_Logs`). Retain per your data
  policy (`docs/data-governance.md`).
- **Alerting (RG-001, REQUIRED in production):** operational alerting is wired
  (`src/lib/alerts/`) for three conditions — DB-unreachable, application crash, and
  a 5xx error-rate spike — delivered to a configured Slack/Discord/webhook channel.
  Production **requires** `ALERT_CHANNEL` + `ALERT_WEBHOOK_URL` (startup fails
  otherwise). See `docs/alerting.md` for setup and the mandatory verification
  procedure. A validated alert is a **Code-Freeze entry criterion**.
- **External uptime monitor (REQUIRED):** a process that is fully dead cannot alert
  on itself. Point an external uptime check (cron/monitor) at `/api/health` and
  `/api/ready` to catch total-outage cases; route its failure notification to the
  same channel.
- **Metrics/APM (recommended, deferred):** no external metrics tracker
  (Datadog/OTel) is wired; `logger.error` captures full context to stdout. Attach
  an exporter at `src/api/logger.ts` when wanted. Non-blocking for pilot.

---

## 6. Backup & Restore

**Status: rehearsed and verified (Release 1.2, RC1 push, 2026-07-10) against
a real local Postgres instance** — not just documented as a procedure. This
does not close the pilot's recurring-schedule requirement (that needs a real
production host and a cron/managed-snapshot mechanism, which doesn't exist
until a deployment target does), but it proves the *procedure itself* is
correct and the data survives it intact.

**What to back up:** the PostgreSQL database is the only stateful component (no
uploaded files, no external stores). Back up **before every deploy** and on a
schedule.

```bash
# Backup (timestamped)
pg_dump "$DATABASE_URL" -Fc -f "auriva-$(date +%Y%m%d-%H%M%S).dump"

# Restore into a fresh database
pg_restore --clean --if-exists -d "$DATABASE_URL" auriva-YYYYMMDD-HHMMSS.dump
```

**Rehearsal evidence (real, executed, not simulated):**
1. `pg_dump -Fc` against the dev database (62 users, 18 orgs, 19 clinics, 25
   patients, 69 appointments, 3 invoices, 2 audit logs) — produced a 138KB
   dump file in well under a second.
2. `pg_restore --clean --if-exists` into a **fresh, separate** database
   (the working dev database was never touched) — completed in ~0.4s with
   zero errors.
3. Row counts in the restored database matched the source **exactly**, table
   by table.
4. Strongest check: the full 360-test integration suite was pointed at the
   *restored* database (`DATABASE_URL` swapped, nothing else changed) and
   **passed 360/360** — proving the restore preserves not just row counts
   but working foreign keys, constraints, and indexes under real
   application queries, not just raw data.
5. The rehearsal database was dropped after verification; the dump file was
   retained locally for reference.

- **Cadence (pilot):** automated daily snapshot + a pre-deploy manual dump —
  **still requires a real deployment target to schedule against** (cron/managed
  snapshot); cannot be set up against a host that doesn't exist yet.
- **Retention:** ≥ 7 daily; verify restores monthly (a backup you haven't
  restored is a hypothesis, not a backup) — the procedure above is exactly
  what that monthly verification should run.
- **Encryption:** store dumps encrypted at rest; they contain patient PII —
  still an open item for whichever real storage location is chosen.

---

## 7. Rollback

Auriva has two independently-versioned things — **app code** and **DB schema**.

- **App rollback (fast, safe):** redeploy the previous build/image. App code is
  stateless (session/rate-limit state aside), so this is immediate. Prefer this as
  the first response to a bad deploy.
- **Schema rollback (careful):** migrations are **additive** (the standing rule),
  so a newer app version generally runs against the previous schema and vice-versa
  for one step — meaning **most deploys can roll back app-only without touching the
  DB.** If a migration must be undone, restore the pre-deploy dump (§6) rather than
  hand-writing down-migrations. Never destructively drop columns to "roll forward."
- **Order for a bad deploy:** (1) take a dump, (2) roll the app back, (3) confirm
  `/api/ready`, (4) investigate before re-attempting.

---

## 8. Disaster Recovery Checklist

Targets (pilot-appropriate): **RPO ≤ 24h** (daily backups), **RTO ≤ 2h**.

- [ ] Latest DB dump is present, encrypted, and **test-restored** within the last 30 days.
- [ ] A known-good app build/image is retrievable independently of the running host.
- [ ] `DATABASE_URL` and all SMS provider secrets are recorded in the team's secret
      manager (not only on the live host).
- [ ] Runbook (`operations-runbook.md`) is reachable off-host.
- [ ] Recovery procedure: provision Postgres → restore latest dump → set env →
      `prisma migrate deploy` → deploy known-good build → verify `/api/ready` +
      one end-to-end login + booking.
- [ ] Post-incident: record timeline in the audit/incident log; confirm no PII
      exposure.

---

## 9. What is explicitly NOT assumed / NOT included (pilot honesty)

- No CDN, no object storage, no message queue, no email/SMTP — none are used yet.
- No horizontal autoscaling (single-instance rate limiting).
- No managed secrets integration — env vars only.
- No nonce-based CSP yet (H7, needs browser validation).
- Postgres migration (§3) and the H7 browser pass are **prerequisites**, not
  assumptions. See `production-checklist.md`.
