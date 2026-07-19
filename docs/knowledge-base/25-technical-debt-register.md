# 25 — Technical Debt Register

> **The one question this answers:** *"What do we owe ourselves — and what will it cost if we ignore it?"*
> **This register must never silently disappear.** It is the honest ledger of shortcuts taken. Source of record: `docs/technical-debt.md` (engineering detail) + [18 Deferred Features](18-deferred-features.md) (product scope). Some items below predate the latest baseline — **verify status before acting.** `[INFERENCE where noted]`

## Priority key

| | Meaning |
|---|---|
| 🔴 | Blocks external pilot / real users |
| 🟡 | Fix after first real usage (observed-behavior driven) |
| 🟢 | Long-term platform (Release 2+) |

## The register

| # | Debt | Reason it exists | Impact if ignored | Priority |
|---|---|---|---|---|
| **TD-01** | **SMS/OTP provider not live** | Code is done; a real provider must be *configured + staging-verified*. Currently dev-echo. | No real patient/staff can receive their OTP → cannot onboard external users. | 🔴 |
| **TD-02** | **Deploy behind TLS + trusted proxy** | Pilot ran on trusted LAN. | HSTS is cosmetic; per-IP rate limits are spoofable (`X-Forwarded-For` trusted). | 🔴 |
| **TD-03** | **Browser smoke pass of every workflow + security headers** | Can't run in the build sandbox. | Unverified real-browser behavior (hydration, CSP, framer-motion) before go-live. | 🔴 |
| **TD-04** | **Notifications delivery does not exist** | Only the *event-publishing* platform was built (OPS-001C). The user-facing notification/announcement/preferences platform was never built. | No SMS/email/push to patients or staff (reminders, results, confirmations) beyond in-app. A major product gap, not just infra. | 🔴 (product) |
| **TD-05** | **Persistent (shared-store) rate limiting** | In-memory per-process limiter (SQLite-era workaround, still correct on Postgres single-instance). | Running >1 app instance makes limits per-process → weaker protection; also the alert 5xx counter and reminder sweep are per-process. | 🟡 (🔴 if multi-instance) |
| **TD-06** | **Reminder sweep is single-instance** (`setInterval`) | Simple, correct for one instance. | Multiple instances double-sweep (harmless dedup, but wasteful). | 🟡 |
| **TD-07** | **Command-Center N+1 query** | Maps per-clinic queries on the org dashboard. | Slows the multi-clinic `/admin` view as clinics grow; not on the solo surface. | 🟡 |
| **TD-08** | **Per-clinic capability grants** (TD-S2-2) | Grants live on `StaffProfile.capabilities`, one set per profile. | Can't express "reception at clinic A but not B" → blocks fine-grained multi-clinic staffing. | 🟡 |
| **TD-09** | **Partial capability conversion** (TD-S2-1) | Some routes still use role predicates, not capabilities. | A granted solo practitioner isn't unlocked everywhere (lab, some appointment reads). Mechanical to finish. | 🟡 |
| **TD-10** | **No pagination on list endpoints** (D10) | Fine at pilot volume. | Response size grows with data; degrades ~1k appointments/clinic. | 🟡 |
| **TD-11** | **`/api/doctors` over-exposes PII** (D14) | Cross-org doctor directory spreads the full user row (email/phone). | Field-level PII exposure across tenants (no UI renders it today). Trim the projection. | 🟡 |
| **TD-12** | **Public booking can't disambiguate family profiles** (TD-S2-3) | A shared number books under name-match / first profile. | Mis-booking under a shared number; authenticated portal already has the switcher. | 🟡 |
| **TD-13** | **Day-boundary TZ duplication** (D8) | Server (server TZ) vs client `isToday` (browser TZ). | Reception vs doctor "today" can differ across TZ/DST once off-LAN. | 🟡 |
| **TD-14** | **Hand-maintained client types, no runtime validation** (D12) | `src/shared/*` mirrors API shapes by hand. | Server include-shape changes drift silently. Adopt shared zod contracts when contracts next change. | 🟡 |
| **TD-15** | **Lint baseline** (~35 problems) (TD-H6-1) | Each fix is behavior-changing (react-hooks set-state-in-effect, `no-explicit-any`). | CI-non-blocking but real; resolve in a dedicated typed-error / effects pass. | 🟡 |
| **TD-16** | **Node runtime pin unverified** (TD-RC1-2) | Declared `>=20 <23` but everything actually ran on Node 24. | The pin is intent, not a verified compatibility claim. Run the suite on real Node 20/22 before RC2. | 🟡 |
| **TD-17** | **npm audit: PostCSS advisory (transitive via Next.js)** (TD-RC1-1) | Build-time only; the only "fix" downgrades Next.js catastrophically. | Low real-world risk; resolves on Next.js's next bump. **Do not force-downgrade.** | 🟢 |
| **TD-18** | **`Appointment` "god table"** (TD-H5-2) | Clinical fields (`chief_complaint`, `vitals_json`, `diagnosis`, `prescription_*`) live on the appointment row. | Fine for MVP; revisit as the clinical data model matures (first-class `Prescription`/`LabOrder` already exist). | 🟢 |
| **TD-19** | **Structured clinical data model** | Health summary is free-text by design (allergies/conditions). | No structured taxonomies/coding → limits analytics, interoperability, decision support. A future clinical-model decision. | 🟢 |
| **TD-20** | **CSRF synchronizer token** | `SameSite=Lax` is the standard Next.js posture, adequate for pilot. | Post-pilot hardening enhancement. | 🟢 |
| **TD-21** | **Nonce-based CSP script/style** (TD-H2-1) | Needs real-browser validation the sandbox can't run. | Weaker CSP until validated; add with browser testing. | 🟢 |

## Debt principle (the rule that keeps this honest)

> Every item is tracked because it improves **security, reliability, or the pilot experience** — not because it's technically elegant. Items with no material impact live in 🟢, not 🔴.

## The three debts that matter most right now

1. **TD-04 — Notifications delivery** is the biggest *product* debt: reminders/results/confirmations can't reach patients. It's not "polish," it's a missing pillar-4 capability.
2. **TD-01 — Live SMS/OTP** gates every external user. Nothing ships to real patients without it.
3. **TD-05 — Persistent rate limiting** is the first thing that breaks the moment you scale past one instance.

> **Governance:** review this register at every roadmap checkpoint. Debt paid → strike it through with the date. Debt discovered → add it, don't hide it.
