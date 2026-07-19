# 07 — Workflow Library

← [06 Feature Catalog](./06-feature-catalog.md) · [Index](./00-README.md) · Next: [08 Business Rules](./08-business-rules.md)

Every complete workflow, step by step, followed by the five canonical end-to-end journeys (Owner, Reception, Doctor, Patient, Administrator) as validated in the UXS-043 Phase 1 whole-of-product review.

## Login (+ multi-profile "Who's signing in?" / Workspace Selector)

1. Staff enters phone or email + password at `/login`. Field auto-detects format (India 10-digit phone vs email) and validates inline.
2. `POST /api/auth/login` verifies the scrypt-hashed password and `is_active`.
3. Session created (`Session` row, hashed token cookie, 12-hour TTL — "a work shift").
4. If `must_change_password` is true → forced to `/change-password` first; nothing else is reachable (enforced server-side, not just routing).
5. `resolveActiveMembership` counts the account's `StaffProfile` memberships:
   - **1 membership:** auto-opens directly into the resolved surface (`resolveSurfacePath`).
   - **2+ memberships:** routes to `/workspace`, the Selector, pre-selecting `User.last_workspace_id`.
6. Picking a workspace sets `Session.active_membership_id` and lands on that membership's resolved surface.

Patients use a parallel but separate flow: phone + OTP (`/api/auth/otp/send` → `/api/auth/otp/verify`), landing on `/patient` with `active_healthcare_profile_id` set to their primary linked profile. If the account is linked to multiple `PatientProfile`s (family sharing), the **Family** tab — not a login-time selector — is where they switch which profile they're acting as (`POST /api/auth/switch-profile`).

## Workspace / Clinic switching

1. Staff clicks the `WorkspaceSwitcher` chip `[mark] Clinic · Role ▾` in the shell top bar (single-membership accounts see a static label with no dropdown — nothing to switch to).
2. The selector overlay lists every membership.
3. Picking one calls `POST /api/workspace/switch`, which validates the caller actually holds that membership (never trusts a client-supplied id blindly), updates `Session.active_membership_id`.
4. The content region reloads wholesale — every list, count, and permission re-scopes to the new clinic. This decisive re-render **is** the isolation guarantee, felt rather than merely stated (APS-044 §13a).

## Invite staff

1. Owner/Practice Manager opens Team → Invite staff.
2. Fills phone (or email, legacy path) + full name + clinic + role (one of the six).
3. `Invitation` row created with a 72-hour expiry window, `status = "pending"`.
4. Invitee receives the invite link (WhatsApp/copy-link per the phone-first design — no email dependency for the primary path).
5. Invitee opens `/join/[token]`, and accepting creates `User` + `StaffProfile` + `OrganizationMember` in **one transaction** — this is a managed-provisioning account: `must_change_password = true`, no password set by the invitee at invite time.
6. First login forces the mandatory password change (see Login workflow above).
7. Seat availability is checked before the invite is even sent (`checkSeatAvailability` — pending unexpired invites count toward the plan's seat cap, so the cap can't be bypassed by spamming invites).

## Book appointment — patient self-service

1. Patient opens Book → searches/browses doctors (their "care team" — favourited/previously-seen doctors surfaced first).
2. Selects a doctor → sees profile + available slots (`GET /api/doctors/[id]/slots`, computed from `DoctorAvailability` + `DoctorTimeBlock` minus already-booked slots).
3. Confirms a slot → `Appointment` created with `status = "scheduled"`.
4. Full-screen **"You're booked ✓"** success moment (not just a toast — booking/checkout are the two flows PKG-6 elevates to a full success screen).
5. Respects `Clinic.accepting_bookings`; if false, the public booking action is disabled but clinic details/phone/hours stay visible ("call us" fallback) — this only applies to the **public/self-service** channel, never to reception's phone-in booking.

## Book appointment — reception (phone-in / walk-in scheduling)

1. Reception uses `/staff/calendar` (read-only `ClinicCalendar`, all doctors) to find a free slot for a caller.
2. Books via the same underlying appointment-creation path patient self-service uses — reception is deliberately **unaffected** by `accepting_bookings` being off (the "please call the clinic" fallback only makes sense if the desk can still book).

## Walk-in registration

