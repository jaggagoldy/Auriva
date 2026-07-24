# C2 — Procedure Management — Engineering Readiness

> **Process v3.0 · Step 1.** Concise readiness for Product-Office approval. **No code until approved.**
> **Customer Promise:** *"Track every therapy and procedure effortlessly."* · Phase 3 · Milestone C2 · ~2 sprints.

## Framing
C2 is **not a new engine** — it is the *operational + visibility* layer over C1's Treatment Plan / Session model. C1 already gives us plans, sessions, booking, progress, and charge-on-attend. C2 makes multi-session care **visible and manageable day-to-day**, and closes two C1 deferrals (calendar session label, patient plan card). It also completes attendance handling (a booked session that becomes a no-show/cancellation).

## Scope (IN)
- **Session attendance handling:** when a booked session's appointment is a **no-show or cancelled**, the session returns to *needs re-book* (not silently lost) — so "3 of 10 attended" is always truthful.
- **Reception "Sessions" operational view:** patients with **due / upcoming / overdue** sessions — the daily follow-up worklist ("who's mid-course and hasn't booked the next one").
- **Calendar session label** (C1 deferred): plan-session appointments render **"Physio (Session 4/10)"** on the schedule.
- **Patient plan card** (C1 deferred): the `PatientPlanCard` (already built) wired into the patient app via a patient-scoped read.
- **Session notes** (light): an optional per-session note (e.g., "tolerated well") — doctor-owned.
- **Reschedule a session** in one step (C1 had cancel + re-book).

## Out of scope (deferred)
- **Specialty-specific charting** (dental tooth chart, physio ROM/goniometry, speech milestones) → **Specialty Extensions** (Phase 5+). C2 stays **generic** — planned/completed/cancelled/no-show + a free note, no per-specialty fields or workflows (the standing architecture rule).
- Packages / prepaid session credits → **Phase 4**.
- Automated recurring-appointment generation → still one-next-session-at-a-time (C1 decision).

## Architecture
Pure reuse of C1's `TreatmentPlan`/`TreatmentPlanSession`. C2 adds an **aggregation read** (sessions due/overdue) + **appointment-status → session** reflection (no-show/cancel frees the session) + display labels. No new ledger, no charge changes (charge-on-attend from C1 is unchanged). Financial integrity is inherited, not re-implemented.

## Database (minimal, additive)
- `TreatmentPlanSession.notes String?` (session note) — one additive column. **No other schema change** — attendance, due-lists, and labels are derived from existing data + the appointment status machine.

## Backend
- `treatment-plan-service`: `reflectSessionAttendance` (on an appointment's no-show/cancel, revert its linked session to `planned` + clear `appointment_id` so it can be re-booked), `rescheduleSession` (move the linked appointment), `setSessionNote`, `getSessionsDue(clinicId)` (patients with active plans that have unbooked/overdue sessions).
- **Wire attendance:** in `appointment-service`, when a session-linked appointment transitions to `no_show`/`cancelled`, call `reflectSessionAttendance` (same pattern as C1's completion hook).
- **Calendar data:** extend `clinic-schedule-service` to annotate plan-session appointments with `plan_title` + `session_sequence`/`sessions_planned`.
- **Patient read:** `/api/patient/treatment-plans` (patient-scoped via `requirePatientContext`).

## Frontend
- **New — Reception "Sessions due" view** (a lightweight operational list; lives in the `/staff` + `/clinic` surfaces).
- **Changed — Calendar/Schedule:** plan-session appointments show "Service (Session n/N)".
- **Changed — Patient app:** mount `PatientPlanCard` (replaces the C1.1 "coming soon" placeholder).
- **Changed — Checkout/consult plan panels:** show per-session status incl. no-show + a reschedule action + session note (reuses the shared plan module).

## Risks
- **Specialty creep** — the top risk. Mitigation: no per-specialty fields; a session is generic (status + note). Any specialty charting is explicitly Phase 5.
- **Attendance edge cases** (a completed session later cancelled) — mitigation: only `planned`/booked sessions react to no-show/cancel; a `completed` session (already charged) is immutable (never un-charges — consistent with the immutable-paid-invoice principle).
- **Due-list performance** — one clinic-scoped aggregation; index-backed by existing `Treatment_Plan_Sessions(plan_id)` + `(appointment_id)`.
- **Parity** — the plan module is already shared; C2 changes flow to both surfaces by construction.

## Demo Story
> A patient is mid-course on a **10-session physio plan**. The schedule shows **"Physio (Session 4/10)"** on today's booking. The patient **no-shows** → the session returns to *needs re-book* and appears on reception's **Sessions due** list → reception re-books it → progress stays truthful (still 3/10 attended). The patient's app now shows their plan card with **3 of 10 complete**.

## Operational question (per the PO framing)
**C2 answers: "Who needs attention today?"** (C1 answered "what treatment is this patient prescribed?").

## PO Amendments (approved — incorporated into the build)
1. **Rename** the reception view **"Sessions Due" → "Treatment Follow-ups"** (clinical context + operational task).
2. **Explicit session lifecycle:** `Planned → Booked (= planned + appointment) → Completed`; alternate `Booked → No-show/Cancelled → Needs Re-book → Booked`. **`needs_rebook` is a distinct business state** (a stored status, not just "planned again") so the follow-up queue is meaningful.
3. **Treatment Follow-ups = an operational command center, not a table:** counters — **Due Today · Overdue · Booked · Completed · Needs Re-book** — over the worklist.
4. **Session notes ownership (Principle 6):** two fields — **`clinical_note` (doctor)** and **`operational_note` (reception)** — never mixed.
5. **Calendar** shows "Physio (Session 4/10)"; the design **allows future status color-coding** (Completed/Today/Missed/Re-book) — not built now, but structured for it.
6. **Progress is ATTENDANCE-based, never booking-based:** 10 planned · 8 booked · 3 attended → **3/10**, never 8/10. Explicit rule.
7. **KPIs (success metrics):** no-show recovery rate · average days between sessions · re-book success rate · plan completion rate · overdue sessions.
8. **Demo — add the Doctor Extension scenario:** 8 complete → doctor adds 2 → reception sees 10 total → progress 8/10 (continuity C1↔C2).
9. **QA — multi-receptionist concurrency:** two receptionists booking the same session → **no duplicate booking** (atomic optimistic guard: `updateMany where appointment_id IS NULL`; the loser is told to pick the next).
10. **Architecture rule (added):** *"Procedure Management remains specialty-agnostic. Specialty-specific documentation (dental charts, physiotherapy assessments, speech-therapy milestones) will extend the session model through specialty modules rather than modifying the core `TreatmentPlanSession`."*

**Schema delta (revised):** `TreatmentPlanSession` gains `clinical_note String?`, `operational_note String?`, and the `needs_rebook` status (no new column for status — same field). Additive migration.

---
**Approved — proceeding to full C2 implementation under Process v3.0.** Deliverables at completion: Completion Report · Demo · QA · Known Limitations · "What's New in C2" · Milestone Summary Card · Release Dashboard update · STOP for review.
