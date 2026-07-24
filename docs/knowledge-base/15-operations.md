# 15 — Operations

← [14 Security](./14-security.md) · [Index](./00-README.md) · Next: [16 Release Notes](./16-release-notes.md)

## Environment & configuration

- **Database:** PostgreSQL via Prisma (`DATABASE_URL`, required in every environment including local dev/test — validated at startup with a fail-fast error, not a cryptic first-query crash). Migrated from a hardcoded SQLite file in Release 1.2 Batch 4 (ADR-0006) specifically so dev/staging/production can point at different instances via env only, never a code change.
- **Config validation** (`src/lib/config.ts`, `collectConfigErrors` / `validateStartupConfig`): checks `NODE_ENV` is one of `development|production|test`, `DATABASE_URL` is set, SMS provider config (`smsConfigErrors`), and alert-channel config (`alertConfigErrors`). Reports **every** problem found at once, not just the first — a misconfigured deployment gets one clear report instead of a fix-one-restart loop. `next start` validates provider config; `next build` does not.
- **Feature flags:** `FEATURE_MULTI_WORKSPACE` gates multi-workspace behaviour where needed (a rollback lever — see Rollback Guidance below).
- **Demo Mode:** `DEMO_MODE_ENABLED` (default **on**) controls whether the "Skip & explore" sandbox entry and the demo seed/reset endpoints are reachable at all — an operator can hard-disable it for a dedicated pilot instance. The demo owner account carries **no password** and is reachable only through the rate-limited `/api/demo/enter` endpoint, never through normal credential login, and only ever within the `is_demo = true` sandbox organization.

## Seeding / demo reset

| Script | Purpose |
|---|---|
| `prisma/seed.ts` | The main dev seed (not India-specific) |
| `prisma/seed-demo-india.ts` | **The canonical India-centric demo world** — `npx tsx prisma/seed-demo-india.ts`. Standalone and **idempotent**: owns exactly one organization ("Sunrise Health Network," Pune) and re-seeds only its own rows (matched by its demo phone prefix `+91987650…`), never touching the main dev seed or any real customer org. See [03-personas.md](./03-personas.md) for the full credential table this produces. |
| `POST /api/demo/reset` | Wipes and reseeds volatile content **only** for organizations where `Organization.is_demo = true` — the *sandbox* demo (SmileCare Physiotherapy, entered via "Skip & explore"), a different world from the India seed script above. Never touches a real customer org — `is_demo` is the only safety marker it keys off. |

**Restart the dev server after any migration** — a standing working-agreement rule (schema/client changes are not always picked up hot).

## Health & readiness

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness |
| `GET /api/ready` | Readiness (DB connectivity etc.) |

Monitoring/alerting should point at both before external beta (Go-Live Gate, below). Structured JSON logs include redaction + correlation IDs; the audit trail (`Audit_Logs`) is the escalation path for a data-concern investigation.

## Deployment assumptions

- Node + Postgres runtime.
- Required env: `DATABASE_URL`; production additionally requires a real `SMS_PROVIDER` and a configured `ALERT_CHANNEL` (both fail-fast at startup in production; only format-checked in non-production).
- No destructive migrations have shipped — every migration to date is additive (e.g. Batch B's `StaffProfile.user_id` unique-constraint drop is a safe, reversible index swap; re-adding the unique constraint is a valid rollback as long as the single-profile invariant still holds, which it does today).

## Go-Live Gates (RC → external beta) — infrastructure prerequisites, not code defects

The release **cannot** move to external beta until every one of these is ✅:

- [ ] Production database provisioned + `prisma migrate deploy` run.
- [ ] Automated recurring backups configured + a **restore rehearsed** against production.
- [ ] Production OTP/SMS provider wired (`SMS_PROVIDER`) and verified end-to-end.
- [ ] Secrets/configuration validated in the production environment (the fail-fast config check passes there).
- [ ] Monitoring/alerting pointed at `/api/health` + `/api/ready`.

## Beta Acceptance Checklist (manual, browser-driven, before external beta)

Classify any issue found: **P1** (material usability) / **P2** (low-risk polish) / **P3** (enhancement).

- [ ] Tablet layout review (Doctor Workbench, Reception Queue, Owner Dashboard — the three screens already flagged 🟡 dense in the Experience Consistency Matrix)
- [ ] Keyboard-only navigation + logical tab order
- [ ] Screen-reader smoke test
- [ ] Modal focus-trap + Escape behaviour
- [ ] 200% zoom review
- [ ] Responsive visual inspection (mobile/tablet/desktop)
- [ ] Perceived-performance walkthrough (no double-loaders/layout jumps)
- [ ] `docs/SMOKE-TEST-MATRIX.md` fully green

## Rollback guidance

- **Trigger criteria:** auth failures, cross-tenant leakage, data-integrity errors, or a Go-Live gate regressing.
- **Process:** redeploy the previous release tag. Because migrations to date are additive, a rollback does not require reverse-migrating data.
- **Flag:** `FEATURE_MULTI_WORKSPACE` can be used to gate multi-workspace behaviour off if a switching-related regression appears, without a full redeploy.

## Pilot assumptions

- **Success criteria (beta):** a clinic completes a full day — provision → login → queue → consult → bill → collect — without support intervention; no P0/P1 issues; positive front-desk and clinician feedback.
- **Escalation path:** health/ready endpoints red → check config + DB connectivity; auth anomalies → structured logs by correlation ID; a data concern → the audit trail.
- **Solo-first pilot framing (working history):** the product's own internal milestone framing has repeatedly emphasized "solo full-visit workflow ready → then STOP building, run pilot" — i.e. the intended sequencing is real usage feedback before further feature investment, not indefinite feature accumulation. Treat any request to "just add one more feature before the pilot" with the same scrutiny as any other Category-C proposal (see [02-product-constitution.md](./02-product-constitution.md)).

## Engineering health snapshot (as of the PKG freeze / RC)

| Metric | Value |
|---|---|
| Test files | 60 / 522 tests green |
| `tsc --noEmit` | 0 errors |
| `next build` | clean |
| Overall product completion (Delivery Dashboard) | ~92% (feature scope), release readiness ~77% pending RC hardening + ops gates |

## Reference documents (primary sources for this file)

`docs/RELEASE-CANDIDATE.md` · `docs/production-checklist.md` · `docs/operations-runbook.md` · `docs/deployment-guide.md` · `docs/SMOKE-TEST-MATRIX.md` · `docs/EXPERIENCE-CONSISTENCY-MATRIX.md` · `docs/DELIVERY-DASHBOARD.md`. This KB file is a condensed synthesis — consult those originals for exact operational runbook steps.
