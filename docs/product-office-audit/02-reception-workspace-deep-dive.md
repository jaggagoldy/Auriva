# Document 2 — Reception Workspace Deep Dive

**Type:** Current-state audit of the Reception (`/staff`) workspace. **No proposed solutions.**
**Surface:** shared by **Receptionist** and **Technician** (capability-gated). Landing = the Front-desk board.
**Verified against:** `staff-shell.tsx`, `queue-board.tsx`, `queue-column.tsx`, `queue-card.tsx`, `reception-calendar.tsx`, `billing-board.tsx`, `walkin-modal.tsx`, `book-appointment-dialog.tsx`, `lab-worklist.tsx`, `reception-dashboard.tsx`.

---

## 1. Navigation

```
Auriva  [S] Front desk · Receptionist ▾            🔔  (avatar)  ⎋
├─ Front desk   → /staff/queue   (the board — LANDING; /staff redirects here)
├─ Calendar     → /staff/calendar
├─ Desk         → /staff/billing (renamed from "Billing")
└─ Lab Orders   → /staff/lab     (kept for the Technician who shares this surface)
```

- Top-left: **WorkspaceSwitcher** chip `[mark] Front desk · {role} ▾` → `/workspace`.
- Walk-in is a **button on the board**, not a nav item.
- The old `/staff/dashboard` (ReceptionDashboard) still exists by URL but is **unlinked**.

---

## 2. Front-desk board (`/staff/queue`) — the core

