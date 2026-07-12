# Auriva — Technical Debt Register

**Date:** 2026-07-03 (prioritized register added 2026-07-09, Release 1.2 Hardening)
**Status:** documentation only — nothing in this file is implemented (except items marked ✅ RESOLVED).
**Companion:** `docs/architecture-audit.md` (detailed findings with file references; items below carry the audit's C/R/L/A identifiers).

---

## 0. Prioritized register (Release 1.2 pilot planning)

Product Office view: what actually gates the pilot vs. what waits. Chronological
detail for each item lives in the sections below; this is the planning index.

### 🔴 Must fix before pilot (release blockers)
_Engineering-side blockers. Each has a direct pilot-impact justification._

- **Real SMS provider configured** (SEC-3 delivery). ✅ *Code done in H1* — a real
  provider must be **configured + staging-verified** before onboarding real
  practitioners (OTP is the possession factor). Deployment task, not code.
- **Deploy behind TLS + trusted proxy** (TD-H2-3). Makes HSTS real and the per-IP
  rate limits non-spoofable. Deployment task; enforced by the H3 checklist.
- **Production database (PostgreSQL)** ✅ *Done (Release 1.2 Batch 4, B1, ADR-0006)* —
  schema, migrations, and the full 360-test suite verified against a real
  Postgres instance, not just configured.
- **Backup/restore procedure** ✅ *Rehearsed (RC1 push, 2026-07-10)* — real
  `pg_dump`/`pg_restore` executed against a real (local) Postgres instance,
  restored into a fresh database, verified by exact row-count match **and**
  the full 360-test suite passing against the restored copy. **Still open:**
  scheduling this on a recurring cadence against a real production host —
  that requires a deployment target that doesn't exist yet, and cannot be
  rehearsed further until one does.
- **Operational alerting (RG-001)** ✅ *Mechanics verified (RC1 push,
  2026-07-10)* — real local-HTTP-server round-trips (not mocked `fetch`)
  confirm all three channel payload shapes, non-2xx handling, and both the
  DB-unreachable and 5xx-rate trigger wiring, now permanent tests. **Still
  open:** confirming a message actually arrives in a real Slack/Discord
  workspace — needs a human with a real account, same class of gap as the
  SMS provider above (see `docs/alerting.md` §Verification).
- **Browser smoke pass of every Milestone 1 workflow + the new security headers**
  (H7) — cannot run in the build sandbox; must be executed before pilot.
- _(Resolved this phase: public-booking flood cap TD-H2-2; demo standing
  credential + error leakage + security headers — see H2 security report.)_

### 🟡 Post-pilot (do after first real usage, driven by observed behaviour)
- **TD-H2-1** — nonce-based `script-src`/`style-src` CSP (needs browser validation).
- **TD-H2-3 (code half)** — configurable trusted-proxy hop count for `clientIp()`.
- **Shared-store rate limiting (Redis)** — only when running >1 instance. The
  RG-001 alerting 5xx-rate counter (`src/api/http.ts`) is in-memory per process
  too; same single-instance caveat, same fix. Non-blocking for a single-instance
  pilot.
- **TD-H6-1** — remaining lint debt (35 problems, CI-non-blocking), deliberately
  NOT fixed in the stabilization phase because each requires a **functional**
  change: 22 `react-hooks/set-state-in-effect` + 1 `purity` + 1 `exhaustive-deps`
  (altering effect/render logic is behavior-changing and belongs with the UI/H7
  work), and 12 `@typescript-eslint/no-explicit-any` (mostly `catch (e: any)` —
  converting to `unknown` requires adding narrowing logic, i.e. code changes).
  Resolve during the UI redesign or a dedicated typed-error pass. (H6 removed all
  6 lint *warnings*: 2 dead imports + 4 `_`-prefixed false-positives via config.)
- **TD-H4-1** — extend correlation-id (`withRequestId`) coverage to the remaining
  (mostly read-only) routes; mechanical one-line wrap, low marginal value at pilot
  scale. External APM/error-tracker (OTel/Sentry) attaches at `src/api/logger.ts`.
- **TD-H5-1** — `command-center-service` maps over clinics issuing per-clinic
  queries (an N+1) on the **org-wide `/admin` dashboard**. Not on the solo pilot
  surface, so deferred. Collapse into grouped/aggregate queries when the
  multi-clinic admin view gets real usage. (Measured/found in H5; see
  `docs/performance-report.md`.)
- ~~**H5 index re-verification on Postgres**~~ ✅ *Done (Batch 4).* All three
  hot-path indexes confirmed structurally usable via `EXPLAIN ANALYZE`
  against real Postgres — see `docs/deployment-guide.md` §3 for the
  evidence (including the honest note that current seed-data volume is too
  small for the planner to prefer them unprompted, which is correct planner
  behavior, not a defect).
- **TD-RC1-1 — `npm audit`: moderate PostCSS XSS advisory, transitive via
  Next.js's own build tooling** (`npm audit`, 2026-07-10). Build-time only
  (CSS compilation), not reachable at runtime — low real-world risk for
  this app's threat model. **Deliberately not "fixed":** the only fix `npm
  audit fix --force` offers is downgrading Next.js from 16.2.10 to
  `9.3.3-canary` — a catastrophic breaking change with no relationship to
  this app's actual exposure. Will resolve naturally on Next.js's own next
  routine version bump. *Fix when:* Next.js ships a version with an
  updated PostCSS dependency — do not force a manual downgrade to chase this.
- **TD-RC1-2 — Node runtime pin unverified.** `package.json#engines` +
  `.nvmrc` now declare Node `>=20 <23`, but every test/build/migration this
  project has ever run (including this RC1 push) actually ran on Node
  v24.13.0. The pin is a stated intent, not a verified compatibility claim.
  *Fix when:* before RC2 — run the full suite + a production build on an
  actual Node 20 or 22 install.
- **TD-M1-1** treatment categories · **TD-M1-3** treatment colour (with a calendar).
- CSRF synchronizer token (SameSite=Lax is adequate for pilot).

### 🟢 Long-term platform (Release 2+)
- **TD-M1-2** — Identity Unification (owner/patient sharing one phone).
- **TD-H5-2** — `Appointment` "god table" risk: many nullable clinical fields
  (`chief_complaint`, `history_notes`, `vitals_json`, `diagnosis`,
  `prescription_notes`, `prescription_medicines_json`) live on the appointment row.
  Fine for Milestone 1 (first-class `Prescription`/`LabOrder` models already exist);
  revisit as clinical-model normalization when the clinical data model matures.
- **TD-M1-4** — demo seeding advisory lock / partial index (only if demo goes high-traffic).
- Deeper multi-clinic / OrganizationMember evolution; external notifications (OPS-002).

> Justification rule (Product Office): every item above is kept because it
> improves security, reliability, or the pilot experience — not because it is
> technically elegant. Items with no material pilot impact live in 🟢, not 🔴.

---

## 1. Current architecture (after the architecture-prep refactor)

```
src/app/**              UI routes (patient, doctor, admin, staff, login)
src/app/api/**          Route handlers — thin controllers only: parse/validate,
                        auth guard, call a service/repository, map errors
src/api/                HTTP boundary: session guard, response builders
                        (http.ts), logger, validation utilities
src/services/           Business logic: appointment, queue, reception,
                        walk-in, patient, organization
src/repositories/       Prisma data access: appointment, staff, clinic,
                        organization
src/domain/             Pure business rules (no Prisma, no Next):
                        appointment-status state machine, authorization
                        predicates, Organization abstraction
src/shared/             Client-safe view-model types/helpers (queue,
                        workspace)
src/lib/                Infrastructure only: prisma singleton, cn()
```

Layering rule: `app/api → api/services/repositories → domain`. `domain` and
`shared` import nothing above them. Services may still use Prisma directly
inside transactions (deliberate — see D7).

Key invariants to preserve:
- Every status change goes through `transitionStatus()` and the
  `domain/appointment-status.ts` table.
- Every appointment mutation writes an `AppointmentEvent` in the same
  transaction.
- Every role decision goes through `domain/authorization.ts`.
- Reception endpoints never trust a client-supplied `clinic_id` for
  receptionists.

---

## 2. Risks (ordered, highest first)

| # | Risk | Why it matters | Trigger to fix |
|---|------|----------------|----------------|
| D1 | **Doctor console is unauthenticated** (audit L3, A3). `/doctor` and `PATCH /api/appointments/[id]` have no session; timeline events from doctors have `actor_user_id: null`. | Anyone who can reach the server can move any appointment through its lifecycle. Acceptable only on a trusted LAN pilot. | Before any deployment beyond the pilot clinic. |
| D2 | **Staff login proves nothing** (L2). Email+role match with no credential; OTP is a hardcoded `123456` returned in the API response (L1). | Identity is cosmetic. All authorization work sits on an unauthenticated foundation. | Same as D1. |
| D3 | **Unscoped public reads** (C2, C3). `/api/clinics`, `/api/doctors`, `/api/appointments` return any tenant's data to any caller. | Cross-tenant data exposure the moment a second real customer exists. | Before onboarding a second organization. |
| D4 | **500 responses leak internals**. `serverError()` exposes `error.message` as `details` (preserved deliberately — existing clients may read it). | Internal paths/SQL fragments can leak. | Coordinated contract change with UI: stop reading `details`, then remove. |
| D5 | **Role lives on User, not membership** (R1, C4). One global role per person; clinic ownership is a column. | Blocks: a doctor at two clinics, a doctor-owner, multiple admins per clinic. This is the schema half of the Organization abstraction. | First multi-workspace feature. |
| D6 | **Split-brain client sessions**. `localStorage` identities (`aura_b2b_session`, `aura_patient_session`) alongside the server cookie; login redirect trusts the selected role. | UI state can disagree with server session (e.g. logout clears cookie but not localStorage). | With D1/D2 auth work. |
| D7 | **Services still query Prisma directly** in transactional flows (check-in, walk-in, transition). | Fine today; becomes duplication as repositories grow. Migrate opportunistically — do not big-bang. | When a second caller needs the same query. |
| D8 | **Day-boundary logic duplicated** (A5): server `startOfDay/endOfDay` (server TZ) vs client `isToday` (browser TZ). | Queue contents can differ between reception and doctor views across timezones/DST. | First off-LAN deployment. |
| D9 | **`POST /api/appointments` accepts a stale status subset** (A1) — `checked_in`, `doctor_ready`, `no_show`, `cancelled` are unbookable; list maintained apart from the state machine (now flagged at `BOOKABLE_STATUSES`). | Contract inconsistency; intentional-looking but historical. | Next booking-flow change. |
| D10 | **Unbounded list endpoints** (A2). No pagination anywhere. | Response size grows with data; fine at pilot volume. | ~1k appointments per clinic. |
| D11 | **Queue numbers application-enforced** (A6). Transactional read-then-increment, no DB constraint (SQLite limitation, documented). | Duplicate queue numbers possible under real concurrency. | Move off SQLite / multi-writer deployment. |
| D12 | **Hand-maintained client types** (`src/shared/queue.ts`, `workspace.ts`) mirror API shapes with no runtime validation. | Server include-shape changes drift silently. | Consider zod/shared contracts when contracts next change anyway. |
| D13 | **Transition table bent to the UI** (A4): `scheduled → in_consultation` kept valid because the doctor console pre-dates check-in. | Encodes a client quirk as a business rule. | When the doctor console adopts the check-in flow. |
| D14 | **`GET /api/doctors` returns each doctor's email/phone to any authenticated caller, cross-tenant.** The patient booking flow is a deliberate cross-org directory (SEC-1), but the projection spreads the full user row (contact fields included). No patient UI renders these fields today; the `DoctorView` shared type still declares them. | Field-level PII over-exposure across tenants. Previously only an inline code comment in the route; promoted to a tracked item in Batch 1 rather than fixed there (it is an endpoint-wide contract + shared-type change with real blast radius, out of Batch 1's auth-hardening scope). | Trim the `/api/doctors` projection to the fields the directory actually needs, updating `src/shared` `DoctorView` and the admin workspace consumer in the same pass. |

