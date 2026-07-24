# C1 — Treatment Planning — Delivery Package
> Process v3.0 · Steps 3–6. **Milestone complete — STOP for Product Office testing & approval.**

## Milestone Summary Card
| Category | Delivered |
|---|---|
| Backend | ✅ Treatment Plan engine (create/lifecycle/sessions/extend/charge) |
| Frontend | ✅ Consult create (both surfaces), Checkout panel, plan document |
| Database | ✅ `TreatmentPlan`, `TreatmentPlanSession` (additive) |
| APIs | ✅ `/api/clinic/treatment-plans` |
| Documents | ✅ `treatment_plan` document type (print/PDF) |
| Tests | ✅ +4 (incl. financial integrity); suite **611/611** |
| Demo | ✅ Ready |
| QA | ✅ Package below |
| Customer Promise | ✅ *"Never lose a follow-up treatment again."* |

---

## 1. Engineering Completion Report
**Backend**
- `domain/treatment-plan.ts` — plan lifecycle (`draft→active→completed→archived` + `cancelled`) + session lifecycle (`planned/completed/cancelled`), pure transitions.
- `treatment-plan-service.ts` — `createPlan` (draft + N planned sessions), `activatePlan`, `updatePlanClinical`, `extendPlan`, `completePlan` (explicit), `archivePlan`, `cancelPlan`, `bookNextSession` (→ `scheduleAppointment`), `cancelSession`, reads (`getPlan`/`getPatientPlans`/`getActivePlansForPatient`), `generatePlanDocument`.
- `billing-engine-service.ts` — **refactor**: extracted `settleAllForAppointment`; added `capturePlanSessionCharge` (seeds the plan's service as the session charge on completion, marks the session completed).
- `appointment-service.ts` — completion hook: a plan-session visit charges the plan service via `settleAllForAppointment` (no consult fee); a normal visit unchanged.
- `consultation-service.ts` — context now returns `patient_id`/`doctor_id` (for in-consult plan creation).
- `document-service`/domain — `treatment_plan` type + renderer body.

**Frontend**
- `components/shared/treatment-plan/treatment-plan.tsx` — `TreatmentPlanCreate` (consult), `TreatmentPlanPanel` (checkout: progress bar + Book next + View/print), `PatientPlanCard` (ready), `PlanSection`.
- Mounted: `/clinic` + `/doctor` consult surfaces (create, parity by construction), Checkout Workspace side rail (panel, both surfaces).

**Database:** 2 additive tables + `Clinic.treatmentPlans` relation. **API:** `/api/clinic/treatment-plans` (GET plans; POST create/activate/update_clinical/extend/complete/archive/cancel/book_next/cancel_session/print). **Shared components:** the plan module; extends the Document renderer registry. **Tests added:** `treatment-plan-service.test.ts` (+4). **Architecture:** a plan is intent+sequence+progress over the existing revenue/scheduling/document engines — no new ledger. **Tech debt:** patient-app card + calendar session-label deferred (see §4).

---

## 2. Demo Package
**Demo Story (happy path):** Patient with knee pain → doctor diagnoses → **Treatment Plan** section → "ACL Rehab", service *Physio ₹800*, **8 sessions** → Create → at Checkout the plan shows **0/8** → **Book next** (pick a time) → Session 1 booked → **View** prints the Treatment Plan document.
**Extension path (architecture verified):** an 8-session plan, doctor **extends +4 → 12**, progress reads **N/12** — supported by `extendPlan`.

**Demo Checklist:** ☐ Login (`9876500001` → /clinic, or a doctor → /doctor) ☐ Start a consultation ☐ Diagnose ☐ **Treatment Plan → create** (service + sessions) ☐ Complete/Checkout ☐ **Treatment Plans panel → Book next** ☐ **View/print** the plan ☐ Attend a session (complete its visit) ☐ Verify progress advances (1/8) and exactly one charge appears.

**Screens changed:** Consultation (both surfaces), Checkout Workspace, Document Viewer/print.
**New UI:** Treatment Plan create section; Treatment Plans checkout panel (progress + Book next + View); Treatment Plan document.
**Updated UI:** Checkout side rail (replaced the "Recommendations" stub with the real panel).
**Expected behavior:** creating a plan makes N planned sessions (no charges); booking creates an appointment; **a session charges only when its visit completes** (the plan service, no consult fee).
**Backend capabilities added:** treatment-plan engine; plan-session→ServiceEvent charge linkage.
**Business value unlocked:** multi-visit revenue captured at the clinical decision; follow-ups no longer leak.

---

## 3. QA / Test Package
**Functional:** create plan · activate · book next session · attend (complete visit) → progress + one charge · extend plan · complete plan (explicit) · cancel session · print plan document.
**Negative:** blank title / 0 sessions / unknown service (rejected) · book on a draft plan (rejected) · book when no unbooked sessions remain (rejected — extend first) · complete/edit a closed plan (rejected).
**Regression:** normal consultation → completion still event-sourced (non-plan visit unchanged) · checkout charges/concession/payment · corrections · documents · billing-policy gate. (All green: 611/611.)
**Permissions:** clinical actions (create/activate/update/extend/complete/archive/cancel) require **doctor or owner** — reception is 403; session ops (book/cancel) allowed for reception.
**Financial Integrity (Amendment 9 — automated):** an 8-session plan with **3 attended → exactly 3 charges** (₹800 each), **0 consultation fees**, 5 sessions still planned, 3 invoices each with one plan-service line.
**Browser:** Chrome/Safari/Edge — the plan UI reuses existing primitives (Section/Input/Button/select, datetime-local); no new browser-specific APIs. **Mobile:** the panel + patient card are responsive (stack on small screens).
**Regression — "Doctor Leaves Clinic" (PO-requested, manual):** doctor A creates a plan → reception books sessions → doctor A unavailable → **another doctor / reception can VIEW the plan but cannot edit its clinical content** (403, Amendment 2) → the **owner** (super_admin, who passes `canAccessDoctorWorkspace`/`canAccessAdminPortal`) can edit/complete/extend it. Confirms clinical ownership survives a staffing change without data loss. *(Formal per-doctor ownership transfer is a future capability; today the owner is always able to act.)*

---

## 4. Known Limitations (honest)
- **Patient-app plan card** — the `PatientPlanCard` component is built and ready, but the patient-scoped endpoint + mount into `/patient` Records is **deferred** (a small follow-up). The patient still receives the **printed Treatment Plan document** (in the demo). Data model fully supports patient read.
- **Calendar session label** — plan-session appointments appear on the schedule but are **not yet labeled "Physio (Session 4/8)"** (Amendment 6) — a display enhancement in `clinic-schedule-service`, deferred.
- **Reschedule a booked session** — cancel + re-book is supported; a one-step reschedule is not yet surfaced.
- **A plan session that also needs a consult fee** — by design a plan session charges only the plan service; a clinic wanting both would add a clinical service during that visit.

---

## 5. What's New in C1
**For Doctors** — Create treatment plans during consultation; track session progress; extend or close a plan explicitly.
**For Reception** — See a patient's active plan at Checkout; book the next session in one click; print the plan. Reception never changes clinical content.
**For Patients** — Receive a printed Treatment Plan; (in-app progress card next).
**For Clinic Owners** — Multi-visit revenue is captured at the point of care; follow-ups stop leaking — better retention and multi-session revenue.

---
**STOP — awaiting Product Office testing & approval of C1 before beginning C2 (Procedure Management).** On approval, the Release Dashboard row for C1 flips to ✅ and C2 opens with its Engineering Readiness.
