# 12 — API Concepts

← [11 Database Concepts](./11-database-concepts.md) · [Index](./00-README.md) · Next: [13 Events](./13-events.md)

Conceptual request → effect per domain — not a wire-format reference. Every route lives under `src/app/api/`; the full route list is in [05-complete-navigation.md](./05-complete-navigation.md). Every non-public route is guarded by one of a small number of centralized authorization helpers in `src/api/session.ts` (see [14-security.md](./14-security.md) for the mechanics).

## Auth / session

| Endpoint | Effect |
|---|---|
| `POST /api/auth/login` | Verifies scrypt-hashed password + `is_active`; creates a `Session`; resolves surface via `resolveSurfacePath` (or routes to `/workspace` for 2+ memberships) |
| `POST /api/auth/logout` | Destroys the current `Session` row + clears the cookie |
| `POST /api/auth/otp/send` | Issues a fresh, hashed, expiring, single-use `OtpChallenge` for a patient phone; echoes the code back only in non-production **and** only when no real SMS provider is configured |
| `POST /api/auth/otp/verify` | Validates the OTP (attempt-capped, single-use), creates a patient `Session` scoped to the resolved `PatientProfile` |
| `POST /api/auth/password/change` | Clears `must_change_password`, sets the new password hash |
| `POST /api/auth/switch-profile` | Changes which linked `PatientProfile` the session is "acting as" (family sharing) — never trusts a client-supplied profile id without checking `AccountProfileLink` first |

## Workspace

| Endpoint | Effect |
|---|---|
| `GET /api/workspaces` | Lists the caller's memberships for the Workspace Selector |
| `POST /api/workspace/switch` | Validates the caller actually holds the requested membership, updates `Session.active_membership_id` |

## Appointments (the shared, three-actor endpoint)

| Endpoint | Effect / capability check |
|---|---|
| `GET /api/appointments` | Scoped three ways by caller type: patient → own `activeHealthcareProfileId` only; doctor → own active-membership id only; reception/`super_admin` → their clinic. A client-supplied filter that doesn't match the caller's own scope is **rejected (403)**, not silently narrowed, for the patient/doctor branches |
| `PATCH /api/appointments/[id]` | Status transitions (`transitionStatus`, single choke point shared with the reception endpoints) + clinical field writes (chief complaint, notes, vitals, diagnosis, prescription) |
| `POST /api/appointments/[id]/review` | Patient submits a review for a completed appointment (at most one, enforced by `Review.appointment_id @unique`) |

## Reception queue/status/dashboard

| Endpoint | Effect |
|---|---|
| `GET /api/reception/queue` | The 3-lane board's data, scoped to the caller's active-membership clinic |
| `POST /api/reception/checkin` | Marks a scheduled arrival checked in (`checked_in_at` set) |
| `PATCH /api/reception/status` | Reception-side status transitions (Send in, Mark done) — same `transitionStatus` table as the doctor console |
| `POST /api/reception/walkin` | Creates/resolves a `PatientProfile` (with or without a `User`) + a walk-in `Appointment` directly into the queue |
| `GET /api/reception/dashboard` | Legacy dashboard data (still reachable at `/staff/dashboard`) |

## Organizations / staff / invitations

