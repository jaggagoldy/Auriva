# C1 — Treatment Planning — Engineering Readiness

> **Process v3.0 · Step 1.** Concise readiness for Product-Office approval. **No code until approved.**
> **Customer Promise:** *"Never lose a follow-up treatment again."* · Roadmap: Phase 3 · Milestone C1 · 2 sprints.

## Scope (IN)
The whole C1 milestone (both sprints), delivered before the next gate:
- **Doctor creates a Treatment Plan during consultation** — pick a service (e.g. "Physio session ₹800"), set N sessions. A plan is a **sequence of sessions against one catalog service**, with progress.
- **Reception sees the active plan at Checkout** and can **Book the next session** (reuses existing scheduling).
- **Progress tracking** — a session completes when its booked visit completes and its service is captured (as a `ServiceEvent`, charged by the existing engine). "3 of 8" is derived.
- **Patient sees their plan** (read-only) in the patient app Records.
- **Plan as a Document** — a simple "Treatment Plan" document type (printable via the B3 platform).

## Out of scope (deferred)
- Packages as a **prepaid financial product** (buy 10, use over time) → Phase 4.
- Auto-scheduling / recurring-appointment generation → C1 books **one next session at a time** (manual).
- Specialty-specific procedure tracking (dental charting, physio ROM) → **C2**.
- Cross-clinic plans; plan editing after sessions are completed (append/cancel only, never rewrite history).

## Architecture
A plan is **not a new ledger** — it orchestrates existing primitives. Each performed session flows through the proven path: `ServiceEvent → InvoiceLine → Invoice → Payment`. The plan layer only adds *intent + sequence + progress*; money stays in the revenue engine, scheduling stays in `appointment-service`, printing stays in the Document Platform. Mirrors how B1 added capture without a new billing path.

```
Consultation → create TreatmentPlan (service + N sessions, all "planned")
     │
     ▼
Checkout → "Active Plan: Physio · 0/8" → Book next session → scheduleAppointment (links session→appointment)
     │
     ▼
Session visit completes → the session's service is captured as a ServiceEvent (existing engine) → session "completed"
     │
     ▼
Progress derived (completed/planned) · Patient sees plan · Plan printable as a Document
```

## Database (additive migration)
- **`TreatmentPlan`**: id, clinic_id, patient_id, doctor_id, origin_appointment_id, title, service_id (priced/named from the catalog), sessions_planned, status (`active|completed|archived`), created_by_user_id, created_at.
- **`TreatmentPlanSession`**: id, plan_id, sequence (1..N), status (`planned|completed|cancelled`), appointment_id? (when booked), service_event_id? (when performed), created_at.
- Reverse relations on Clinic/Patient/Appointment (cascade for cleanup). No changes to existing tables.

## Backend
- **`treatment-plan-service.ts`**: `createPlan` (plan + N planned sessions), `getPatientPlans` / `getActivePlanForVisit`, `bookNextSession` (→ `scheduleAppointment`, links session), `completeSession` (marks completed + links the ServiceEvent), `cancelSession`, `archivePlan`. Guards: plan/session belong to clinic; sessions_planned ≥ 1; can't rewrite a completed session.
- **Session→charge linkage**: when a plan-linked visit completes, capture the plan's service as the session's `ServiceEvent` (reuses `service-capture` + settlement) — exactly one charge per session, no double-billing.
- **API**: `/api/clinic/treatment-plans` (GET by patient/visit · POST create/book/complete/cancel/archive). Patient-scoped read via the existing patient records endpoint.
- **Document**: add a `treatment_plan` type + assembler to the B3 registry (no engine change).
- **Permissions**: doctor creates plans; reception (+owner) books/completes sessions; patient read-only own.

## Frontend
- **New — Treatment Plan section** in the *shared* Consultation surface (next to Clinical Services) → appears on both `/clinic` and `/doctor` by construction (the B1b pattern). Create a plan (service picker + session count); shows planned sessions.
- **Changed — Checkout Workspace**: an **Active Plan panel** (progress + "Book next session") in the side rail.
- **Changed — Schedule/Calendar**: a "plan session" badge on plan-linked appointments.
- **Changed — Patient app (Records)**: read-only plan card with progress.
- **Shared component**: `TreatmentPlanPanel` (reused in consult + checkout + patient view).

## Risks
- **Scope creep → generic project management.** Mitigation: a Plan is strictly a sequence of sessions against one service; no free-form tasks/Kanban.
- **Session↔ServiceEvent double-charge.** Mitigation: session completion creates exactly one ServiceEvent; capture UI hides the plan's service from ad-hoc add when a session is active.
- **Specialty hardcoding (pre-empting C2).** Mitigation: generic `sessions_planned/completed`, no per-specialty fields.
- **Parity drift across the two consult surfaces.** Mitigation: one shared `TreatmentPlanPanel`, same as B1b.
- **Perf/complexity low** — small clinic-scoped tables; progress derived, not stored redundantly.

## Demo Story
> Patient with knee pain → doctor diagnoses → **creates an 8-session Physio Plan** → reception opens Checkout, sees the plan → **books Session 1** before the patient leaves → patient's app shows the plan (0/8) → the plan prints as a Treatment Plan document.

## PO Amendments (approved — incorporated into the build)
1. **Status lifecycle:** `draft → active → completed → archived` + `cancelled` (abandoned clinical decision, distinct from archived). Plans may be created as **draft** (patient thinking it over) and activated later.
2. **Ownership (Principle 6 extended):** the **doctor owns clinical content** — service, session count, clinical notes. **Reception cannot change those**; reception may only book/cancel-booking/reschedule sessions + attendance-through-workflow.
3. **Completion is explicit, not automatic:** reaching 8/8 does **not** auto-complete — the doctor explicitly closes the plan (or **extends** it). Enables extend-another-N / repeat / next-phase.
4. **Reserve `parent_plan_id`** (nullable) now — no UI/logic — so multi-phase plans (Phase 1 → Phase 2 → Maintenance) need no future migration.
5. **Checkout panel:** show plan · service · `3/8 complete` · next session date · **[Book Next] [View Plan]** — reception understands the treatment without leaving Checkout.
6. **Calendar:** plan appointments render **"Physio (Session 4/8)"**, not a bare "Plan" badge.
7. **Patient view:** Treatment Plan · N sessions · progress · upcoming session · completed sessions · doctor.
8. **Demo — add the Extension Path:** 8 sessions → completed → doctor extends → 12 → progress 8/12 (verifies the architecture supports extension even if lightly surfaced).
9. **QA — Financial Integrity (critical):** a plan with 8 sessions where the patient attends 3 produces **exactly 3 charges**, never 8. Each session charges only when its visit completes.
10. **"What's New" template:** For Doctors / Reception / Patients / Clinic Owners.

**Naming:** keep **"Treatment Plan"** for Release 1.x (clearer); revisit "Care Plan" later as scope broadens (nutrition/counseling/chronic care) — note only, no change now.

**Design note on charging (satisfies Amendment 9):** a plan session's charge is the plan's **service**, seeded as a `ServiceEvent` **only when that session's appointment completes** — so unattended sessions never charge. To avoid a double-charge with the consultation-fee seed, `completeVisitInvoicing` is refactored into `ensureConsultation + settleAllForAppointment`; a plan-session completion captures the plan service then calls `settleAllForAppointment` directly (the plan service is the charge, no separate consultation fee).

---
**Approved — proceeding to full C1 implementation under Process v3.0.** Deliverables at completion: Engineering Completion Report · Demo Package · QA Package · Known Limitations · "What's New in C1" · Milestone Summary Card · Release Dashboard update · STOP for review.
