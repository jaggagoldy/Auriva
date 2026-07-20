# Engineering Milestone 2 — Engineering Plan

**Status:** PLAN — awaiting Product Office / Architecture approval (Go/No-Go Gate 5). **No code written yet.**
**Scope (approved):** Epic 3 — Doctor Filter Model (3.1) · Availability (3.2) · Doctor Picker (3.3) · Reassignment (3.4). Epic 4 — Quick Peek (4.1) · Reschedule (4.2) · Walk-in Speed (4.3) · Reception improvements.
**Out of scope (later milestones):** payment-timing policy, service catalog, SOAP templates, structured clinical data, notifications, receipt delivery, unified board+calendar view (4.5 — see decision D).

---

## 1. Current implementation (verified)

| Area | Current state | Implication |
|---|---|---|
| **Doctor directory** | `GET /api/doctors` **already** filters by `specialty` + `clinic_id` (server-side). | 3.1/3.2 have backend support — mostly UI wiring. |
| **Availability** | `GET /api/doctors/next-slots?ids=` **already exists** (batch next-slot; "powers Available-today + Next-slot text"); `GET /api/doctors/[id]/slots` too. | 3.2 reuses these — no new slot engine. |
| **Patient discovery** | `/patient/book` is the **active** surface (bottom tab + Home) — client-side filter over `/api/doctors`. `/patient/find-care` appears **legacy/orphaned**. | Wire filters/availability into `/patient/book`. |
| **Doctor selection** | `DoctorFilter` + `DoctorOption {id, full_name, specialty}`; used in board filter, walk-in, book. Flat list, name/specialty only. | 3.3 unifies on one picker + the 3.1 model. |
| **Reassignment** | `PATCH /api/reception/status` accepts `{status}` or `{priority}` — **not `doctor_id`.** | 3.4 needs a doctor_id path (decision B). |
| **Reschedule** | The **patient** book dialog has a reschedule mode (`rescheduleAppointmentId` → PATCH). The **staff** book dialog only **creates** (POST). | 4.2 needs reschedule added to the staff flow (decision C). |
| **Walk-in** | `walkin-modal` — search phone/name/dob, create, doctor, reason. | 4.3 adds health-id + recent + defaults. |
| **Board card** | `queue-card` already carries enriched context (allergies, returning, balance from M1). | 4.1 quick-peek reuses this + last-visit. |

---

## 2. Plan by item

### Epic 3 — Doctor Discovery & Scheduling

**3.1 Consistent doctor-filter model** — define one vocabulary `{ specialty · clinic · availability · name }` (a shared type + helper). Reused by 3.2/3.3. *Files:* `src/shared/doctor-filter.ts` (new), consumers below. *API:* reuse `/api/doctors` (`specialty`, `clinic_id`).

**3.2 Availability-aware discovery** — show "Next available: …" on doctor cards + an "Available today" filter on `/patient/book`, using `/api/doctors/next-slots`. *Files:* `src/app/patient/book/page.tsx`, doctor cards. *API:* reuse `next-slots` — **no new API**.

**3.3 Unified doctor picker** — one `DoctorPicker` component (built on 3.1) reused in Walk-in, Book, calendar, board filter. *Files:* `src/components/shared/doctor-picker.tsx` (new), refactor `doctor-filter.tsx`, `walkin-modal`, `book-appointment-dialog`.

**3.4 Reception reassignment** — a "Reassign doctor" action on a waiting/scheduled card (uses 3.3 picker) that updates `doctor_id` + writes an event. *Files:* `queue-card.tsx`, `reception-service.ts` (new `reassignDoctor`), `api/reception/status` (decision B). **Not a status transition** — a field update with audit.

### Epic 4 — Reception 2.0

**4.1 Patient quick-peek** — hover/tap popover on a card: allergies, last visit, balance, phone + "Open full record". *Files:* `queue-card.tsx` (+ maybe a `patient-peek` popover), reuse enriched payload; may add `last_visit` to the queue enrichment. *API:* reuse.