---

## Batch 1 (Sprint 2) — status changes

- **D1 (doctor console unauthenticated)** — **RESOLVED** in the approved
  baseline: `src/app/doctor/layout.tsx` guards the workspace via
  `canAccessDoctorWorkspace`, and `PATCH/GET/DELETE /api/appointments/[id]` are
  session-gated and clinic-scoped.
- **D2 (staff login proves nothing / patient OTP is cosmetic)** — **RESOLVED.**
  Staff login is credentialed (scrypt, rate-limited) in the baseline; Batch 1
  replaced the fixed `123456` patient OTP with a real single-use, expiring,
  attempt-capped code (`OtpChallenge` + `src/services/otp-service.ts`; see
  ADR-0002). Also closed the latent `is_active` login-gate gap (deactivated
  staff can no longer sign in, and deactivation now revokes live sessions).
- **D3 (unscoped public reads)** — **MOSTLY RESOLVED** in the baseline:
  `/api/clinics` is org-scoped, `/api/appointments` is scoped per actor via
  `requireAppointmentAccess`. Residual field-level exposure on `/api/doctors`
  is tracked as **D14** above.
- Note: this register predates the large approved baseline (Batch 0 finding);
  D5/D6 and the M-series roadmap should be reconciled against the baseline in a
  future pass — not done here to keep Batch 1 surgical.