| Endpoint | Effect / capability check |
|---|---|
| `GET/POST /api/organizations`, `/api/organizations/[id]` | Org CRUD — resolved via `requireOrganizationContext` (legal-owner path tried first, then operational-membership path) |
| `GET /api/organizations/[id]/command-center` | Aggregates the Command Center tiles (appointments today, in queue, doctors on floor, collected today, needs-attention items) |
| `GET/POST /api/organizations/[id]/staff` | Team roster + lifecycle actions (suspend/reactivate/archive) — gated by `team:manage`; ownership grant (`team:assign_owner`) is a **separate**, stricter check |
| `GET/POST /api/organizations/[id]/invitations` | Create/list invites; seat availability (`checkSeatAvailability`) is checked before an invite is created, not just at accept time |
| `POST /api/organizations/[id]/ownership` | Legal ownership transfer — gated by `requireLegalOwnerContext`, refuses even an operational owner/Practice Manager |
| `GET/POST /api/organizations/[id]/departments` | Department CRUD |
| `GET /api/organizations/[id]/activation` | Module/feature activation state for the org |
| `GET /api/organizations/[id]/events` | Event Platform visibility for this org (publish/retry/DLQ state) — see [13-events.md](./13-events.md) |
| `GET/POST /api/invitations`, `/api/invitations/[token]`, `/api/invitations/[token]/accept` | The invite-accept transaction: creates `User` + `StaffProfile` + `OrganizationMember` atomically |

## Billing / invoices / payments

