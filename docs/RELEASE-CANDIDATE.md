# Auriva Professional Edition — Release Candidate Package

**Status:** Release Candidate (pending Go-Live Gates) · **Baseline:** PKG-1→6 (`PRODUCT_BASELINE.md`)
**Engineering health:** 60 test files / 522 tests green · `tsc --noEmit` 0 · `next build` clean
This document is the operational handbook and the final gate before authorizing external beta.

---

## 1. Executive Summary
Auriva Professional Edition is a Healthcare Operating System for independent and multi-doctor clinics. This release completes the **Identity & Workspace platform**, a **capability-driven six-role RBAC** with multi-owner ownership, **Team Management**, and a full **Experience Alignment** to the approved PKG-1→6 baseline.

- **Major achievements:** one credential → many workspaces; six roles on adaptive surfaces; legal-vs-operational ownership + transfer; the resilience UX system; and pixel-faithful alignment of all six approved experience packages (all frozen by Product Office).
- **Supported personas:** Owner · Practice Manager · Doctor · Receptionist · Nurse · Technician · Patient (+ Platform Admin, internal).
- **Solo-first:** a solo owner-doctor runs everything from one consolidated `/clinic`; complexity reveals only as a team forms.

## 2. Delivered Capabilities (by PKG / platform)
| Area | Delivered |
|---|---|
| **Identity (PKG-1)** | Managed provisioning (temp password), mandatory password change (names the clinic), two-panel login (India-first phone), workspace selector, staff shell + switcher |
| **Owner (PKG-2)** | Solo "Today", Command Center (Practice Health → Needs attention → Quick actions → At-a-glance → On the floor → Activity), Team ("Your people") |
| **Doctor (PKG-3)** | Today (metrics + "N min behind"), 3-column Consult Workbench, Patients, Schedule, Practice, Profile |
| **Reception (PKG-4)** | "Today's flow" board + operational awareness strip, "Collect & close" desk, reception Calendar, walk-in/checkout |
| **Patient (PKG-5)** | Mobile-first Home/Book/Records/Family/You, family profile switching, OTP login |
| **Resilience (PKG-6)** | Shared Empty/Loading(skeleton)/Error(3-tier)/Success/Permission/Offline system, app-wide |
| **Platform** | 6-role RBAC (permission model + activation + ownership + role assignment), multi-owner + transfer + last-owner guard, event platform, audit, rate limiting, structured logging, health/readiness |

## 3. Deferred Capability Register (complete Category C — documented, NOT built)
| From | Deferred item | Reason |
|---|---|---|
| PKG-1 | **Self-service password reset** (SEC-4) — assisted reset retained | New workflow (email/token) |
| PKG-2 | **Grow Transition** screen; "Needs your attention" View/Resolve/Dismiss | Lifecycle/first-run logic |
| PKG-3 | **Patient Favourites / High-Risk / Follow-up-Due facets**; Schedule **"Requests"** tab | New persistence/classification/workflow |
| PKG-3 | **Consult Workbench "Suggested protocol" card** (AI one-tap fill of notes/diagnosis/prescription) | Category-C clinical decision-support — new capability + regulatory risk; for a future clinical-intelligence release. Clinical-safety chips were built from existing structured data (allergies / chronic conditions / recorded abnormal vitals) as factual read-only summaries only. |
| PKG-4 | **Notify workflow**, **capacity thresholds**, schedule editing / drag-drop / recurring / advanced planner | New operational features |
| Batch D | **Seat re-check on role change**; nurse/technician **action surfaces** (vitals capture, results entry UI) | New feature surfaces |
| Platform | **Multi-instance rate limiting** (currently in-memory/single-instance); **brand-color tokenization** | Scale / cleanup |

## 4. Known Limitations (do not block RC; must be communicated)
- **Patient OTP** uses a dev echo — an external SMS/OTP provider is required before real patient beta users.
- **Notifications are in-app only** (no SMS/email delivery).
- **Rate limiting is in-memory** — correct for a single instance; revisit for horizontal scale.
- **Reception awareness strip** is informational (no notify/capacity actions).
- **Two header conventions** (compact tool bars vs content heroes) — intentional, documented.

## 5. Go-Live Gates (infrastructure prerequisites — RC → external beta)
> The release cannot move to external beta until all are ✅. These are ops tasks, not code defects.
- [ ] **Production database** provisioned + `prisma migrate deploy`
- [ ] **Automated recurring backups** configured + a restore rehearsed against prod
- [ ] **Production OTP/SMS provider** wired (`SMS_PROVIDER`) and verified
- [ ] **Secrets / configuration** validated in the prod environment (config fail-fast passes)
- [ ] **Monitoring/alerting** pointed at `/api/health` + `/api/ready`

## 6. Rollback Guidance
- **Trigger criteria:** auth failures, cross-tenant leakage, data-integrity errors, or a Go-Live gate regressing.
- **Process:** redeploy the previous release tag. DB migrations are **additive** (e.g. Batch B is an index swap; single-profile invariant makes re-adding the unique constraint a safe rollback). No destructive migrations shipped.
- **Flag:** `FEATURE_MULTI_WORKSPACE` gates multi-workspace behavior where needed.

## 7. Environment Prerequisites & Production Dependencies
- Node + Postgres; `DATABASE_URL`, `SMS_PROVIDER`/`ALERT_CHANNEL` (validated at startup by `src/lib/config.ts`).
- `next start` validates provider config; `next build` does not.
- Demo/UAT: `npx tsx prisma/seed-demo-india.ts` (idempotent; reseed after any test run).

## 8. Beta Support Notes
- **Monitoring:** `/api/health`, `/api/ready`; structured JSON logs (redaction + correlation IDs); audit trail (`Audit_Logs`).
- **Escalation path:** health/ready red → check config + DB; auth anomalies → logs by correlation ID; data concern → audit trail.
- **Success criteria (beta):** clinics complete a full day (provision → login → queue → consult → bill → collect) without support intervention; no P0/P1; positive front-desk + clinician feedback.

## 9. Beta Acceptance Checklist (manual — before external beta)
Run in a browser; classify any issue P1 (material usability) / P2 (low-risk polish) / P3 (enhancement).
- [ ] Tablet layout review (Doctor Workbench, Reception Queue, Owner Dashboard)
- [ ] Keyboard-only navigation + logical tab order
- [ ] Screen-reader smoke test
- [ ] Modal focus-trap + Escape behavior
- [ ] 200% zoom review
- [ ] Responsive visual inspection (mobile/tablet/desktop)
- [ ] Perceived-performance walkthrough (no double-loaders/layout jumps)
- [ ] Smoke Test Matrix (`docs/SMOKE-TEST-MATRIX.md`) fully green

## 10. Reference documents
`PRODUCT_BASELINE.md` · `docs/PKG-ALIGNMENT.md` · `docs/EXPERIENCE-CONSISTENCY-MATRIX.md` · `docs/SMOKE-TEST-MATRIX.md` · `docs/production-checklist.md` · `docs/operations-runbook.md` · `docs/deployment-guide.md`
