# C2 — Procedure Management — Delivery Package
> Process v3.0 · Steps 3–6. **Milestone complete — STOP for Product Office testing & approval.**

## Milestone Summary Card
| Category | Delivered |
|---|---|
| Backend | ✅ Attendance handling · Treatment Follow-ups aggregation · atomic booking · notes · reschedule |
| Frontend | ✅ Treatment Follow-ups command centre · patient plan card · calendar session label |
| Database | ✅ `TreatmentPlanSession.clinical_note`, `operational_note` + `needs_rebook` status (additive) |
| APIs | ✅ `/api/clinic/treatment-plans` (followups/reschedule/set_note) · `/api/patient/treatment-plans` |
| Tests | ✅ +6 (incl. concurrency + attendance); suite **617/617** |
| Operational question | ✅ *"Who needs attention today?"* |
| Customer Promise | ✅ *"Track every therapy and procedure effortlessly."* |

---

## 1. Engineering Completion Report
**Backend**
- `domain/treatment-plan.ts` — `needs_rebook` session status; `isSessionBookable` (planned ∪ needs_rebook).
- `billing-engine-service.ts` — `reflectSessionAttendance` (a no-show/cancelled booked session → `needs_rebook`, appointment cleared; a completed/charged session is immutable). Lives here to avoid the appointment↔plan import cycle.
- `appointment-service.ts` — status hook: on `no_show`/`cancelled`, reflect the session.
- `treatment-plan-service.ts` — **atomic `bookNextSession`** (guarded `updateMany WHERE appointment_id IS NULL`; loser's appointment is cleaned up → no double-book), `rescheduleSession`, `setSessionNote` (clinical/operational), `getTreatmentFollowups` (counters + worklist), `getPlansForPatientApp`. Progress is **attendance-based** (`completed/planned`).
- `clinic-schedule-service.ts` — annotates plan-session appointments with `plan_label` "Title (Session n/N)".

**Frontend**
- `treatment-plan.tsx` — `TreatmentFollowups` (command centre: Due Today · Overdue · Needs Re-book · Booked · Completed counters + worklist with inline book), `PatientPlans` (patient-app read wrapper). Checkout panel now shows "N sessions" + next-session date (C1.1).
- Mounted: **"Follow-ups" nav view on `/clinic`** (owner/managing/reception); **patient plan card** replaces the C1.1 placeholder; **calendar label** on `ClinicCalendar`.

**Database:** 2 additive columns + the `needs_rebook` value. **API:** followups GET, reschedule_session/set_note POST, patient GET. **Shared components:** the plan module (extended). **Tests added:** `treatment-plan-c2.test.ts` (+6). **Architecture:** pure reuse of C1's model; **specialty-agnostic** (per the added architecture rule). **Tech debt:** session notes/reschedule UI surfaced in Follow-ups is light (backend complete); `/staff` Follow-ups nav not added (component is shared, ready) — see §4.

---

## 2. Demo Package
**Demo Story (happy):** A patient is mid-course on a **10-session physio plan**. The calendar shows **"ACL Rehab (Session 4/10)"** on today's booking → the patient **no-shows** → the session returns to **needs re-book** and appears on **Follow-ups** → reception re-books it → progress stays truthful (**3/10** attended) → the patient's app shows their plan card at **3 of 10**.
**Extension Path (continuity C1↔C2):** 8 complete → doctor **extends +2** → reception sees **10 total** → progress **8/10**.

**Demo Checklist:** ☐ Login (`9876500001` → /clinic) ☐ **Follow-ups** view → see counters ☐ open a patient with an active plan at Checkout → **Book next** ☐ Calendar → see **"(Session n/N)"** ☐ mark a session **no-show** → it appears in **Needs re-book** ☐ re-book from Follow-ups ☐ patient app → plan card shows progress.

**Screens changed:** `/clinic` (new Follow-ups view), Calendar (labels), Checkout panel, Patient home (real card).
**New UI:** Treatment Follow-ups command centre (counters + worklist).
**Updated UI:** calendar appointment label; patient card (replaced placeholder).
**Expected behavior:** progress counts **attendance only**; a missed session is never lost (→ needs re-book); two receptionists can't double-book the same session.
**Backend capabilities added:** attendance reflection, follow-ups aggregation, atomic booking, session notes, reschedule, patient read.
**Business value unlocked:** reception has a daily "who needs attention" worklist → less multi-session drop-off, higher plan completion.

---

## 3. QA / Test Package
**Functional:** book next · re-book a missed session · reschedule · set clinical + operational notes · calendar label · Follow-ups counters + worklist · patient card.
**Negative:** book a draft plan (rejected) · book when none unbooked (rejected — extend first) · reschedule an unbooked session (rejected).
**Concurrency (Amendment 9, automated):** two simultaneous `book_next` on a one-session plan → **exactly one succeeds**, no orphan appointment.
**Attendance (automated):** no-show/cancel → `needs_rebook`, appointment cleared, **attendance unchanged**; a needs_rebook session is re-bookable.
**Permissions:** clinical note → doctor/owner only (reception 403); operational note + booking/reschedule → reception. Clinical plan actions (create/extend/complete/…) → doctor/owner (from C1).
**Progress rule (automated):** 10 planned · booked · 3 attended → **3/10**, never booked-based.
**Regression:** normal consultation completion (non-plan) unchanged; checkout/documents/corrections/billing-policy green (617/617).
**Browser:** Chrome/Safari/Edge — reuses existing primitives (datetime-local, Button/Input); **mobile:** counters grid + worklist stack.

---

## 4. Known Limitations (honest)
- **`/staff` Follow-ups nav** not wired — the `TreatmentFollowups` component is shared and ready; only the `/clinic` nav mounts it this milestone (reception on `/clinic` has it). A one-line `/staff` mount is a small follow-up.
- **Session notes & reschedule UI** are surfaced through the plan/checkout panels lightly; a dedicated session-detail editor is deferred (backend complete + tested).
- **Calendar status colour-coding** (Completed/Today/Missed) — the label is structured for it (Amendment 5) but colours are not applied yet.
- **Formal per-doctor ownership transfer** — the owner can always act (C1 "Doctor Leaves Clinic" scenario); a dedicated transfer flow is future.

---

## 5. What's New in C2
**For Doctors** — add clinical session notes; extend a course; a missed session is tracked, not lost.
**For Reception** — a **Treatment Follow-ups** worklist ("who needs attention today?"): due today, overdue, needs re-book — book/re-book in one place; calendar shows the session number.
**For Patients** — see your treatment plan and progress in the app.
**For Clinic Owners** — fewer multi-session drop-offs; truthful attendance-based progress; better course-completion revenue.

---
**STOP — awaiting Product Office testing & approval of C2 before beginning C3 (Clinical Timeline).**
