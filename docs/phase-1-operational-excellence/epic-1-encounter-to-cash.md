# Epic 1 — Encounter-to-Cash Excellence

**Goal:** make sure every visit is billed and collected with the fewest possible steps — and let the clinic's *own* cash policy fit Auriva, not the other way round.
**Source audit:** [Doc 1](../product-office-audit/01-end-to-end-operational-workflow.md) §12–13, [Doc 2](../product-office-audit/02-reception-workspace-deep-dive.md) §4, §9–11.
**Guardrail:** UX-only, **no business-rule change** — *except* 1.1, which is explicitly raised as a Product Office policy decision.

---

## 1.1 — Configurable payment-timing policy (before / after / hybrid)

- **Business problem:** Auriva assumes **pay-after** (invoice drafts on completion, collected at the Desk). But many Indian OPD clinics collect the **consultation fee at registration** (before the patient sees the doctor), and bill add-on services/procedures after. Today a clinic that works pay-before has to bend its process to Auriva.
- **User story:** *As a clinic owner, I want to choose when the consultation fee is collected — at registration, at checkout, or hybrid — so Auriva matches how my front desk already runs.*
- **Current workflow:** Consultation completes → invoice drafts → reception collects at the Desk. There is no pre-consult collection path.
- **Proposed workflow:** A clinic-level setting — **Collect consultation fee at: [Registration | Checkout (default) | Hybrid]**. Registration = an invoice for the consult fee is raised and collectible at check-in/walk-in; add-on services still bill at checkout. Hybrid = consult upfront, everything else at the Desk. The status machine is untouched; only *when the invoice is created/collectible* changes.
- **UX rationale:** The clinic's real-world money moment is respected; reception isn't fighting the tool. "Collect ₹X" surfaces at the point the clinic actually asks for money.
- **Business impact:** High — removes the single biggest process-fit objection for pay-before clinics; protects revenue capture for walk-ins who might leave before consultation.
- **Engineering complexity:** **Medium/High** — new clinic setting + invoice-lifecycle branch (create-on-registration vs create-on-completion) + reception UX at both points.
- **Dependencies:** Clinic settings surface; invoice service; Epic 4 board actions (collect at check-in); **is a business-rule change → needs Product Office sign-off first.**
- **Recommended priority:** **P1 (decision-gated).**
- **Acceptance criteria:**
  - A clinic can set the policy; default is Checkout (current behaviour, zero change for existing clinics).
  - In Registration mode, checking in / registering a walk-in surfaces a collectible consult-fee invoice.
  - In Hybrid mode, consult fee collects at registration; services collect at checkout.
  - The appointment status machine and audit trail are unchanged.
  - Switching policy never corrupts in-flight visits.

---

## 1.2 — Show the amount on the "Collect" action

- **Business problem:** On the board's **Done · to collect** card, the button reads "Collect" with **no amount**; the prototype (and clinic reality) shows "Collect ₹500". Reception can't see what's owed without opening the Desk.
- **User story:** *As a receptionist, I want to see the amount due on the Collect button so I know what to ask for at a glance.*
- **Current workflow:** Done card → "Collect" → navigates to `/staff/billing?patient=` → find the invoice → see the amount.
- **Proposed workflow:** The card shows **"Collect ₹{balance}"** using the invoice already associated with the completed appointment.
- **UX rationale:** The money is surfaced, never buried — a core Product Bible principle. One less screen to know the number.
- **Business impact:** Medium — faster, more confident collection; fewer "let me check" moments.
- **Engineering complexity:** **Low** — include the invoice balance in the board/queue payload (data exists).
- **Dependencies:** Queue payload includes the appointment's invoice balance.
- **Recommended priority:** **P0.**
- **Acceptance criteria:**
  - Done cards show the outstanding balance on the Collect control.
  - If no invoice/zero balance, the control reads "Collected" (not a stray "Collect ₹0").
  - Amount matches the Desk exactly.

---

## 1.3 — Inline collect from the board (no context switch)