1. Reception clicks **Register walk-in** from the front-desk board.
2. Minimal form: Name · Phone · Age/Sex · Reason · Doctor — designed to complete in under 20 seconds.
3. `POST /api/reception/walkin` creates (or resolves an existing) `PatientProfile` **with or without** a linked `User` account (reception/emergency registration does not require the patient to have logged in or ever will — Healthcare Profile is the clinical identity, Auriva Account is optional).
4. Appointment created with `walk_in = true`, `status` lands directly in the Waiting lane.

## Check-in → Send in → consultation

1. A scheduled patient arrives; reception checks them in (`checked_in_at` timestamp set) — status moves to `checked_in` or directly to `waiting`.
2. Reception clicks **Send in** when the doctor is ready — status moves to `in_consultation`, `started_at` set. (`doctor_ready` is an intermediate status some flows pass through.)
3. The patient now appears simultaneously in the doctor's Workbench queue rail ("In consultation") and the reception board's "In consultation" lane — this is a documented **soft** two-view situation, not a two-owner risk, because the *active* owner is always unambiguous (whichever lane shows "in consultation" — see Audit A below).
4. Doctor may **Skip** (→ `skipped`, recallable only back to `waiting`, never a permanent reorder) if the patient isn't ready when called.

## Consultation & clinical documentation

1. Doctor calls in the patient from Today or the queue rail.
2. Workbench opens with the **chief complaint pre-filled** from the booking/walk-in reason — the strongest persistence signal in the product (booking reason → chief complaint, verified in the Phase-1 Information Persistence audit).
3. Doctor writes/edits: chief complaint, clinical notes (one-click SOAP templates available), diagnosis (quick-add chips + free text), vitals (`vitals_json`).
4. The persistent clinical safety strip surfaces allergy/chronic-condition/critical-vitals facts throughout — read-only, factual, never a suggestion.

## Prescription

1. From the Workbench's Prescription section, doctor adds medicine rows (name/dosage/frequency/duration) — one-click prescription templates available.
2. Optionally sets a `follow_up_date`.
3. On **Sign & complete**, the accumulated Appointment fields are persisted; a first-class `Prescription` record is created (one per visit) mirroring the same data.
4. Prescription is printable at `/print/prescription/[id]` (browser-native print, no PDF service).

## Sign & complete

1. Doctor clicks the sticky **Sign & complete** action (always in-pane, never a dialog).
2. Appointment status transitions `in_consultation → completed`; `completed_at` timestamp set.
3. If a `follow_up_date` was set, a **new appointment is auto-scheduled** from it (`follow_up_source_appointment_id` links the two — Sprint 2 capability, at most one auto-scheduled follow-up per source visit).
4. The Workbench **auto-advances** to the next waiting patient and loads their context — no dead stop in the doctor's loop.
5. This status flip is simultaneously the **ownership handoff** to reception: the same appointment now appears in the "Done · to collect" lane.

## Checkout / Collect / Payment (UPI/Cash/Card → receipt)

1. Reception opens the Desk (`/staff/billing`) or clicks **Collect** directly from the board's "Done · to collect" lane.
2. An `Invoice` is drafted/issued with itemised `items_json` (e.g. consultation fee, add-ons).
3. Checkout modal shows the itemised invoice → total → one-tap payment method (UPI/Cash/Card).
4. **Collect ₹amount** creates a `Payment` row against the invoice; invoice status transitions to `paid`.
5. A receipt is available; the visit leaves the Desk's to-collect list.
6. The patient's Records timeline reflects "Paid" — same figure, continuous through the whole chain (verified in the Information Persistence audit).

## Lab order → fulfil → result

1. Doctor orders a test from the consultation (or a `TestRecommendation` is created as a referral for the patient to self-arrange — see below).
2. `LabOrder` created with `status = "ordered"`, `tests_json`.
3. Technician (or reception, in smaller clinics) enters results → `status = "resulted"`, `result_values_json`/`result_notes` populated, `resulted_by_user_id`/`resulted_at` set.
4. Alternatively `cancelled`. Amendments after `resulted` are new facts, never edits (APS-018 E1 principle — corrections are additive, not destructive).