---

## Batch 2–4 (Sprint 2) — new / remaining debt

New (created deliberately, tracked):

- **TD-S2-1 — Partial capability conversion (Batch 2).** Front-desk routes
  (reception dashboard, queue, walk-in, check-in, status, billing invoices)
  now authorize via the `reception` capability, unlocking a granted solo
  practitioner. The lab worklist (`/api/lab-orders`) and the appointment list
  (`requireAppointmentAccess`) still use role predicates, so a granted doctor
  isn't unlocked there yet. The pattern is established (ADR-0003); the
  remainder is mechanical. *Fix when:* the solo-practitioner lab/appointment
  flows are exercised end-to-end.
- **TD-S2-2 — Capability grants are clinic-agnostic (Batch 2).** Grants live on
  `StaffProfile.capabilities`, one set per profile. A person who should have
  `reception` at clinic A but not clinic B can't be expressed. *Fix when:* the
  first multi-clinic org needs per-clinic grants (move grants onto
  `OrganizationMember`).
- **TD-S2-3 — Public booking can't disambiguate family profiles (Batch 3).**
  A number shared by several Healthcare Profiles books under the name-match or
  first profile. *Fix when:* real usage shows mis-booking; the authenticated
  portal profile switcher already covers the logged-in path.
- **TD-S2-4 — Adaptive nav in admin portal (Batch 2).** The `WorkspaceSwitcher`
  is wired into the staff and doctor shells; the admin portal uses its own
  shell and doesn't show it yet, so an owner switches *into* admin but not back
  out via the switcher. *Fix when:* the admin shell is next touched.