| Endpoint | Effect |
|---|---|
| `GET/POST /api/billing/invoices`, `/api/billing/invoices/[id]` | Invoice lifecycle (`draft → issued → paid`, or `void`); a correction is a new invoice + void, never an in-place edit |
| `/api/clinic/payment`, `/api/clinic/payments` | Solo-surface payment collection (parallel path to reception's checkout, same underlying `Invoice`/`Payment` model) |

## Lab orders

| Endpoint | Effect |
|---|---|
| `GET/POST /api/lab-orders`, `/api/lab-orders/[id]` | `ordered → resulted/cancelled`; `resulted` is terminal — amendments are new facts |

## Patients / profiles / timeline / invoices / notifications

| Endpoint | Effect |
|---|---|
| `GET/POST /api/patients`, `/api/patients/[id]` | Patient profile CRUD (staff-facing) |
| `GET /api/patients/[id]/timeline` | The visit-timeline data backing both the patient's own Records view and staff patient-detail views |
| `GET /api/patients/[id]/invoices`, `/api/patients/[id]/lab-orders` | Per-patient financial/diagnostic history |
| `GET /api/patients/[id]/notifications` | In-app notification list |
| `POST /api/patients/[id]/onboarding` | Onboarding-completion flag |
| `GET /api/patients/family-members` | Resolves the account's linked profiles (Family tab) |
| `GET/POST /api/patients/favorites`, `/api/patients/favorites/doctors` | Starred doctors |
| `GET/POST /api/patients/sessions`, `/api/patients/sessions/[id]` | Session list/revoke — backs "Sign-in & security" in patient Settings |

## Patient recommendations / uploads (self-service diagnostics)

| Endpoint | Effect |
|---|---|
| `GET/POST /api/patient/recommendations`, `/api/patient/recommendations/[id]` | The patient's own view of `TestRecommendation`s — status progression is patient-driven (booked/completed/report_uploaded) |
| `POST /api/patient/uploads` | Report upload via `StorageService` — the API only stores an opaque URL |

## Clinic schedule (solo surface)

| Endpoint | Effect |
|---|---|
| `/api/clinic/schedule`, `/api/clinic/today`, `/api/clinic/overview`, `/api/clinic/dashboard` | The solo consolidated surface's read models — same underlying `Appointment`/`Invoice` data as `/admin`/`/doctor`/`/staff`, just aggregated differently for the one-person view |
| `/api/clinic/book`, `/api/clinic/booking-status`, `/api/clinic/booking-shared` | Solo booking + the public booking-page share/copy-link tracking (`Clinic.booking_shared_at`) |
| `/api/clinic/consultation` | Solo consultation write path (parallel to `/api/appointments/[id]` for the consolidated surface) |
| `/api/clinic/profile`, `/api/clinic/team`, `/api/clinic/team/[staffId]` | Practice profile + the solo surface's simplified team management |
| `/api/clinic/templates`, `/api/clinic/templates/[id]` | `ClinicalTemplate` CRUD |
| `/api/clinic/plan`, `/api/clinic/plan/upgrade-request` | Seat/plan visibility + an upgrade request (no self-service plan change/payment flow — Category C, deferred) |
| `/api/clinic/uploads` | Practice-profile asset uploads (logo/cover/gallery/documents) |

## Doctors / availability (marketplace + scheduling)

| Endpoint | Effect |
|---|---|
| `GET /api/doctors`, `/api/doctors/[id]` | Doctor directory + profile (used by both staff-side listings and the public Find Care directory) |
| `GET /api/doctors/[id]/availability`, `/api/doctors/[id]/time-blocks` | `DoctorAvailability` + `DoctorTimeBlock` CRUD |
| `GET /api/doctors/[id]/slots`, `/api/doctors/next-slots` | Computed bookable slots (availability minus bookings minus blocks minus breaks, respecting `allow_double_booking`/caps) |
| `GET /api/doctors/[id]/reviews` | Aggregated review data (a clinic's own rating is derived from its doctors' reviews, not a second parallel clinic-review model) |

## Public (no login required)

| Endpoint | Effect |
|---|---|
| `GET /api/public/doctors`, `/api/public/doctors/[id]` | Public Find Care directory |
| `POST /api/public/bookings` | Public self-service booking — respects `Clinic.accepting_bookings`; refuses when the clinic has paused online bookings (reception's own booking path is unaffected) |

## Clinics / services / onboarding

| Endpoint | Effect |
|---|---|
| `GET /api/clinics`, `/api/clinics/[id]`, `/api/clinics/directory` | Clinic CRUD + public directory listing |
| `GET/POST /api/services`, `/api/services/[id]` | The "Treatments & Services" catalog |
| `POST /api/onboarding/quick-setup` | New-org/new-clinic guided setup |

## Releases / Sprints (platform-admin only)

| Endpoint | Effect |
|---|---|
| `/api/releases`, `/api/releases/[id]`, `/api/releases/[id]/status`, `/api/releases/[id]/view`, `/api/releases/unread-count` | Auriva's own release-notes authoring/publishing pipeline — gated by `requirePlatformAdminContext` (`User.is_platform_admin`), a flag **never** granted by any customer signup/invite flow, and deliberately separate from `super_admin` |
| `/api/sprints`, `/api/sprints/[number]` | Sprint tagging/reference data feeding release notes |

## Demo / health

| Endpoint | Effect |
|---|---|
| `POST /api/demo/enter` | Rate-limited entry into the sandbox "SmileCare Physiotherapy" demo org (Demo Mode, `is_demo = true`) — the demo owner account carries **no password**, reachable only through this endpoint, never normal credential login |
| `POST /api/demo/reset` | Wipes and reseeds volatile content **only** for `is_demo = true` organizations — a real customer org is never touched |
| `GET /api/health`, `/api/ready` | Liveness/readiness — the monitoring targets named in the Go-Live gates ([15-operations.md](./15-operations.md)) |

## Files

| Endpoint | Effect |
|---|---|
| `GET /api/files/[key]` | Serves an opaque `StorageService`-issued object (local storage today, object storage later — the API contract doesn't change either way) |

## The capability-check pattern (applies to almost every endpoint above)

Every staff-facing route calls one of:

- **`requireStaffContext(authorize, requestedClinicId?)`** — resolves the caller's active membership, checks `mustChangePassword`/`membershipStatus`, computes effective capabilities, and authorizes against either a legacy role predicate or a `Capability` string.
- **`requireAppointmentAccess({ patientId?, doctorId?, clinicId? })`** — the three-actor appointment-scoping rule described above.
- **`requireOrganizationContext(authorize, requestedOrganizationId?)`** / **`requireLegalOwnerContext(requestedOrganizationId?)`** — organization-level resolution, legal-owner-first then operational-membership fallback.
- **`requirePatientContext()`** — patient session + active healthcare profile.
- **`requirePlatformAdminContext()`** — the internal-only Release Management gate.

See [14-security.md](./14-security.md) for the full mechanics of each.
