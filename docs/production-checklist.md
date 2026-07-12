# Auriva — Production Readiness Checklist (Release 1.2, H3)

> Go / no-go gate for a pilot deployment. A single unchecked 🔴 item = **no-go**.
> Details in `deployment-guide.md`. This checklist is the executive summary of
> "are we actually ready to put this in front of a real clinic."

## 🔴 Blockers — must be TRUE to go live

- [x] **Database is PostgreSQL**, schema migrated, and the full test suite passes
      against it (deployment-guide §3). *(Done — Release 1.2 Batch 4, ADR-0006.
      Still required per-deployment: point `DATABASE_URL` at that
      environment's own Postgres instance and re-run `prisma migrate
      deploy` + the test suite against it before go-live.)*
- [ ] **A real SMS provider is configured and staging-verified** — a real code is
      received on a real handset (H1). `SMS_PROVIDER` ≠ `log`.
- [ ] **TLS is terminated** and the app is reached only over HTTPS.
- [ ] **A trusted reverse proxy** sets a trustworthy `X-Forwarded-For` (rate-limit
      integrity, H2-5).
- [x] **Node runtime declared** via `.nvmrc` + `package.json#engines` (`>=20 <23`,
      2026-07-10). **Honest caveat:** this pins the *intended* target — every
      test, build, and migration in this project's history (including this
      RC1 push) actually ran on Node v24.13.0 in the dev sandbox, which is
      *outside* that declared range. The pin has not been verified by
      actually running the suite on Node 20/22. Do this before RC2.
- [ ] **Startup config validation passes** in the production environment
      (`validateStartupConfig` — the process starts).
- [x] **Backup/restore procedure rehearsed and verified** — real
      `pg_dump`/`pg_restore` executed, restored copy verified by row-count
      match and a full passing test-suite run against it (deployment-guide §6,
      2026-07-10).
- [ ] **Automated recurring DB backups configured** against the real
      production host (cron/managed snapshot) — cannot be done until a
      deployment target exists; the procedure itself is proven, scheduling
      it is not.
- [ ] **H7 browser smoke pass** completed: every Milestone 1 workflow works and the
      new security headers/CSP do not break the UI.
- [x] **Alert delivery mechanics verified** — real local-server HTTP round-trips
      confirm correct payload shape per channel, non-2xx handling, and the
      DB-unreachable + 5xx-rate trigger wiring, now permanent regression
      tests (`docs/alerting.md` §Verification, 2026-07-10).
- [ ] **Operational alerting VERIFIED against a real channel (RG-001)** — a
      real alert delivered to and seen in an actual Slack/Discord workspace,
      for all three conditions. Requires a human with a real workspace —
      cannot be simulated further. `ALERT_CHANNEL` ≠ `log`. **Code-Freeze
      entry criterion.**
- [ ] **External uptime monitor** live against `/api/health` + `/api/ready`,
      notifying the same channel (catches total-process-down).
- [ ] **Gemini security + verification sign-off** on tenant isolation.

## 🟡 Strongly recommended before pilot

- [ ] `DEMO_MODE_ENABLED` set intentionally (`false` for a dedicated pilot-clinic
      instance that should expose no sandbox).
- [ ] Log aggregation receiving stdout; `/api/health` + `/api/ready` wired to
      probes.
- [ ] Secrets stored in a secret manager, not only on the host.
- [ ] Public booking exposure reviewed (per-IP/phone/doctor caps in place — H2-9).
- [ ] Runbook and DR checklist reachable off-host.

## 🟢 Post-pilot (not blocking)

- [ ] External error tracker (Sentry/OTel).
- [ ] Shared-store rate limiting (Redis) if scaling beyond one instance.
- [ ] Nonce-based CSP (TD-H2-1).
- [ ] CSRF synchronizer token.

---

**Sign-off**

| Gate | Owner | Status |
|------|-------|--------|
| Engineering readiness (blockers) | Lead Eng | ☐ |
| Security sign-off | Gemini Security | ☐ |
| Product / pilot readiness | Product Office | ☐ |
| Founder go/no-go | Founder | ☐ |
