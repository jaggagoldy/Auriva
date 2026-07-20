# Operational Excellence — Milestone 2 Changelog

**Milestone:** Phase 1 · Operational Excellence · **Milestone 2** (Epic 3 + Epic 4)
**Status:** ✅ Implemented (Wave A + Wave B) · ✅ Product Office approved · ✅ Data/logic QA · ✅ Human UI QA passed
**Commits:** Wave A `31e81ba` · Wave B `7805d7d` · QA fixes `64f2b3e`
**Guardrail held:** reuse existing APIs/components; **no new/duplicate APIs**, **no schema/migration**, **no status-machine change**. One additive `doctor_id` branch on `PATCH /api/reception/status`.

---

## Wave A — Doctor Discovery & Scheduling foundation (Epic 3)

### 3.1 Consistent doctor-filter model
One shared vocabulary — **`query · specialty · availableToday`** — as pure helpers (`src/shared/doctor-directory.ts`) reused by every "which doctor?" surface. Now "Available today" means the same thing in reception, booking, and (future) calendar/analytics.

### 3.3 Unified Doctor Picker
```
BEFORE                          AFTER (src/components/shared/doctor-picker.tsx)
[ Doctor ▾ ]  flat list          Search → Specialty → Available today →
                                  ┌ Dr Ananya Iyer · Cardiologist ┐
                                  │              3 waiting · Next 12:30 │
                                  └───────────────────────────────────┘
```
Replaces the flat dropdown in **walk-in + booking**. Each row shows **queue load + next available slot** (Product Office req #2) so reception never assigns blind. Scales from 2 → 20+ doctors.

### 3.2 Availability-aware patient discovery
`/patient/book` gained **specialty** + **Available-today** filters and a **"Next available"** line on each doctor card — reusing `/api/doctors/next-slots` (no new engine).

**Reused, not built:** `/api/doctors` (specialty/clinic), `/api/doctors/next-slots`, `/api/reception/dashboard`.

---

## Wave B — Reception Excellence (Epic 4) + Reassignment (Epic 3)

### 4.1 Patient Quick Peek
```
Eye icon → popover (all at once — no drawer, tabs, or scroll):
  ┌ Sneha Kulkarni            AUR-NYPKN4  ┐
  │ [New] [No known allergies]            │
  │ Outstanding: None   Last visit: First │
  │ Phone: +91…         Doctor: Dr Ananya │
  │           [ Open full record ]        │
  └───────────────────────────────────────┘
```
Answers the receptionist's most common questions **immediately** (Product Office req #3): New/Returning · Allergy · Outstanding · Last visit · Phone · Doctor · Health ID. Reads the enriched queue payload (extended with `health_id`, phone, `last_visit_at`).

### 4.2 Reschedule (from the board)
Card **⋯ → Reschedule**: change **date/time only**; the **doctor, reason, and type are preserved** (decision C — reuses the existing guarded `PATCH /api/appointments/[id]` scheduled_time path, not a new engine).

### 4.3 Walk-in speed
Single-doctor clinics **auto-select the doctor**; the cursor is **already in patient search**; **Enter submits** — keyboard-first (Product Office req #4). Reception barely touches the mouse.

### 3.4 Doctor Reassignment
Card **⋯ → Reassign doctor** (reuses the Wave A DoctorPicker):
- A **field update**, not a status transition — the status machine is untouched.
- **Guarded** to before the consult begins (decision F): blocked at `in_consultation`/`completed`/`cancelled`/`no_show`.
- Writes a **full audit event** (`doctor_reassigned` · from → to doctor · who · when — Product Office req #1).
- The patient **moves A→B queues live** (board reload; no page refresh). Gets a fresh queue number for the new doctor.

### Post-QA fixes (`64f2b3e`)
- Reassign/Reschedule menu items no longer also open the drawer (stopPropagation).
- Quick Peek is `fixed`-positioned + viewport-clamped — never clipped by the column overflow.
- Reassign dialog clarifies it keeps the time (use Reschedule to change it).
- **Doctor Workbench focus mode:** the queue rail and clinical snapshot each collapse/expand so the doctor can concentrate on the consultation.

---

## Business benefit

| Change | Effort/º the clinic gains |
|---|---|
| Doctor Picker (load + slot) | Reception assigns to the **right, free** doctor first time; scales to big clinics |
| Availability discovery | Patients book the **soonest** suitable doctor → higher conversion, filled slots |
| Quick Peek | ~80% of "who is this?" answered **without opening anything** |
| Reschedule on board | The most common change is **one action**, not a multi-step flow |
| Walk-in speed | Walk-up capture stays **keyboard-first, <20s** |
| Reassignment + audit | Keeps the room moving under load, **with accountability** |
| Workbench focus mode | The doctor sees **only what they need** during a consult |

---

## Engineering summary

- **New shared components:** `doctor-picker`, `patient-quick-peek`, `reschedule-dialog`, `doctor-directory` helpers + `use-doctor-directory` hooks (all with doc comments + reusable props; no Storybook in repo). `formatINR` centralized in `shared/queue`.
- **APIs:** additive `doctor_id` on `PATCH /api/reception/status` → `reassignDoctor()`. Reception queue payload extended (`health_id`, phone, `last_visit_at`). **No new endpoints. No DB changes.**
- **Verification:** tsc clean · **0 net new lint** (new files 0; only queue-card's 2 long-standing baseline) · full suite **522/522** · `next build` clean · Wave A 7/7 + Wave B 9/9 data QA · human UI QA passed.

## Known limitations (deliberate)
- Reassignment is doctor-only (time via Reschedule) — a clean separation.
- Doctor-card **rating + fee** (then languages/gender) is **backlog** — before Phase 1 ends, not this milestone.
- `/patient/find-care` remains (legacy) — a cleanup ticket, not mixed into this work.
- Notification-dependent items (reminders, receipts) remain **platform-blocked** (TD-04).