- **Business problem:** Collecting payment means leaving the board for the Desk, then coming back — a context switch during the busiest moment.
- **User story:** *As a receptionist, I want to take payment from the board so I don't lose my place in the queue.*
- **Current workflow:** Done card → navigate to Desk → select method → collect → navigate back.
- **Proposed workflow:** "Collect ₹X" opens an **inline checkout sheet** on the board (method chips UPI/Cash/Card → confirm → receipt), reusing the existing payment endpoint. The Desk remains for full invoice management.
- **UX rationale:** Keep the receptionist in one place; the room keeps moving.
- **Business impact:** Medium/High — measurable clicks-per-patient reduction at the highest-frequency action.
- **Engineering complexity:** **Medium** — a reusable checkout sheet component over `POST /api/billing/invoices/[id]/payments`.
- **Dependencies:** 1.2 (amount on card); the existing payments endpoint.
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - Payment can be recorded from the board without navigating away.
  - Method selection + confirm + receipt in ≤3 interactions.
  - The card leaves the Done lane on success; the Desk reflects it immediately.
  - Failure shows an inline "Try again" (action-tier error), never a dead end.

---

## 1.6 — Outstanding-balance flag at check-in

- **Business problem:** A returning patient may have an **unpaid prior invoice**. Reception has no signal at check-in, so old dues silently accumulate.
- **User story:** *As a receptionist, I want to see if an arriving patient has an outstanding balance so I can collect it while they're here.*
- **Current workflow:** No cross-visit balance signal on the board; reception would have to open the Desk/patient invoices manually.
- **Proposed workflow:** A subtle **"₹X due"** chip on the patient's card (and at check-in) when prior invoices are unpaid — using the existing patient-invoices data.
- **UX rationale:** Surfaces money at the moment the patient is physically present (the only reliable collection moment). Non-alarming, glanceable.
- **Business impact:** High — directly recovers leaked revenue with zero new collection effort.
- **Engineering complexity:** **Medium** — join the patient's open-invoice balance into the queue payload.
- **Dependencies:** `GET /api/patients/[id]/invoices` (exists); queue payload enrichment.
- **Recommended priority:** **P0.**
- **Acceptance criteria:**
  - Patients with a prior unpaid balance show a "₹X due" chip on arrival.
  - Tapping it opens the collectible invoice (inline per 1.3, or the Desk).
  - No chip when nothing is outstanding.
  - Scoped to the clinic (no cross-tenant balance leakage).

---

## 1.5 — Receipt & payment-confirmation delivery *(platform-gated)*

- **Business problem:** After collection, the receipt lives only in-app; patients often want it on SMS/WhatsApp/email.
- **User story:** *As a patient, I want my receipt sent to me so I have a record without logging in.*
- **Current workflow:** Receipt is viewable in the patient app only.
- **Proposed workflow:** On successful collection, send a receipt via the patient's channel.
- **UX rationale:** Closes the loop with a tangible artifact; builds trust.
- **Business impact:** Medium — professionalism, fewer "resend my bill" requests.
- **Engineering complexity:** **Medium** — but **blocked**: no notification-delivery platform exists ([TD-04](../knowledge-base/25-technical-debt-register.md)).
- **Dependencies:** **Notification delivery platform (does not exist).**
- **Recommended priority:** **P2 (blocked).**
- **Acceptance criteria:** *(deferred until the delivery platform exists)* — receipt delivered on the patient's preferred channel; delivery status visible; failures don't block the in-app receipt.

---

## Epic 1 summary

| ID | Improvement | Complexity | Priority |
|---|---|---|---|
| 1.2 | Amount on Collect | L | **P0** |
| 1.6 | Outstanding-balance flag | M | **P0** |
| 1.3 | Inline collect from board | M | **P1** |
| 1.1 | Configurable payment timing | M/H | **P1 (decision)** |
| 1.5 | Receipt delivery | M | **P2 (blocked)** |

**The one decision:** approve/shape **1.1** (payment-timing policy) — it's the only business-rule change in this epic and it unlocks the pay-before clinic segment.
