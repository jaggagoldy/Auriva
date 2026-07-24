# Epic 4 — Reception Workspace 2.0

**Goal:** cut the receptionist's effort per patient and speed up the room — the front desk is where operational friction is most expensive.
**Source audit:** [Doc 2](../product-office-audit/02-reception-workspace-deep-dive.md) (whole doc), [Doc 1](../product-office-audit/01-end-to-end-operational-workflow.md) §6.
**Guardrail:** reduce clicks-per-patient and context switches; no status-machine changes.

> Already on-card today: **Check in**, **Send in**, **Collect** (routes to Desk), reorder within Waiting. This epic closes the *remaining* effort gaps: quick-peek, reschedule/cancel, faster walk-in, one operational view, and richer card context.

---

## 4.1 — Patient quick-peek (mini record without leaving the board)

- **Business problem:** To see a patient's history, allergies, or past visits, reception opens a full drawer/record — a context switch during the busiest moment.
- **User story:** *As a receptionist, I want a quick glance at a patient's key info (allergies, last visit, balance, contact) from their card without leaving the board.*
- **Current workflow:** Info icon → AppointmentDrawer (full), or navigate away.
- **Proposed workflow:** A lightweight **hover/tap quick-peek popover** on the card: name, health-id, allergies, last visit, outstanding balance, phone — with a "Open full record" link.
- **UX rationale:** Answers 80% of "who is this?" questions in place; the board stays the home base.
- **Business impact:** Medium/High — fewer navigations, faster handling, safer (allergies visible).
- **Engineering complexity:** **Medium** — a popover fed by existing patient/appointment data.
- **Dependencies:** patient/appointment payload; 2.1 (record link).
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - A quick-peek shows key patient context from the card without navigation.
  - Includes allergies and outstanding balance when present.
  - "Open full record" deep-links to the timeline.
  - Keyboard-accessible; dismissible with Esc.

---

## 4.2 — Reschedule & cancel as first-class board actions

- **Business problem:** Rescheduling/cancelling a booked visit isn't a direct board action — reception goes through the drawer or a rebook flow.
- **User story:** *As a receptionist, I want to reschedule or cancel a patient right from their card so I handle changes in one step.*
- **Current workflow:** Card menu has Notify Doctor / No Show / Cancel; reschedule requires the drawer/Book dialog.
- **Proposed workflow:** Add **Reschedule** to the card menu (opens the Book dialog pre-filled with the patient + current appointment for a new slot); keep Cancel with a confirm.
- **UX rationale:** The most common change (reschedule) becomes a first-class, one-tap action.
- **Business impact:** Medium — faster change handling; fewer abandoned/again-called patients.
- **Engineering complexity:** **Medium** — reuse the Book dialog's reschedule mode (already exists for patients) on the reception card.
- **Dependencies:** BookAppointmentDialog reschedule mode (exists on patient side).
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - Reschedule is available from a waiting/scheduled card and moves the appointment to a new slot.
  - Cancel requires an explicit confirm (destructive-action rule).
  - Both write audit events; the board updates immediately.

---

## 4.3 — Walk-in speed

- **Business problem:** Walk-in registration, though minimal, still asks reception to search/enter fields under time pressure at the desk.
- **User story:** *As a receptionist, I want to register a walk-in in the fewest possible fields — reusing recent/known patients — so the queue keeps moving.*
- **Current workflow:** Walk-in modal → search (phone/name/dob) → find or create → reason → doctor.
- **Proposed workflow:** Faster identity: **recent-patients shortcut**, health-id entry (2.2), keyboard-first flow, sensible defaults (single-doctor clinic auto-selects the doctor). Fewer fields for the common case.
- **UX rationale:** The walk-in is the ≤20-second promise; every field removed is throughput gained.
- **Business impact:** Medium — captures walk-up revenue faster; less desk congestion.
- **Engineering complexity:** **Low/Medium** — UX refinements + reuse identity resolution.
- **Dependencies:** 2.2 (health-id), identity resolution (exists).
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - A known patient can be registered as a walk-in in ≤3 interactions.
  - Single-doctor clinics don't require a doctor selection.
  - Health-id and recent-patient shortcuts are available.

---

## 4.4 — Card context flags (returning / allergy / balance)

- **Business problem:** Cards show name, token, time, doctor, wait-aging — but not whether the patient is **returning**, has **allergies**, or owes a **balance**. Reception lacks at-a-glance context.
- **User story:** *As a receptionist, I want glanceable flags (returning, allergy, ₹ due) on cards so I handle each patient appropriately without opening anything.*
- **Current workflow:** No such flags on the board card (allergy shows only in the doctor's Workbench; balance only at the Desk).
- **Proposed workflow:** Subtle chips on the card: **Returning / New**, **⚠ Allergy** (if on file), **₹X due** (per [1.6](./epic-1-encounter-to-cash.md)).
- **UX rationale:** Context where the eye already is; safer and faster handling.
- **Business impact:** Medium — better service, revenue recovery, safety.
- **Engineering complexity:** **Low/Medium** — enrich the queue payload with returning/allergy/balance.
- **Dependencies:** patient profile (allergies), invoices (balance), appointment history (returning); overlaps 1.6.
- **Recommended priority:** **P0.**
- **Acceptance criteria:**
  - Cards show returning/new, allergy (if present), and balance (if owed).
  - Flags are colour + icon + label (never colour alone).
  - No flags when not applicable; no cross-tenant data.

---

## 4.5 — Unified operational view (board ↔ calendar)

- **Business problem:** "Who's here now" (board) and "who's coming" (calendar) are **separate screens** — reception nav-switches to answer one operational question.
- **User story:** *As a receptionist, I want to see the live room and today's upcoming schedule together so I can anticipate load without switching screens.*
- **Current workflow:** Front desk board and Calendar are distinct nav destinations.
- **Proposed workflow:** A combined operational view (e.g. board with an "upcoming today" rail, or a fast toggle) so now + next are one glance.
- **UX rationale:** One screen answers "what is the room doing, and what's about to hit it?"
- **Business impact:** Medium — proactive rather than reactive front-desk operation.
- **Engineering complexity:** **Medium/High** — layout + data composition; must not dilute the board's one-question clarity.
- **Dependencies:** board + calendar data (exist).
- **Recommended priority:** **P2.**
- **Acceptance criteria:**
  - Reception can see live queue and upcoming-today without a full nav switch.
  - The board's "what's the room doing?" clarity is preserved (no clutter).
  - Performance holds with a busy day's data.

---

## Epic 4 summary

| ID | Improvement | Complexity | Priority |
|---|---|---|---|
| 4.4 | Card context flags (returning/allergy/balance) | L/M | **P0** |
| 4.1 | Patient quick-peek | M | **P1** |
| 4.2 | Reschedule & cancel on the board | M | **P1** |
| 4.3 | Walk-in speed | L/M | **P1** |
| 4.5 | Unified operational view | M/H | **P2** |

**Effort-reduction thesis:** 4.4 + 4.1 remove the most frequent "open something to know something" moments; 4.2 + 4.3 remove the most frequent multi-step actions. Together they cut clicks-per-patient at the busiest desk in the clinic.
