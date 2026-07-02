# Auriva — Technical Debt Register

**Date:** 2026-07-03
**Status:** documentation only — nothing in this file is implemented.
**Companion:** `docs/architecture-audit.md` (detailed findings with file references; items below carry the audit's C/R/L/A identifiers).

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
