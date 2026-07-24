# 08 — Business Rules

← [07 Workflow Library](./07-workflow-library.md) · [Index](./00-README.md) · Next: [09 UI Components](./09-ui-components.md)

The exhaustive rulebook. One subsection per rule area. Source: `src/domain/*.ts` (the single-choke-point pattern — every rule below is enforced in exactly one module, never duplicated per caller).

## 1. Appointment lifecycle (the connective tissue of the whole product)

**Statuses:** `scheduled → checked_in → waiting → doctor_ready → in_consultation → completed`, with `skipped`, `no_show`, and `cancelled` as side branches.

**Legal transition table** (`src/domain/appointment-status.ts`, enforced once in `appointment-service.transitionStatus()` — both the doctor console and the reception queue route through the same function):

| From | May move to |
|---|---|
| `scheduled` | `checked_in`, `waiting`, `in_consultation`, `cancelled`, `no_show` |
| `checked_in` | `waiting`, `in_consultation`, `cancelled`, `no_show` |
| `waiting` | `doctor_ready`, `in_consultation`, `skipped`, `cancelled`, `no_show` |
| `doctor_ready` | `in_consultation`, `skipped`, `cancelled`, `no_show` |
| `skipped` | `waiting`, `in_consultation` (recallable only back into the active queue, never a permanent reorder) |
| `in_consultation` | `completed` (terminal, one-way) |
| `completed` | *(terminal — no further transitions)* |
| `no_show` | *(terminal)* |
| `cancelled` | *(terminal)* |

**Who owns each stage** (see [07-workflow-library.md](./07-workflow-library.md) Audit A for the full table): Patient/Reception own booking; Reception owns check-in→queue; Doctor owns in-consultation; the **Sign & complete status flip is the ownership transfer** from Doctor to Reception (the "Done · to collect" lane is literally the reception inbox for that flip).

**Timestamp side effects** (`timestampPatchFor`): moving into `checked_in`/`waiting` sets `checked_in_at` (once only); into `in_consultation` sets `started_at` (once only); into `completed` sets `completed_at` (once only). Idempotent — re-entering a status never overwrites an already-set timestamp.

**Display language varies by persona, same row:** patient sees "visit," reception sees "appointment," doctor sees "consultation" — see the glossary in [04](./04-information-architecture.md).

## 2. Reception board — 3-lane mapping + wait-aging thresholds

The front-desk board (`/staff/queue`) maps the 8-state machine onto **3 visual lanes**:

| Lane | Statuses shown |
|---|---|
| Waiting | `waiting`, `doctor_ready`, `skipped` (shown with a recall affordance) |
| In consultation | `in_consultation` |
| Done · to collect | `completed` (until its invoice is paid) |

**Queue display order** (`QUEUE_ORDER`, most urgent first): `doctor_ready, in_consultation, waiting, skipped, checked_in, scheduled, completed, no_show, cancelled`.

**Wait-aging thresholds (visual only, no alerts, no auto-actions):** a waiting card ages **≥20 minutes → honey/yellow**, **≥30 minutes → orange**, **≥45 minutes → red**. This is a "front desk naturally prioritises" signal, deliberately *not* a notification or an escalation workflow — Front Desk Intelligence (auto-balancing, wait prediction, SMS-while-waiting, no-show prediction) is an explicit future-epic deferral, not MVP.

## 3. Patient lifecycle & identity

- **Healthcare Profile vs Auriva Account are different things.** A `PatientProfile` (the clinical identity — "Healthcare Profile") can exist **with no `User` account at all** — reception/emergency registration creates a full clinical record without requiring the patient to ever log in. `PatientProfile.user_id` is nullable and `onDelete: SetNull`.
- **One phone → many profiles = family sharing.** `Contact.value` (the phone number) is deliberately **NOT unique** — the same number can appear on many `Contact` rows for different profiles (e.g. a parent's phone registers a child's profile too). Uniqueness belongs only to `User.phone_number` (the login identity), never to a Contact.
- **`health_id` (format `AUR-XXXXXX`) is the stable, shareable key** — immutable, unique, never a phone number or Aadhaar. Generated from a 32-character ambiguity-free alphabet (excludes 0/O, 1/I — read aloud at reception counters often enough that this matters).
- **AccountProfileLink is the many-to-many join** between an Auriva Account and the Healthcare Profiles it can act as (self + dependents). A profile is "claimed" by at most one Account in practice (enforced at the service layer, not a DB constraint — a future identity-transfer feature needs to move a claim between accounts without a hard constraint fighting it).
- **Verification ladder:** `verification_level` starts `"unverified"`, becomes `"phone_verified"` once OTP-confirmed against a specific Contact (`Contact.verified_at`); the ladder is designed to continue further in a later phase.
- **Registration provenance, not an access grant:** `PatientProfile.registered_by_clinic_id` records which org registered the profile — it does not grant that org standing access; access is via `AccountProfileLink`/session scoping, not registration history.

