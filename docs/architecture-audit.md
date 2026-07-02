# Auriva — Sprint 1 Architecture Audit

**Date:** 2026-07-03
**Scope:** Full read of the server surface (`src/app/api/**`, `src/lib/**`, `prisma/schema.prisma`) and the role-dependent parts of the UI (`src/app/login`, `src/app/staff/layout.tsx`, role heuristics in client libs).
**Purpose:** Identify assumptions that will block multi-workspace growth. This document records findings only — the accompanying refactor commits address the structural items; behavioral items are deferred and tracked in `docs/technical-debt.md`.

---

## 1. Current architecture (as found)

```
src/app/**            UI routes (patient, doctor, admin, staff, login)
src/app/api/**        Route handlers — mixed thickness:
                        thin (reception/*, appointments/[id]) → call services
                        thick (appointments, doctors, clinics, auth/*) → inline Prisma
src/lib/services/*    Sprint 1 service layer (appointment, queue, reception,
                        walk-in, patient) — transactional business logic
src/lib/appointment-status.ts   Status state machine (single source of truth)
src/lib/session.ts    Staff session (cookie + Session table) + clinic scoping
src/lib/queue.ts      Client-side view-model types/helpers for the doctor console
src/lib/workspace.ts  Client-side types/helpers for the admin portal
src/lib/prisma.ts     Prisma client singleton
```

**What is already good (do not regress):**
- A real status state machine (`appointment-status.ts`) with a single transition choke point (`transitionStatus()`), used by both doctor console and reception.
- `AppointmentEvent` timeline written transactionally alongside every mutation.
- Reception endpoints are session-gated and clinic-scoped server-side (client-supplied `clinic_id` is never trusted for receptionists).
- Walk-in and check-in logic is transactional, with duplicate-guard and queue-number assignment.
- `findOrCreatePatientByPhone` already extracted and shared between OTP login and walk-in registration.

---

## 2. Findings

### 2.1 Single-clinic assumptions

| # | Location | Assumption |
|---|----------|------------|
| C1 | `src/lib/session.ts` (`requireStaffContext`) | A super_admin with no explicit `clinic_id` silently falls back to their **first clinic ordered by name**. Works for a one-or-two-clinic pilot; wrong the moment an owner has many workspaces. |
| C2 | `GET /api/clinics` | Returns **every clinic in the database** to any caller — no auth, no tenancy filter. The admin portal then "picks the first one." |
| C3 | `GET /api/appointments`, `GET /api/doctors` | Unauthenticated and unscoped; the *client* decides which `clinic_id`/`doctor_id` to ask for. Cross-tenant reads are one query-param away. |
| C4 | `Clinic.super_admin_id` | Ownership is a **column, not a membership**. One user can own N clinics, but a clinic cannot have two admins, and "admin" can never be a doctor at another clinic. This is the core blocker for a real Organization model. |
| C5 | Doctor console (`live-queue.tsx`) | Fetches **all doctors across all clinics** and defaults to the first — there is no "my clinic" concept for doctors at all (no doctor session). |
| C6 | `Session` has no clinic/workspace column | The active workspace is re-derived per request from StaffProfile/ownership; a user working across two workspaces has no way to express "I am currently acting in clinic B." |

### 2.2 One-doctor-role / flat role model

| # | Location | Assumption |
|---|----------|------------|
| R1 | `User.role` (single string) | A user is exactly one of `patient \| super_admin \| doctor \| receptionist`, globally. A doctor who owns a clinic, or works at two clinics, cannot be modeled. Role belongs on the **membership**, not the user. |
| R2 | `Staff_Profiles` has no role column | "A doctor is a staff member with a specialty" — this heuristic is duplicated in `reception-service.ts` (`getDashboardSummary`) and client-side in `workspace.ts` (`roleOf`). Two copies of a guess. |
| R3 | `session.ts` `StaffRole = "receptionist" \| "super_admin"` | Doctors are structurally excluded from having sessions; the doctor console runs unauthenticated as a consequence. |

### 2.3 One-login-type assumption (actually three, none unified)

| # | Mechanism | Notes |
|---|-----------|-------|
| L1 | Patient OTP (`/api/auth/otp/*`) | Mock OTP (`123456` returned in the response), **no server session** — the patient app stores identity in `localStorage` and every subsequent call is unauthenticated. |
| L2 | Staff email+role (`/api/auth/login`) | **No password/credential proof** — knowing any staff email and picking their role in the UI logs you in. Issues a real session cookie (used by `/staff/*` only). Also mirrors identity into `localStorage` (`aura_b2b_session`) — two sources of truth. |
| L3 | Doctor console | **No login at all.** `/doctor` and `PATCH /api/appointments/[id]` are open (documented deliberately in Sprint 1). |
| L4 | `login/page.tsx` | Hardcodes demo emails per role and a per-role redirect map inline. |

