# Epic 3 — Doctor Discovery & Scheduling

**Goal:** one **consistent filtering model** for "which doctor?" wherever that question is asked — patient discovery, reception assignment, and the calendar — so the same filters mean the same thing everywhere.
**Source audit:** [Doc 2](../product-office-audit/02-reception-workspace-deep-dive.md) §3, §7, [Doc 4](../product-office-audit/04-patient-workflow-deep-dive.md) §2 (Book), [Doc 5](../product-office-audit/05-search-and-filtering-audit.md) rows 1, 4, 12.

> **The core recommendation:** define **one doctor-filter vocabulary** — `{ specialty, clinic, availability, name }` — and reuse it in the patient Book search, the reception DoctorFilter, the doctor picker (Walk-in/Book dialogs), and the calendar. Today each surface filters doctors differently (or not at all).

---

## 3.1 — Consistent doctor-filter model

- **Business problem:** "Filter doctors" means different things per surface: patient Book = client text over name+specialty+clinic; reception board = all/one dropdown; calendar = shows all; picker modals = flat list. No shared model → inconsistent results and no specialty/availability filtering where it matters.
- **User story:** *As any user choosing a doctor, I want the same filters (specialty, clinic, availability, name) to behave identically wherever I pick a doctor.*
- **Current workflow:** Four different, mostly name-only doctor selectors (Doc 5).
- **Proposed workflow:** A canonical filter set — **specialty · clinic · availability (available today / next slot) · name** — defined once and applied across discovery, assignment, and calendar.
- **UX rationale:** Learn it once, use it everywhere; the right doctor is found the first time.
- **Business impact:** Medium/High — better booking conversion + correct-doctor-first-time (fewer reassignments and mis-books).
- **Engineering complexity:** **Medium** — a shared filter definition + doctor query that supports it (ties to 2.4).
- **Dependencies:** `/api/doctors` filtering (overlaps 2.4); specialty is already on `StaffProfile`.
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - One documented filter vocabulary exists and is reused on ≥3 doctor-selection surfaces.
  - Specialty and clinic filters return consistent results across surfaces.
  - The model is extensible (add "language", "gender-preference" later without a redesign).

---

## 3.2 — Availability-aware doctor discovery

- **Business problem:** Patients pick a doctor with **no sense of when they're free.** Discovery shows doctors but not their next available slot, so patients book blind and bounce off full calendars.
- **User story:** *As a patient, I want to see each doctor's next available slot (and filter by "available today") so I can book the soonest suitable doctor.*
- **Current workflow:** Doctor cards show name/specialty/clinic/rating — no availability signal.
- **Proposed workflow:** Show **"Next available: {day/time}"** on doctor cards and allow an **"Available today"** filter, using the existing `GET /api/doctors/next-slots` / `/doctors/[id]/slots`.
- **UX rationale:** Turns discovery into a decision ("this doctor can see me at 4:30"), not a guess.
- **Business impact:** High — fills sooner slots, raises conversion, reduces abandoned bookings.
- **Engineering complexity:** **Medium** — surface next-slot data on cards; add the filter.
- **Dependencies:** `/api/doctors/next-slots`, `/doctors/[id]/slots` (both exist).
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - Doctor cards display the next available slot.
  - An "Available today" filter narrows to doctors with open slots today.
  - Booking flows from the shown slot without re-querying from scratch.

---

## 3.3 — Unified doctor picker component

- **Business problem:** The Walk-in modal, the Book dialog, and the calendar each present doctors differently; reception can't filter by specialty when assigning.
- **User story:** *As a receptionist, I want the same doctor picker (with specialty/availability filters) whether I'm registering a walk-in, booking, or reading the calendar.*
- **Current workflow:** Separate flat doctor lists per modal; the board DoctorFilter is view-only.
- **Proposed workflow:** One **`DoctorPicker`** component (built on 3.1's model) reused in Walk-in, Book, calendar column headers, and the board filter.
- **UX rationale:** Consistency + speed; the same muscle memory everywhere a doctor is chosen.
- **Business impact:** Medium — faster, more accurate assignment; less reception hesitation.
- **Engineering complexity:** **Medium** — extract/reuse a shared component.
- **Dependencies:** 3.1 (filter model), `DoctorOption` type (exists).
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - One picker component is used in Walk-in, Book, and calendar.
  - It supports the 3.1 filters.
  - Selecting a doctor sets `doctor_id` consistently across flows.

---

## 3.4 — Reception doctor assignment & reassignment

- **Business problem:** Doctor is **fixed at appointment creation** — there is **no way to reassign** a waiting patient to another doctor (a doctor runs late, a walk-in fits another doctor better). The board's DoctorFilter is a *view* filter, not an action.
- **User story:** *As a receptionist, I want to move a waiting patient to a different doctor's queue when it keeps the room moving.*
- **Current workflow:** No reassignment; reception would cancel + rebook.
- **Proposed workflow:** A **"Reassign doctor"** action on a waiting card (using the 3.3 picker) that updates `doctor_id` — no status change, an audit event written.
- **UX rationale:** Reality-fit: patients get shuffled between doctors constantly in a busy OPD.
- **Business impact:** Medium/High — throughput and patient-wait improvement under load.
- **Engineering complexity:** **Medium** — a `doctor_id` update on a waiting appointment + event (respect the status machine; this is a field update, not a transition). *Confirm with Product Office it's not a rule change.*
- **Dependencies:** 3.3 picker; appointment update endpoint; audit event.
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - A waiting/scheduled patient can be reassigned to another doctor before consultation starts.
  - Reassignment is blocked once `in_consultation` (or later).
  - An audit event records who reassigned and from/to whom.
  - Both doctors' queues/strips update immediately.

---

## Epic 3 summary

| ID | Improvement | Complexity | Priority |
|---|---|---|---|
| 3.1 | Consistent doctor-filter model | M | **P1** |
| 3.2 | Availability-aware discovery | M | **P1** |
| 3.3 | Unified doctor picker | M | **P1** |
| 3.4 | Reception reassignment | M | **P1** |

**The centerpiece:** 3.1 — one filter vocabulary — makes 3.2/3.3/3.4 coherent instead of four one-off features. Build 3.1 first.