**4.2 Reschedule & cancel on the board** — add **Reschedule** to the card menu (opens the staff book dialog in a new **reschedule mode** → PATCH `scheduled_time`); keep Cancel with confirm. *Files:* `staff/book-appointment-dialog.tsx` (add reschedule mode), `queue-card.tsx`. *API:* `PATCH /api/appointments/[id]` (exists).

**4.3 Walk-in speed** — health-id search (M1 pattern), recent-patients shortcut, single-doctor auto-select, fewer fields for the common case. *Files:* `walkin-modal.tsx`. *API:* reuse identity resolution.

---

## 3. Components affected
`shared/doctor-filter.ts` (new) · `shared/doctor-picker.tsx` (new) · `doctor-filter.tsx` · `walkin-modal.tsx` · `book-appointment-dialog.tsx` (staff) · `queue-card.tsx` · `queue-service.ts` (last-visit for peek) · `reception-service.ts` (reassign) · `api/reception/status` (or new reassign route) · `patient/book/page.tsx`.

## 4. New APIs
- **None ideal.** 3.1/3.2/4.2/4.3 reuse existing endpoints.
- **3.4 reassignment** needs a `doctor_id` update path — **decision B**: extend `PATCH /api/reception/status` to accept a `doctor_id`-only body (mirrors the existing `priority`-only path) **[recommended]**, or a small new `/api/reception/reassign` route.

## 5. Database changes
**None.** Reassignment updates an existing column (`Appointment.doctor_id`); availability/filters/quick-peek are reads. No migration.

## 6. Risks & decisions (please confirm before code)

| # | Decision | Recommendation |
|---|---|---|
| **A** | **Sequencing** — M2 is ~7 items. | Build in two waves: **Wave A (foundation):** 3.1 filter model → 3.3 picker → 3.2 availability. **Wave B (reception actions):** 4.1 quick-peek → 4.2 reschedule → 4.3 walk-in speed → 3.4 reassignment. Verify/gate after each wave. |
| **B** | **Reassignment endpoint** | **Extend `/api/reception/status`** with an optional `doctor_id` (priority-only precedent) — reuse, no new route. Confirm reassignment (pre-consultation `doctor_id` change + event) is **not** a status-machine change (it isn't). |
| **C** | **Reschedule mechanism** | Add a **reschedule mode to the staff book dialog** (PATCH `scheduled_time`), mirroring the patient dialog. No new endpoint. |
| **D** | **Unified board+calendar view (4.5)** | **Defer** — it's P2/Medium-High and risks diluting the board's one-question clarity. Recommend keeping M2 to 4.1/4.2/4.3 unless you want it in. |
| **E** | **Legacy `/patient/find-care`** | Appears orphaned (nav uses `/patient/book`). Leave untouched this milestone; flag for a later cleanup. |
| **F** | **Reassignment guard** | Allow reassignment only **before `in_consultation`** (waiting/scheduled/doctor_ready); block once the consult starts. |

## 7. Estimated effort

| Wave | Items | Complexity | Est. |
|---|---|---|---|
| **A** | 3.1 · 3.3 · 3.2 | Medium | ~3–4 days |
| **B** | 4.1 · 4.2 · 4.3 · 3.4 | Medium | ~4–5 days |
| **M2 total** | 7 items | **Medium** | **~1.5–2 weeks** |

## 8. Verification (per the five gates)
After each **wave**: `tsc` · lint (no new over baseline) · full vitest suite · `next build` · targeted data-QA script (like M1) for reassignment + availability + reschedule. **Stop on any regression.** Reseed demo after test runs. A changelog + KB fold at the end (Documentation Gate 4).

## 9. Out-of-scope confirmation
No changes to: the status machine, invoice/payment, service catalog, clinical data model, notifications. All additions additive; backward compatibility preserved.

---

**Awaiting your Go + confirmation on decisions A–F (especially B reassignment endpoint, C reschedule, D whether 4.5 is in) before Wave A.**