**Diagnostics referral variant (`TestRecommendation`):** Auriva does not run its own lab — a doctor *recommends* a test during a consult; the patient books it wherever they like, gets it done, and uploads the report themselves (`status`: pending → booked → completed → report_uploaded). This lands in the patient's Health Vault (`/patient/records` and the Health Summary), not a clinic-run lab worklist.

## Patient portal navigation (Home/Book/Records/Family/You)

See [04-information-architecture.md](./04-information-architecture.md) for the route map; the workflow is simply the five-question loop: check Home for what's due today → Book if care is needed → after the visit, Records shows the outcome → Family to act on behalf of a dependent → You to manage identity/settings.

## Team lifecycle (invite / suspend / archive)

1. **Invite** — see above.
2. **Suspend** — Owner/Practice Manager suspends an Active member: `membership_status → "suspended"`. Access is revoked immediately (checked per-request in `requireStaffContext`, not just at next login) and **the seat is freed** (frees capacity in the plan's seat cap). History (past appointments, prescriptions, invoices) is retained.
3. **Reactivate** — reverses suspension, re-consumes a seat (subject to the plan's seat cap being available again).
4. **Archive** — a harder stop than suspend: requires **reassigning** the member's open items (e.g. upcoming appointments) to another team member as part of the same action (membership-service reconciliation, "atomic reconciliation-gated archive"). History is preserved permanently; the relationship is considered ended, not paused.

---

## The Five End-to-End Journeys (validated in UXS-043 Phase 1)

### Journey 1 — Owner
`Clinic setup → Team (invite/suspend/archive) → Command Center (daily read) → Settings → Governance.` Continuity: ✅ — solo → first-hire transition → cockpit is a clean growth story with no forced migration; roles match the frozen six exactly.

### Journey 2 — Reception
`Morning setup → Queue → Walk-in → Check-in → Consultation flow (hand-off) → Checkout → Close day.` Continuity: ✅ — the board's 3 lanes plus walk-in plus checkout form a complete, one-action-per-stage cash cycle.

### Journey 3 — Doctor
`Today's schedule → Consultation → Documentation → Prescription → Complete visit.` Continuity: ✅ — Mission Control → Workbench (stepper) → Sign & complete auto-advances; excellent internal flow.

### Journey 4 — Patient (New patient)
`Landing → Book → Reception check-in → Consultation → Checkout → Records → Follow-up.` Continuity: ✅ across the whole arc; state transitions (booked → checked-in → waiting → in-consult → completed → collected) all align; no dead ends found anywhere (booking confirm → "Back to Home"; checkout done → "Done"; empty consult → "Back to Today").

### Journey 5 — Administrator (Practice Manager operating day-to-day)
Same shape as Journey 1 minus the two legal-owner-only powers (plan/subscription, ownership transfer) — Command Center and Team management, full operational authority, clinical records view-only.

### Cross-journey audits (from the Phase 1 review — worth restating here as workflow law)

**Audit A — Workflow Ownership Continuity.** Every hand-off in the appointment lifecycle has exactly **one visible owner** at a time:

| Stage | Owner | The hand-off |
|---|---|---|
| Booking | Patient (self) or Reception (phone-in) | booking source is explicit |
| Check-in → queue | Reception | walk-ins land in a lane immediately, never limbo |
| In consultation | Doctor | patient sits in both the doctor's queue and the reception board, but the *active* owner is unambiguous — whichever lane shows "in consultation" |
| Sign & complete | Doctor → Reception | the status flip **is** the handoff |
| Payment | Reception | Desk/Collect |
| Records | Patient | owns their own vault view |

**Verdict:** no orphaned or double-owned tasks found anywhere in the lifecycle.

**Audit B — Information Persistence.** Patient identity, chief complaint, diagnosis/prescription, amount, and allergy/condition facts all survive every hop unchanged — the booking-reason → chief-complaint pre-fill and the amount → invoice → "Paid" chain are the clearest proof points.

**Audit C — Trust Continuity (patient emotional arc).** `Landing → Book → Confirmation → (staff-only middle, patient never sees it) → Checkout (reflected warmly on Home) → Records.` Trust holds or rises at every step the patient actually experiences — the operational "coldness" of staff surfaces is deliberately confined to staff, never shown to the patient. This is called out as Auriva's core differentiator.

For the full continuity map diagram and quantitative scores, see the source document `docs/prototype/UXS-043-phase1-e2e-review.md`.