- **TD-S2-5 — Duplicated doctor-route self-or-owner guard (Batch 4).** The
  `authorize…Access` helper (self-or-owning-super_admin) is now copied in three
  route files: `doctors/[id]/availability`, `doctors/[id]/time-blocks`, and
  `.../time-blocks/[blockId]`. *Fix when:* a fourth doctor-scoped route needs
  it — extract to a shared `src/api` guard then. Low priority (12 lines, fully
  test-covered behavior).

## Release 1.2 Batch 2 (Founder MVP Blocker B3) — new debt

- **TD-B2-1 — MSG91 cannot deliver non-OTP SMS (booking confirmation/reminder).**
  MSG91's OTP delivery uses a dedicated DLT-compliant OTP endpoint that can't
  send arbitrary text; a transactional (non-OTP) message needs its own
  DLT-approved template, which isn't registered. `sendMessage` returns an
  explicit failure rather than calling an unverified endpoint (see ADR/§1a of
  `docs/patient-communication-and-feedback.md`). Twilio and Exotel are
  unaffected. *Fix when:* MSG91 is the provider chosen for a real deployment
  (Batch 3) — register a transactional template and implement against the
  verified API shape.
- **TD-B2-2 — Reminder sweep is single-instance only (ADR-0005).** A plain
  `setInterval` in `src/instrumentation.ts`; running more than one app
  instance would sweep and publish redundantly (harmless — `publishEvent`'s
  own dedup still holds — but wasteful). Same accepted caveat class as the
  in-memory rate limiter (TD-H2-3) and alert dedupe window. *Fix when:*
  moving off a single-instance deployment — swap the interval for an
  external cron hitting a new endpoint; `runAppointmentReminderSweep()`
  itself needs no change.