### Layout (regions)
```
┌ FRONT DESK · LIVE ─────────────────────────── [Search] [Doctor ▾] [⟳] [Book] [Walk-in] ┐
│ Today's flow — Check people in, move the queue, keep the room moving.                    │
├ awareness strip: "N patients waiting · Longest wait Nm · Dr X ~N min behind" (honey) ────┤
├ doctor strip: [avatar] Dr Name · In consultation/Available · specialty | N waiting ──────┤
├──────────────────── 3 LANES ─────────────────────────────────────────────────────────────┤
│  WAITING (N)          │  IN CONSULTATION (N)   │  DONE · TO COLLECT (N)                   │
│  ┌ card ──────────┐   │  ┌ card ───────────┐   │  ┌ card ───────────────┐                 │
│  │ Name  [Walk-in]│   │  │ Name            │   │  │ Name                │                 │
│  │ #q · time  27m │   │  │ 🩺 Dr           │   │  │ 🩺 Dr               │                 │
│  │ 🩺 Dr          │   │  │ [status chip]   │   │  │ [Completed]         │                 │
│  │ [Send in]      │   │  └─────────────────┘   │  │ [₹ Collect]         │                 │
│  └────────────────┘   │                        │  └─────────────────────┘                 │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### Features & actions
| Feature | Detail | API |
|---|---|---|
| 3-lane board | Waiting / In consultation / Done·to collect; existing statuses mapped in | `GET /api/reception/queue`, `/dashboard` |
| Wait-aging | ≥20m honey · ≥30m orange · ≥45m red left-border + minutes (visual only) | client-computed from `checked_in_at` |
| Doctor strip | Per-doctor: In consultation/Available + waiting count | client-derived |
| Awareness strip | Waiting count · longest wait · doctors ~N min behind (honey chip) | client-derived |
| Check in | Scheduled → `waiting` | `POST /api/reception/checkin` / `PATCH /api/reception/status` |
| Send in | Waiting → `doctor_ready` | `PATCH /api/reception/status` |
| Collect | Done card → opens `/staff/billing?patient=` | navigation |
| Reorder | Drag within Waiting lane → priority | `PATCH /api/reception/status` (priority) |
| Card menu | Notify Doctor / Mark No Show / Cancel | `PATCH /api/reception/status` |
| Details drawer | Info → AppointmentDrawer (full history, actions) | `GET /api/appointments/[id]` |
| Search | name / blood group | `?search=` param + client filter |
| Doctor filter | all / specific doctor | `?doctor_id=` |
| Book / Walk-in | Dialogs (see below) | — |

### States
- **Loading:** centered spinner (board), skeleton rows elsewhere.
- **Empty:** "Waiting room is clear — you're all caught up" + Register walk-in CTA.
- **Error:** ErrorState with Retry.
- Poll interval: 8s (visible tab only).

---

## 3. Calendar (`/staff/calendar`)

- **Doctor-column day view**: doctors as columns, 30-min slot rows (09:00–20:00), appointments placed in their slot (toned by status), empty cells show **"+ Free"**.
- Prev/next day + **Today** navigation.
- **"+ Free"** opens the Book dialog **pre-filled** with that doctor + time.
- **API:** `GET /api/reception/dashboard` (doctors), `GET /api/appointments?doctor_id=` per doctor, filtered client-side to the day.

**Limitations:** fixed 09:00–20:00 window (not per-clinic hours); no week/month view here; no drag-to-reschedule; N per-doctor fetches per day change.

---

## 4. Desk / Billing (`/staff/billing`)

- **"Cash desk — Collect & close."** Stat cards (collected today, open balance, invoices in view).
- Invoice list (number, patient, status badge, total, balance) with a **detail/pay** flow.
- **Filters:** Today · Open · Paid · All (Today→`?today=true`, Paid→`?status=paid`, Open→client filter draft/issued).
- **Collect:** payment method (UPI/Cash/Card) → `POST /api/billing/invoices/[id]/payments` → invoice `paid` + receipt.
- **Statuses:** draft / issued / paid / void (a non-standard status now falls back to draft — hardened after a crash).

**Limitations:** line items are minimal (consult fee); the Services/Treatments model isn't deeply wired into invoice building from the consult; no partial-payment UI depth surfaced; no refunds/adjustments flow documented.

---

## 5. Walk-in (`walkin-modal.tsx`)

- Fields: patient search (**phone / name / dob** → identity resolution), or create new (name, gender, dob, phone), reason, **doctor**.
- Resolves an existing Healthcare Profile or creates one, then creates an appointment into the queue.
- **API:** `GET /api/patients?phone=&name=&dob=` (resolve) → `POST /api/patients` (create) → `POST /api/reception/walkin`.

---

## 6. Patient search (reception)

| Where | Fields | Behaviour |
|---|---|---|
| Dashboard (unlinked) | name or phone | Enter → `/staff/queue?search=` |
| Board search | name / blood group | filters the current board |
| Walk-in modal | phone / name / dob | identity resolution (find or create) |
| Book dialog | phone / name | identity resolution |
| Command palette (⌘K, admin) | patients / jump | not on reception surface by default |

**Note:** the board search is **name/blood-group only** (not phone) and scoped to today's board; there is no global "find any patient across all time" search on the reception surface itself.

---

## 7. Doctor assignment

- Set **at appointment creation** (walk-in modal / book dialog choose the doctor).
- The board's **Doctor filter is a view filter**, not a reassignment control.
- **No reassign-to-another-doctor action** exists on the board or card.

---

## 8. Lab (`/staff/lab`)

- Org **worklist**: ordered tests to fulfil.
- **Filters:** Ordered · Resulted · All (`?status=`).
- Enter result values → `PATCH /api/lab-orders/[id]` → `resulted`.
- Primarily the **Technician's** tool (shares the reception surface).

---

## 9. Current limitations (observed)

| Area | Limitation |
|---|---|
| Patient search | Board search is name/blood-group + today-only; no global patient lookup on the surface |
| Doctor assignment | No reassignment after creation |
| Calendar | Fixed hours; day-only; no drag/reschedule; per-doctor N-fetch |
| Billing | Minimal line items; services not wired into consult→invoice; no refund/adjustment flow |
| Awareness | "Doctor behind" is informational only — no notify/capacity actions (deferred) |
| Reordering | Only within the Waiting lane |
| Dashboard | Legacy `/staff/dashboard` orphaned (unlinked) |

## 10. UX pain points (observed, not solutions)

- Reception cannot **find a returning patient's full history** from the board without going through Book/Walk-in identity resolution.
- **Rescheduling** a booked appointment isn't a first-class board action (must go through the drawer/book flow).
- The **calendar and the board are separate** — moving between "who's here now" and "who's coming" is a nav switch, not one view.
- **No capacity signal** — "waiting room at N / over capacity" is deferred, so overload is only implied by the awareness strip.
- Collect on a Done card routes to the Desk filtered by patient, but the **amount isn't shown on the card** (unlike the prototype's "Collect ₹500").

## 11. Missing capabilities (present in the mental model / prototype, absent in build)

- Capacity thresholds + room-free alerts (deferred, Category-C).
- Notify workflow (SMS/patient-while-waiting) — no notification delivery exists at all.
- Schedule editing / drag-drop / recurring / advanced planner.
- Room allocation / resource scheduling.
- Global patient directory search on the reception surface.
- Doctor reassignment / queue transfer between doctors.
