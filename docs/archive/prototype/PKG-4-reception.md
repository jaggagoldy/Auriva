# Prototype Package 4 — Reception Experience

**Series:** UXS-043 Interactive Prototype · Package 4 of 6
**Covers:** Queue (Front-desk board) · Walk-in registration · Appointment (calendar/book) · Desk · Checkout
**Status:** ✅ **APPROVED & FROZEN — v1.0** (Product Office, 2026-07-14, scored 9.8/10) after two pre-freeze refinements: (1) **progressive queue aging** on waiting cards — ≥20m yellow · ≥30m orange · ≥45m red, visual-only, no alerts, so reception naturally prioritises; (2) **amount on every Collect button** (`Collect ₹500`) on the Desk as well as the board.
**Deferred (future epic, NOT MVP):** *Front Desk Intelligence* — auto queue-balancing · wait-time prediction · patient SMS while waiting · overbooking warnings · suggested reassignment · reception KPIs · queue heat map · no-show prediction · auto room allocation. Kept out to preserve operational simplicity.
**Foundation:** [design/mockups/auriva-ops.html](../../design/mockups/auriva-ops.html) (front-desk board, doctor strip, alerts) + [design/mockups/auriva-finance.html](../../design/mockups/auriva-finance.html) (collect/payment) + staff components (`queue-board`, `walkin-modal`, `reception-dashboard`). Warm Auriva system from Packages 1–3.

Prototype file: [pkg-4-reception.html](./pkg-4-reception.html)

> **The reception cash cycle** (checkout · collect · receipt) was flagged in the Pre-RC audit as the
> one genuinely-absent piece. Package 4 makes it real: a patient flows **arrive → queue → seen →
> collect → done** without a dead stop. The desk should feel like *keeping the room moving*, calm under
> load.

---

## 1. Storyboard

```
Register walk-in ─┐
Scheduled arrives ─┴─► Check in ──► WAITING lane ──► Send in ──► IN CONSULTATION ──► Done ──► DESK (to collect)
                                                                                              │
                                                                                       Checkout modal
                                                                                    (invoice · UPI/Cash/Card)
                                                                                              │
                                                                                        Collected ✓ · receipt
```

**Decisions encoded**
- The **board is the landing** — who's here, with which doctor, how long they've waited (front-desk answers "what's the room doing?").
- **Walk-in** is minimal (name · phone · age/sex · reason · doctor) — under 20 seconds.
- Moving a patient is **one action per stage** (Check in → Send in → Done → Collect).
- **Checkout** is the cash cycle: itemised invoice, one-tap payment method (UPI/Cash/Card), **Collect** → receipt; the visit leaves the desk.
- **Alerts + doctor strip** give the desk operational awareness (running late, room free, over capacity) without leaving the board.

---

## 2. Low-Fidelity Wireframes

**Queue (Front-desk board)**
```
┌ HSR Family Clinic · Front desk · Meera ───── [Register walk-in] ┐
│ ⚠ Dr Shah 20 min late   ⚠ Waiting room at 8   ✓ Room 2 free      │
│ [Dr Rao · in consult · 3 wait] [Dr Shah · late · 3] [Dr Iyer · free · 1]│
│ ┌ Waiting 4 ────┐ ┌ In consultation 1 ┐ ┌ Done · to collect 2 ┐  │
│ │ DN Deepa 35m  │ │ RK Rohan          │ │ AM Aarav  [Collect] │  │
│ │ [Send in]     │ │ [Mark done]       │ │ ₹500                │  │
│ └───────────────┘ └───────────────────┘ └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Walk-in modal / Appointment calendar / Checkout modal**
```
Walk-in                 Calendar (book)            Checkout
┌──────────────┐   ┌ 9:30 Aarav | free | free ┐   ┌ Collect · Aarav Mehta ─────┐
│ Name / Phone │   │ 10:00 Sunita| Kiran|Neha │   │ Consultation      ₹500      │
│ Age · Sex    │   │ + Free → Book modal      │   │ Total             ₹500      │
│ Reason       │   └──────────────────────────┘   │ [UPI][Cash][Card]           │
│ Doctor ▾     │                                   │ [Collect ₹500]              │
│ [Add to queue]│                                  └─────────────────────────────┘
└──────────────┘
```

---

## 3. Review Notes

| Screen | Why it exists | UXS-043 principle | Source |
|---|---|---|---|
| **Queue board** | The front desk's home: keep the room moving | State encoded in lanes/chips; always "what's next" | ops · Front desk |
| **Walk-in** | Register an arrival in seconds | ≤3 interactions; obvious primary | ops · Register walk-in |
| **Appointment** | Book a slot into a doctor's day | Free/booked visually distinct | ops · Calendar |
| **Desk** | Visits ready to bill | Money surfaced, never buried | finance · Invoices |
| **Checkout** | Collect payment, close the visit | One-tap method + Collect → receipt; never a dead end | finance · Collect/Settlement |

**Design-system fidelity:** warm tokens (cream/pine/honey), the admin icon-rail + topbar, board lanes,
doctor/alert strips, modal, toast — all from the approved vocabulary. Payment-method chips use semantic
neutrals; "collected" uses success. Full light/dark parity + the workspace-switcher pattern.

---

## 4. UX Validation Checklist

| # | Check | Result |
|---|---|---|
| 1 | One primary question per screen | ✅ Queue="what's the room doing"; Desk="who owes what" |
| 2 | Primary action obvious | ✅ Register walk-in (board); Collect (desk) |
| 3 | ≤3 interactions where practical | ✅ Walk-in=fields+Add; Checkout=method+Collect |
| 4 | Empty/loading/permission/error | ◑ empty lanes + "nothing to collect" + collected states; full matrix = Package 6 |
| 5 | Reuses components | ✅ ops + finance mockups + Packages 1–3 system |
| 6 | Design-system compliant | ✅ warm tokens |
| 7 | Light + dark | ✅ parity + toggle |
| 8 | Tablet/desktop | ✅ lanes stack <900px |
| 9 | Tenant isolation | ✅ single-clinic desk; scoped to reception's active workspace |
| 10 | No unavailable capabilities | ✅ reception scope (no clinical authoring); online payment noted as future |
| 11 | Avoids clicks / cognitive load | ✅ one action per stage; minimal walk-in |

**Gate result:** item 4 partial by design. All else pass → cleared for review.

---

## 5. What reviewers should look for
- **Front desk:** does the board keep the room moving with one action per stage? Is walk-in genuinely fast?
- **Business:** is the cash cycle (checkout → collect → receipt) trustworthy and complete?
- **Product Office:** reception scope only; the checkout closes the pre-RC cash-cycle gap.
- **Gemini UX:** lane legibility under load, payment-method clarity, five UX principles.