## Release 1.2 Batch 4 (Founder MVP Blocker B1) — new debt

- **TD-B4-1 — SQLite-era application-level workarounds are now unnecessary
  but were deliberately left unchanged.** Three code paths carry comments
  explicitly justified by SQLite's limitations (no advisory locks, single-writer,
  no partial/expression unique indexes): `patient-service.ts`'s health-id
  collision retry, `queue-service.ts`'s application-enforced queue numbering,
  and `rate-limit.ts`'s in-memory limiter. All three are **still correct on
  Postgres** — nothing is broken — but Postgres offers native mechanisms
  (advisory locks, `SELECT ... FOR UPDATE`, a real unique constraint, a
  shared-store limiter) that would be strictly better now. Not changed in
  Batch 4 per its explicit "preserve existing domain behavior" scope — this
  is an improvement opportunity, not a defect. *Fix when:* a dedicated
  concurrency/correctness pass is scoped, or real pilot concurrency exposes
  an actual collision.

### Stabilization pass (2026-07-08) — debt ledger reconciliation

- **Confirmed retired:** D1 (doctor console auth), D2/L1 (fixed OTP), the
  `is_active` login gate, and the availability "coming soon" override.
- **Lint baseline improved:** the five throwaway root `verify_*.js` scripts
  (the source of 7 lint errors + 3 warnings) were removed in repository cleanup.
  Project lint dropped from 51→41 problems. The remaining **35 `src` errors are
  the pre-existing React-Compiler / `no-explicit-any` baseline** (accepted since
  Batch 0), **not** introduced by Sprint 2 — Sprint 2 added zero new lint errors.
- **Reclassified — still open:** D3 residual is fully captured by **D14**
  (`/api/doctors` PII). D5/D6 and the M-series reconciliation remain the largest
  untouched items and are the natural companions to any future auth/tenancy work.
- **Remaining open ledger:** D4, D5, D6, D7, D8, D9, D10, D11, D12, D13, D14,
  TD-S2-1…TD-S2-5.

Retired this sprint:

- **D2/L1** — patient OTP fixed secret (Batch 1). **D1, most of D3** — confirmed
  resolved in the baseline (Batch 1).
- The `is_active` login-gate gap and the availability service's date-specific
  override "coming soon" (Batch 4 `DoctorTimeBlock`) are both now real.

Remaining (unchanged, still open): **D4, D5, D6, D7, D8, D9, D10, D11, D12,
D13, D14**, and the M-series roadmap reconciliation.