## 4. Invoice lifecycle

**Statuses:** `draft → issued → paid`, with `void` reachable from either `draft` or `issued`. `paid` and `void` are terminal.

| From | May move to |
|---|---|
| `draft` | `issued`, `void` |
| `issued` | `paid`, `void` |
| `paid` | *(terminal)* |
| `void` | *(terminal)* |

**Correction rule:** a correction after issue is a **new invoice + void of the old one**, never an in-place edit — the same additive-facts principle as clinical amendments (APS-018 E1).

**Payment methods:** `cash`, `upi`, `card` — one-tap chips at checkout. Amounts are integer INR throughout (matches `consultation_fee`/`Invoice.total`/`Payment.amount`).

## 5. Doctor availability

- `DoctorAvailability` is a **recurring weekly grid** only (day_of_week 0–6, start_time, end_time) — deliberately does not model holidays/leave as a separate override table; that would need a second date-specific model and stays an honest "coming soon" rather than being faked.
- `DoctorTimeBlock` (Personal Time Blocking) is the **date-specific** exception layer — a one-off lunch, school pickup, or leave day. `getBookableSlots` removes any slot overlapping a block. This is deliberately kept separate from the weekly recurrence so neither model has to encode the other's shape.
- Optional **recurring within-day break** (`break_start`/`break_end`, e.g. lunch) and an optional **per-day patient cap** (`max_patients`) on `DoctorAvailability` — both nullable/additive; a day with neither behaves exactly as before.

## 6. Role switching / workspace switching / clinic switching + isolation

- **One credential → many workspaces.** `StaffProfile` was relaxed from a 1:1 to a 1:N relationship with `User` (Batch B) so one identity can hold a membership per clinic.
- **§13a Isolation Rule (APS-044):** suspending/archiving/scoping is always **per-membership** — a member suspended in one clinic is completely unaffected in another. Every staff-scoped query resolves through the caller's **active membership**, never a client-supplied clinic id (for profile-holding staff; only a `super_admin` may address a specific clinic id, and only among clinics they actually own).
- **Session-scoped, not client-trusted:** `active_membership_id` (staff) and `active_healthcare_profile_id` (patient) live on the `Session` row server-side; a client can never simply assert "I am acting as X" — every switch is validated against what the caller actually holds before the session is updated.
- **Switching re-scopes wholesale:** the entire content region reloads on switch; this decisive re-render is treated as the felt proof of isolation, not just a legal footnote.

## 7. Permission inheritance (capabilities vs permissions — the two-layer model)

Auriva deliberately splits authorization into **two layers**:

1. **Capabilities** (`WORKSPACE_CAPABILITIES`: `reception`, `doctor_workspace`, `admin_portal`, `patient_workspace`, `diagnostics`) decide **which surface** a member may open at all.
2. **Permissions** (the C2 matrix, 20 action-level permissions) decide **what they may do** once inside — because two roles can share a surface (Owner + Practice Manager both open `/admin`; Doctor + Nurse both open `/doctor`) yet carry different authority.

**`admin_portal` gates Owner + Practice Manager only.** A capability can be **granted beyond role defaults** via `StaffProfile.capabilities` (a JSON array) — this is how a solo practitioner (a `doctor` role, granted `reception`) runs the whole front desk alone without a role change or a parallel "solo mode." Effective capabilities = role defaults ∪ grants; an ungranted account behaves exactly as its role default, so nothing changes until a grant is explicitly added.

**Guiding principle #7 of the C2 matrix: "visibility should exceed authority."** Where a role touches a domain at all, it far more often gets a `view` permission than a matching write verb (e.g. Practice Manager gets `clinical_records:view` but never `clinical_records:edit`; Nurse gets `clinical_records:view` + `vitals:write` but never `consultation:write`).

