# Auriva — Operations Runbook (Release 1.2, H3)

> Day-2 operations for a pilot deployment: routine tasks, health signals, and
> incident response. Keep a copy reachable **off-host** (DR requirement).
> Companion: `deployment-guide.md`, `production-checklist.md`.

## 1. Health signals

| Signal | Where | Healthy | Action if not |
|--------|-------|---------|---------------|
| Liveness | `GET /api/health` | 200 `{status:"ok"}` | Restart the process |
| Readiness | `GET /api/ready` | 200 `{status:"ready"}` | 503 → DB unreachable; check DB before restarting app |
| Logs | stdout (JSON) | steady, no error spikes | Investigate `logger.error` entries by correlation id |
| Startup | process logs | "Handlers registered" after boot | Config validation failure → read the diagnostic, fix env, redeploy |

## 2. Routine tasks

- **Deploy:** take a DB dump → `prisma migrate deploy` → `npm run build` →
  restart → confirm `/api/ready` + one login + one booking.
- **Rotate an SMS provider:** change `SMS_PROVIDER` (+ its keys) and restart. No
  code change (H1 abstraction). Verify one real OTP end-to-end.
- **Disable the demo sandbox:** set `DEMO_MODE_ENABLED=false`, restart. `/api/demo/*`
  then returns 404 and "Skip & explore" no-ops.
- **Reset the demo story:** the in-app "Reset demo" button, or `POST /api/demo/reset`
  from a demo session. Only ever affects the `is_demo` org.

## 3. Incident response

**Elevated 500s**
1. Find the correlation id in logs; production 500s log full context server-side
   but return no internal details to clients (H2-3).
2. If DB-related, check `/api/ready`; if down, treat as a DB incident.
3. Roll the app back (deployment-guide §7) if a recent deploy is implicated.

**OTP delivery failing (users can't sign in)**
1. Provider send failures return 503 from `/api/auth/otp/send` and log the
   provider error. Check the SMS provider dashboard/credentials/balance.
2. Confirm `SMS_PROVIDER` + keys are set; a partial config in prod would have
   failed startup, so suspect the vendor or account state.
3. Mitigation of last resort: switch `SMS_PROVIDER` to another configured vendor
   and restart.

**Suspected abuse / spam**
- Public booking is capped per-IP, per-phone, and per-doctor. A flood shows as
  429s in logs. If the per-IP axis looks bypassed, verify the trusted proxy is
  actually overwriting `X-Forwarded-For`.
- Auth brute force is rate-limited (identity + IP) with per-OTP-challenge attempt
  caps; watch `auth.login failed` / `auth.otp_verify failed` volume.

**Database incident**
- `/api/ready` 503 → app can't serve. Restart app **does not** fix a down DB.
- Restore path: deployment-guide §6–8 (dump/restore, DR checklist).

## 4. Escalation

1. On-call engineer → triage via health signals + logs.
2. DB/data-loss or PII-exposure suspicion → escalate immediately; preserve the
   audit trail; do not delete logs.
3. Security incident → notify the security owner (Gemini office); capture scope
   before remediation.

## 5. Backups & DR quick actions

- **Take a backup now:** `pg_dump "$DATABASE_URL" -Fc -f auriva-$(date +%Y%m%d-%H%M%S).dump`
- **Restore latest:** provision DB → `pg_restore --clean --if-exists -d "$DATABASE_URL" <dump>` →
  `prisma migrate deploy` → deploy known-good build → verify `/api/ready` + a real
  login + booking.
- Full DR checklist: `deployment-guide.md` §8.