### Milestone 1 (First Clinic Ready) — forward-compatibility notes

- **TD-M1-1 — Treatment categories (planned, deliberately deferred).** Product
  Office (2026-07-08) approved the `Service` model ("Treatments & Services",
  Batch 1) but noted treatments will later group into **categories**
  (Assessment, Follow-up, Therapy, Diagnostics, Procedure, Vaccination,
  Consultation, …). Categories are **explicitly out of scope now** — no schema,
  no UI. The current model is designed to accept them without redesign: adding a
  nullable `category String?` (or a `ServiceCategory` table + `category_id`) is a
  purely additive migration, and every existing query already orders by
  `(sort_order, created_at)` so an optional grouping key layers on top with no
  behavior change. Do **not** implement until a Product Office go-ahead.

- **TD-M1-2 — Identity Unification (Release 2, documented now to avoid a corner).**
  Quick Setup (Batch 3) refuses a mobile that already belongs to any Auriva
  account (`User.phone_number` is unique) — correct and safe for Milestone 1.
  But one phone ≠ one identity forever: a **patient may become a clinic owner**,
  a **doctor may work in multiple clinics**, a **receptionist may join another
  clinic**. Product Office decision (2026-07-08): **keep the current
  refuse-and-ask-to-sign-in behavior for Milestone 1**; do not design anything
  that hard-assumes one-account-per-phone. Release 2 introduces real identity
  unification (an Account that can hold multiple roles/memberships across
  clinics — the `OrganizationMember` + `AccountProfileLink` tables already point
  this way). Guardrail until then: never add a new unique/1:1 constraint keyed on
  phone that would have to be torn down later.

- **TD-M1-3 — Treatment colour (planned, layout reserved).** Product Office
  (2026-07-08) noted every calendar eventually needs colour-coded treatments.
  **Not implemented** in Milestone 1. The `Service` model and the Treatments list
  UI are laid out to accept a `color String?` (hex) as a purely additive column +
  a swatch column with no reflow. Implement only alongside the calendar view
  (post-Milestone-1) when colour actually renders somewhere.

- **TD-M1-4 — Demo Mode seeding is non-transactional and not concurrency-locked
  (Batch 6, accepted for pilot).** `src/services/demo-service.ts` seeds the
  sandbox "SmileCare Physiotherapy" clinic with ~50 sequential writes (matching
  `prisma/seed.ts`) rather than one interactive transaction, to stay clear of
  Prisma's interactive-transaction timeout. Two consequences, both acceptable for
  a demo sandbox and documented rather than fixed: (a) a seed that fails partway
  leaves incomplete content — self-healing, because the next `enterDemo`/
  `resetDemo` wipes-first and rebuilds; (b) two simultaneous first-time
  "Skip & explore" clicks race on scaffold creation (`ensureDemoScaffold` is
  find-then-create, no DB uniqueness on `is_demo`). The reserved owner phone
  `+19000000001` is `User.phone_number @unique`, so the loser of the race fails
  its owner-create rather than producing two demo orgs — an error, not
  corruption. If Demo Mode ever moves beyond low-traffic pilot demos, add an
  advisory lock (or a unique partial index on `Organization.is_demo`) around
  `ensureDemoScaffold`. Safety of `resetDemo` does **not** depend on any of this:
  it only ever wipes content for the `is_demo` organization.

### Release 1.2 Hardening — security items (H2, accepted/deferred)

Full analysis in `docs/security-report.md`. Deferred (non-blocking for a
low-volume pilot) items tracked here:

- **TD-H2-1 — Nonce-based CSP `script-src`/`style-src` (deferred to H7).** The
  shipped CSP (`next.config.ts`) covers `frame-ancestors`/`object-src`/`base-uri`/
  `form-action`. A strict script/style policy needs real-browser validation
  (Next.js hydration, framer-motion, Tailwind inline styles) which the build
  sandbox can't run, so it wasn't shipped blind. Add with browser validation.