**Full permission matrix (C2, frozen 2026-07-18):**

| Permission | Owner | Practice Mgr | Doctor | Receptionist | Nurse | Technician |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `appointments:manage` | ✅ | ✅ | | ✅ | | |
| `appointments:view` | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `patients:manage` | ✅ | ✅ | | ✅ | | |
| `patients:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `clinical_records:view` | ✅ | ✅ (view only) | ✅ | | ✅ | |
| `clinical_records:edit` | ✅ | | ✅ | | | |
| `consultation:write` | ✅ | | ✅ | | | |
| `vitals:write` | ✅ | | ✅ | | ✅ | |
| `diagnostics:view` | ✅ | ✅ | ✅ | | ✅ | ✅ |
| `diagnostics:order` | ✅ | | ✅ | | | |
| `diagnostics:results:write` | ✅ | | | | | ✅ |
| `billing:manage` | ✅ | ✅ | | ✅ | | |
| `payments:collect` | ✅ | ✅ | (only via `reception` grant) | ✅ | | |
| `schedule:view` | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `schedule:own` | ✅ | | ✅ | | | |
| `schedule:manage` | ✅ | ✅ | | | | |
| `reports:own` | ✅ | ✅ | ✅ | | | |
| `reports:org` | ✅ | ✅ | | | | |
| `team:manage` | ✅ | ✅ | | | | |
| `team:assign_owner` | ✅ **(never delegated)** | | | | | |
| `plan:manage` | ✅ **(never delegated)** | | | | | |
| `settings:manage` | ✅ | ✅ | | | | |
| `practice_profile:own` | ✅ | ✅ | ✅ | | | |
| `audit:view` | ✅ | ✅ | | | | |

`team:assign_owner` and `plan:manage` are the **two never-delegated owner-only powers** — even a Practice Manager who otherwise shares every operational capability with the Owner cannot touch them, because they are additionally gated by **legal ownership** (`Organization.owner_user_id`), a data fact resolved per request, not a role check.

## 8. Legal vs operational ownership

- **Legal owner:** `Organization.owner_user_id` — resolved first in `requireOrganizationContext`; carries `isLegalOwner: true`.
- **Operational owner/manager:** resolved via the caller's own active `StaffProfile` membership when they are not the legal owner; carries `isLegalOwner: false`.
- **`requireLegalOwnerContext`** is the stricter gate used only for plan/subscription, ownership transfer, and organization deletion — an operational owner (even a Practice Manager with every other capability) is refused here.
- **Last-owner block [INFERRED — principle stated in user memory/frozen RBAC matrix, not re-derived from code in this pass]:** the frozen C2 matrix design includes a rule that an organization can never be left with zero owners (a transfer or demotion that would remove the last legal/operational owner is blocked). Verify the exact enforcement point in `src/services/` if this needs to be cited precisely.

## 9. Booking rules

- **No double-booking:** `getBookableSlots` computes available slots from `DoctorAvailability` minus already-booked `Appointment`s in that slot minus any overlapping `DoctorTimeBlock`, minus anything inside a recurring break window. `Clinic.allow_double_booking` (default `false`) is the explicit override switch if a clinic ever wants to allow it.
- **Public booking respects `Clinic.accepting_bookings`** (clinic-wide switch, default `true`): when `false`, the public self-service "choose a time" action is disabled and the public booking endpoint refuses, but clinic details/phone/hours remain visible with a "call us" fallback. **Reception's phone-in booking is deliberately unaffected** — the fallback message only works if the desk can still book.
- **Per-clinic operational config** (all nullable = "no policy set, behave as before"): `default_slot_duration_minutes`, `buffer_minutes` (per-clinic; a `Service` can override with its own `buffer_minutes`), `max_appointments_per_doctor_per_day`, `allow_walk_ins` (default `true`), `cancellation_window_hours`.

## 10. Cancellation

- Reachable from `scheduled`, `checked_in`, or `waiting` → `cancelled` (terminal).
- `Clinic.cancellation_window_hours` (nullable = no restriction) governs how close to the appointment time a cancellation may still occur — **[INFERRED enforcement point]**: the constraint is declared on `Clinic`; the exact service-layer check was not re-read in this pass — verify in `src/services/appointment-service.ts` if precise wording is needed for a spec.

## 11. Checkout & payments (recap of the money rules)

- An invoice must be `issued` (or created directly issued) before payment; `Payment` rows accumulate against an `Invoice`; the invoice moves to `paid` once collected in full (the checkout modal's UI treats a single Collect action as covering the full total — no partial-payment UI was found in the reviewed screens).
- `received_by_user_id` on `Payment` records which staff member actually took the money (audit trail).
- Amounts are always integer INR — never fractional currency — matching every other money field in the schema.

## 12. Lab & diagnostics

- **`LabOrder`** (clinic-run): `ordered → resulted | cancelled`. `resulted` is terminal — amendments are new facts, never edits.
- **`TestRecommendation`** (patient-driven referral, "Auriva does not run the lab"): `pending → booked → completed → report_uploaded`. The patient controls progression; the doctor only creates the initial recommendation (snapshotted `test_code`/`test_name`/`prep_instructions` from `src/domain/diagnostics-catalog.ts` so a later catalog change never rewrites history).

## 13. Notifications

- **In-app only.** `Notification` rows are generated from the Event Platform (see [13-events.md](./13-events.md)) as a **patient-facing projection**, idempotent via `source_event_id` (unique) so at-least-once event redelivery never double-notifies.
- Types: `appointment_booked`, `appointment_rescheduled`, `appointment_cancelled`, `invoice_issued`, `lab_result_ready`.
- **No SMS/email delivery exists** — this is a known, documented limitation for the RC, not an oversight (see [15-operations.md](./15-operations.md) and [17-roadmap.md](./17-roadmap.md)).

## 14. Seat model (subscription)

| Plan | Owner cost | Max doctors | Max receptionists | Max non-owner seats |
|---|---|---|---|---|
| **Solo** | Free, never counts | 1 | 1 | 2 (the "2/2" cap) |
| **Professional** | Free | 5 | 14 | 14 (bounded by total, not independently) |
| **Enterprise** | Free | ∞ | ∞ | ∞ (not a real tier this release — UI "Coming soon") |

- A **"doctor"** for seat-counting purposes = any `StaffProfile` with a `specialty`; a **"receptionist"** = any `StaffProfile` without one (the same heuristic `doctor-resolution.ts` already used elsewhere).
- **Pending, unexpired invitations count toward usage** — the cap cannot be bypassed by sending many invites against a small remaining seat count.
- **Suspended/archived members do not count** — freeing a seat is a genuine, real outcome of suspending someone (this is precisely why Suspend is distinct from Archive: Suspend is reversible and immediately frees capacity; Archive additionally requires reassigning open work).
- Seat ceilings are **plan-wide constants**, never stored per-organization (no custom/negotiated seat limits in this release's scope).

## 15. Last-owner block, ownership transfer

Ownership transfer and the last-owner guard are part of the frozen Batch D · D3 (Ownership & Operational Authority) design: exactly one legal owner exists per organization at a time; the two never-delegated powers (`plan:manage`, `team:assign_owner`) exist specifically so that transferring or granting ownership is a deliberate, singular, auditable act rather than something that falls out of the general permission-grant mechanism. **[INFERRED]** — the precise runtime guard against removing the very last owner was described in prior team memory as frozen policy; verify the exact service-layer implementation (`src/services/organization-service.ts` or similar) before quoting exact error copy.

## 16. "Surfaces are workflow containers" — the resolver

`resolveSurfacePath(capabilities, isSoloClinic)` is the single, pure function that decides which surface a login/switch lands on:

```
solo (single-member clinic AND reception + doctor_workspace + admin_portal all held) → /clinic
has admin_portal                                                                      → /admin
has doctor_workspace                                                                   → /doctor
has reception OR diagnostics                                                            → /staff
none of the above                                                                       → null (no staff surface)
```

Because this function is pure and keys only off capabilities, "growing into a team" falls out for free: a solo owner-doctor resolves to `/clinic` exactly while their clinic has one member, and to `/admin` the instant a second member joins (no explicit migration code needed).

## 17. Configuration/plan preset (archetype)

`Organization.archetype` (nullable) — one of `independent_clinic | multi_specialty | hospital | diagnostic_center | pharmacy_chain | day_care` — is purely a **config-path selector at signup**, not a tier or a fork. Every module stays activatable for every org regardless of archetype; an org can reconfigure afterward. The demo org uses `multi_specialty`.