### 2.4 Hardcoded role checks (inventory)

Every literal role comparison found:

| Location | Check |
|----------|-------|
| `src/lib/session.ts:117` | `allowedRoles.includes(session.role)` (array literals at 5 call sites) |
| `src/lib/session.ts:121` | `session.role === "receptionist"` (clinic-scoping branch) |
| `src/app/staff/layout.tsx` | `session.role !== "receptionist" && session.role !== "super_admin"` |
| `src/app/api/reception/{checkin,dashboard,queue,status,walkin}` | `requireStaffContext(['receptionist', 'super_admin'])` ×5 |
| `src/app/api/auth/otp/verify/route.ts` | `user.role !== 'patient'` |
| `src/lib/services/patient-service.ts` | `existing.role !== "patient"` |
| `src/app/login/page.tsx` | `role === 'super_admin' / 'doctor' / 'receptionist'` (email prefill + redirect map) |
| `src/lib/workspace.ts` (`roleOf`) | specialty ⇒ doctor heuristic (client) |
| `src/lib/services/reception-service.ts` | `Boolean(member.specialty)` ⇒ doctor heuristic (server) |

### 2.5 Tightly coupled appointment logic

| # | Location | Issue |
|---|----------|-------|
| A1 | `POST /api/appointments` | ~100 lines of validation + 3 existence checks + create, all inline in the route. Its allowed-status list (`scheduled, waiting, in_consultation, completed`) is a **stale subset** of the real 8-status machine — `checked_in`, `doctor_ready`, `no_show`, `cancelled` cannot be seeded via this API, and the list is maintained separately from `appointment-status.ts`. |
| A2 | `GET /api/appointments` | Inline Prisma with `where: any`, unbounded result set, no pagination, duplicate include-shape (`QUEUE_INCLUDE` exists in queue-service but this route redefines it). |
| A3 | `PATCH /api/appointments/[id]` | Correctly routed through `transitionStatus()`, but unauthenticated (see L3) and takes no actor — timeline events from the doctor console have `actor_user_id: null`. |
| A4 | Transition table loosened for UI | `scheduled → waiting/in_consultation` kept valid purely because the doctor console pre-dates check-in. Business rule bent to a client. |
| A5 | Day-boundary logic duplicated | `startOfDay/endOfDay` (server, queue-service) vs `isToday` (client, `lib/queue.ts`) — both implement "today" independently, in server-local resp. browser-local time. |
| A6 | Queue numbers | Application-enforced (`assignQueueNumber` inside a transaction), no DB constraint — documented, fine at pilot volume, needs revisiting with concurrency. |

### 2.6 API consistency

- **Error envelope drift:** `{ error, message }` (4xx) vs `{ error, details }` (500s) vs `{ error, message, details }`; `otp/verify` returns HTTP 400 with label `Unauthorized`; `POST /api/appointments` returns HTTP 400 with label `Not Found` for missing patient/doctor/clinic.
- **500s leak internals:** every catch block returns `details: error.message` to the client.
- **Success envelope drift:** bare arrays/objects (`appointments`, `doctors`, `clinics`, reception) vs `{ success: true, ... }` (auth routes).
- **Repeated error-mapping:** the `instanceof AppointmentNotFoundError / InvalidTransitionError / …` → status-code chain is copy-pasted across 5 route files.
- **Inconsistent guard placement:** some routes run auth outside `try/catch` (`reception/dashboard`, `queue`), others inside (`checkin`, `status`, `walkin`).
- **Logging:** bare `console.error` with per-route ad-hoc prefixes; no shared logger, no request context.
- **Validation:** ad-hoc `if (!field)` chains with per-route message wording; `any`-typed request bodies throughout.

### 2.7 Client/server type duplication

`src/lib/queue.ts` and `src/lib/workspace.ts` hand-maintain TypeScript mirrors of API response shapes. Any server include-shape change silently drifts from these types (no shared contract, no runtime validation).

---

## 3. Disposition

**Addressed by the architecture-prep refactor (no behavior change):**
- Layered structure: `domain/ · repositories/ · services/ · api/ · shared/` (findings A1, A2 partially — logic extracted; contracts preserved).
- Organization abstraction over Clinic (prepares C4/R1 without migration).
- Centralized authorization helpers (all of 2.4).
- Single doctor-heuristic implementation (R2).
- Standard response/logging/validation helpers with byte-identical contracts (all of 2.6).

**Deliberately NOT addressed now (would change behavior/contracts)** — carried to `docs/technical-debt.md`:
C1–C3, C5, C6, L1–L4, A3, A4, A5, A6, the 500-details leak, the stale status list in `POST /api/appointments`, pagination, and shared client/server contracts.