- **TD-H2-2 — Public booking flood protection. ✅ RESOLVED (H3).** Correcting an
  earlier overstatement: the endpoint was already per-IP + per-phone limited. On
  Product Office review (elevated to pilot-blocking) it gained a third per-doctor
  cap (20/hr) so a single clinic's public calendar can't be flooded under phone/IP
  rotation. `src/app/api/public/bookings/route.ts`.
- **TD-H2-3 — `clientIp()` trusts `X-Forwarded-For` (deployment mitigation).**
  IP-based rate limits are spoofable unless the app runs behind a trusted proxy
  that rewrites XFF. Identity-based limits are unaffected. Capture in the H3
  Deployment Guide; a configurable trusted-proxy hop count is a possible code
  follow-up.
- **CSRF (accepted, no action).** `SameSite=Lax` session cookie + all mutations
  on POST/PATCH/DELETE is the standard Next.js CSRF posture; a synchronizer token
  is a post-pilot enhancement.

---

## 3. Future improvements (sequenced)

**M1 — Real authentication (addresses D1, D2, D6)**
Credentialed staff login; real OTP delivery; extend the session to doctors;
gate `/doctor` and `PATCH /api/appointments/[id]` via
`canAccessDoctorWorkspace()` (helper already exists, currently unenforced);
pass the session user as `actorUserId` so doctor actions are attributed.
Single source of session truth; delete localStorage mirrors.

**M2 — Organization schema (addresses D5, C1, C6)**
Add `Organizations`, `Organization_Members(user_id, organization_id, role)`
tables mirroring `src/domain/organization.ts`. Backfill from
`Clinics.super_admin_id` + `Staff_Profiles` (additive migration — no
destructive change). Swap `organization-repository.ts` internals; consumers
of the service are unaffected. Then: replace the session guard's ad-hoc
clinic resolution with `organization-service.getMembership()`, add an
active-workspace claim to the session, and remove the first-clinic-by-name
fallback.

**M3 — Tenancy enforcement (addresses D3)**
Auth + organization scoping on `/api/clinics`, `/api/doctors`,
`/api/appointments`. This is a breaking API change for the patient app
(it browses doctors pre-login) — needs a public, intentionally-scoped
directory endpoint as part of the same change.

**M4 — Contract hygiene (addresses D4, D9, D10, D12)**
One coordinated pass: stop leaking `details`, unify the two 4xx label
quirks, page the list endpoints, align `POST /api/appointments` with the
state machine, and introduce shared request/response schemas (zod) consumed
by both route validation and `src/shared` types.

**M5 — Time & concurrency correctness (addresses D8, D11, D13)**
Clinic-timezone day boundaries computed server-side only; DB-enforced queue
numbering when the database supports it; revisit the transition table once
the doctor console checks patients in.

---

## 4. Dependencies

**Runtime/library:**
- Next.js 16.2.x (App Router), React 19.2.x, TypeScript 5
- Prisma 6.19.x on SQLite (`prisma/dev.db`) — SQLite is pilot-only: no
  date-truncated unique indexes (D11), single-writer
- Tailwind 4, shadcn/ui on `@base-ui/react` (not Radix), lucide-react, sonner
- No test framework installed — the refactor was verified by a 23-endpoint
  response-snapshot diff (see git history); adding vitest + route tests is
  the first prerequisite for M1–M4

**Internal (build-order) dependencies:**
- M2 depends on M1 (memberships are meaningless without proven identity)
- M3 depends on M2 (scoping needs organizations) and M1 (needs sessions)
- M4 is independent but cheapest bundled with M3's breaking window
- `docs/architecture-audit.md` holds the file-level detail behind every
  item above

**External integrations (all currently mocked or absent):**
- SMS/OTP provider (Twilio placeholder in `/api/auth/otp/send`)
- No email, no payments, no EHR integrations yet
