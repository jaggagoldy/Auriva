# Milestone 3B · Checkpoint B2 — Checkout Workspace
## Engineering Readiness & UX Specification

> **Status:** SPEC for Product-Office approval. **No B2 code until approved.** Supersedes the B2 plan; folds in the approved decisions D1–D5 + refinements.
> **Approved scope (PO):** shared Checkout Workspace · Reception Workspace architecture · one-page POS · reception financial charges · split/partial payment · **Checkout Adjustment** (pre-payment discount) · invoice print only · Completion state with a **Next Action** menu.
> **Architected for (not built):** M5 Treatment Planning, B3 Document Engine, recommendations, communication — via named extension slots. This spec builds **only B2**.

---

## 1. Design principles (law for B2)
1. Reception never **calculates** — review, adjust (permission), collect.
2. Feels like **POS**, not billing software.
3. Under **30 seconds**.
4. **One page** — charges + payment + completion, no wizard.
5. Think **beyond payment** — completion → documents → follow-up → done.
6. **Reception never edits clinical information.** Diagnosis / Prescription / Clinical Services are **read-only** to reception; reception edits only **Administrative charges / Adjustment / Payment**.

---

## 2. Scope

### IN (B2)
- **Shared Checkout Workspace** (D1) used by `/clinic` (solo) + `/staff` (reception).
- **Grouped charges** (new concept): **Clinical Services** (`kind=clinical`, read-only to reception) vs **Administrative Charges** (`kind=financial`, reception-editable) — the data already carries `kind`, so grouping is a view.
- **Reception financial charge add** (D3): Registration, File, Consumables, Administrative, etc. — `kind=financial`, reception role.
- **Checkout Adjustment** (D2, reframed): a **pre-payment** discount on the still-open invoice — *not* a correction. Permission-gated (reception to a cap, else owner), audited.
- **Money summary** (refined): show **Estimated Charges → Collected → Outstanding** (critical for split).
- **Split + partial payment**: Cash / UPI / Card / Split; multiple `Payment` rows; resumable.
- **Checkout Completion** state: `Visit Completed · ✓ Payment Collected` + **Next Action** menu (Book Follow-up works now; Book Procedure / Package / Recommendation appear later) + **Print invoice** + **Done**.
- **Payment history** panel.

### OUT (deferred — clean boundaries)
| Deferred | Lands in |
|---|---|
| Receipt + Visit Summary **generation** | **B3** (B2 reuses invoice print) |
| Billing-policy gating (prepaid/hybrid) | **B4** |
| **Financial corrections** — credit notes, refunds, immutable-invoice edits (post-payment) | **B5** |
| Treatment recommendation / procedure / package booking (Next Action items beyond follow-up) | **M5** |

> **Adjustment vs Correction (the D2 boundary, explicit):** an **Adjustment** happens **before payment** on an **open** invoice (B2). A **Correction** (credit note / refund) happens **after payment** on an **immutable** invoice (B5). Different concepts, different checkpoints.

---

## 3. UX Specification

### 3a. Wireframe — one-page Checkout Workspace
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Back        John Doe · Token 12 · Dr Ananya Iyer · Today 10:30      [Details]│  ← patient header (read-only)
├───────────────────────────────────────────────┬──────────────────────────────┤
│  CHECKOUT (primary)                            │  SIDE RAIL (extensible)       │
│                                                │                               │
│  Clinical Services              (read-only 🔒) │  ▸ Patient context            │
│    Consultation — Dr Ananya          ₹500      │     allergies · last visit    │
│    Injection                         ₹300      │                               │
│    ECG                               ₹300      │  ▸ Payment history            │
│                                                │     UPI ₹2,000 · 10:31        │
│  Administrative Charges         [+ Add charge] │                               │
│    Registration                      ₹100  ✎✕  │  ▸ Documents        (B3)      │
│    (empty → "No admin charges")                │     Invoice ready · stub      │
│  ────────────────────────────────────────────  │                               │
│  Estimated Charges                 ₹1,300      │  ▸ Recommendations  (future)  │
│  Adjustment          [− Add adjustment]  −₹130 │                               │
│  ────────────────────────────────────────────  │                               │
│  Collected                           ₹0        │                               │
│  OUTSTANDING                       ₹1,170      │                               │
│                                                │                               │
│  Pay:  (Cash) (UPI) (Card) (Split)             │                               │
│  Amount [ ₹1,170 ]              [ Collect ▸ ]   │                               │
└───────────────────────────────────────────────┴──────────────────────────────┘

  After Collect (full) → COMPLETION overlay/panel (same page, no navigation):
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✓ Visit Completed                                                             │
│     ✓ Payment Collected     ₹1,170  (Cash ₹1,000 · UPI ₹170)                   │
│     • Receipt              (coming in B3)                                       │
│     • Visit Summary        (coming in B3)                                       │
│  [ Print invoice ]     [ Next Action ▾ ]     [ Done ]                           │
│                          ├ Book Follow-up  ✓                                    │
│                          ├ Book Procedure   (soon)                             │
│                          └ Package Booking  (soon)                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3b. User flow
1. Reception opens a completed visit → Checkout Workspace (charges auto-assembled from the settled invoice's `InvoiceLine`s).
2. (Optional) **+ Add charge** → inline picker for **financial** catalog/ad-hoc → line appears under Administrative.
3. (Optional) **+ Add adjustment** → amount + reason (permission-gated) → Estimated Charges recalculated.
4. Choose method(s); for **Split**, add multiple method+amount rows; **Collected** and **Outstanding** update live.
5. **Collect** → payment recorded; if Outstanding = 0 → **Completion**; if partial → stays open, resumable.
6. Completion → **Print invoice** / **Next Action ▾ → Book Follow-up** / **Done**.

### 3c. Interaction notes
- **Keyboard-first:** amount field autofocus; method selectable by key; Enter = Collect; Esc = back. Under-30-seconds default: amount pre-filled to Outstanding.
- **Clinical read-only:** Clinical Services rows show a lock affordance, no edit/remove for reception (Principle 6). On `/clinic` (solo owner) the same rules apply by role, not surface.
- **Split:** a compact multi-row collector (method + amount); running Collected vs Outstanding; block over-collection (> Outstanding) with an inline message.
- **Adjustment:** a single negative line with a reason; removable while the invoice is open; disabled once paid.
- **States:** loading · empty-charges · saving (controls disabled) · partial-paid (persistent "Outstanding ₹X, resume") · completed. Light + dark. Errors via toast with a fix hint.
- **Completion "coming in B3"** items are visibly present but disabled — the workflow *feels* complete without scope leakage.

### 3d. Component hierarchy (shared)
```
components/shared/checkout/
  CheckoutWorkspace            (shell: header + primary + side rail + completion)
    ├─ VisitHeader             (read-only patient/visit context)
    ├─ ChargesPanel
    │    ├─ ChargeGroup "Clinical Services"     (read-only)
    │    ├─ ChargeGroup "Administrative"        (+ AddFinancialCharge → reuses B1 CategoryPicker pattern)
    │    ├─ AdjustmentRow                        (permission-gated)
    │    └─ MoneySummary        (Estimated / Collected / Outstanding)
    ├─ PaymentPanel
    │    ├─ MethodSelector      (Cash/UPI/Card/Split)
    │    └─ SplitCollector
    ├─ SideRail                 (named slots: PatientContext, PaymentHistory, DocumentsSlot[B3 stub], RecommendationsSlot[future stub])
    └─ CheckoutCompletion       (checklist + NextActionMenu + PrintInvoice + Done)
  useCheckout(invoiceId|appointmentId)   (state + actions hook; server-truth on every mutation)
```
`/clinic` and `/staff` render `<CheckoutWorkspace>` inside their own page wrappers — parity by construction (the B1b pattern).

---

## 4. Engineering Readiness

### 4a. Backend
| Item | Reuse / New |
|---|---|
| Assemble charges | **Reuse** — settled invoice + `InvoiceLine`s (B1/M3A) |
| Reception financial add | **New (small)** — `service-capture-service.addVisitFinancialCharge` (role `reception`, `kind=financial`) + a `financial` action on `/api/clinic/service-events`; permission-by-kind already enforces it |
| Checkout Adjustment | **New** — `applyCheckoutAdjustment(invoiceId, amount, reason, actor)`: adds a `InvoiceLine` `origin=ManualAdjustment` (negative), **regenerates total + `items_json`**, draft-only, permission-gated, audited. One snapshot generator shared with settlement |
| Payment (incl. split/partial) | **Reuse** — `recordPayment` (many-per-invoice); invoice status draft→issued→paid via existing transitions |
| Money summary | **Reuse** — Estimated = invoice.total (post-adjustment); Collected = Σ payments; Outstanding = derived |
| Migrations | **None expected** (adjustment uses existing `InvoiceLine.origin`; `discount_amount` column already exists) |
| Permissions | reception/owner for charge/adjustment/payment; discount cap → owner (BRD-044 D4) |
| Audit | `payment_collected`, `checkout_adjustment_applied`, `service_added(financial)` |
| Tests | adjustment recompute + reconciliation, permission-by-kind (financial), split/partial totals, completion transition, reception-cannot-edit-clinical guard |

### 4b. Frontend
- **Shared components:** the `components/shared/checkout/*` tree above; reuse B1's `CategoryPicker` pattern for financial add.
- **Routes:** none new — mounted inside `/clinic` (replacing `PaymentStep`) and `/staff` (reworking `BillingBoard`).
- **Hooks:** `useCheckout` (mirrors `useServiceCapture`); reuse `useServiceCapture` for the financial-add picker.
- **State:** server-truth after every mutation (no optimistic money); local UI state for split rows.
- **UI/responsive:** primary + side rail collapses to single column on mobile; tabular-nums for money; light+dark tokens.

### 4c. UX / Design
- Design-system consistency (warm tokens, `Section`/`Card`/`Button`/`Input`); semantic color for money states; visible focus; `prefers-reduced-motion`; a11y labels on all controls.

---

## 5. Reception Workspace — future-proofing map (architecture guidance, not build)
The **SideRail** and **NextActionMenu** are the designed extension points so future milestones **plug in without redesign**:
| Future (roadmap) | Plugs into |
|---|---|
| B3 Documents (Receipt, Visit Summary, Timeline) | `SideRail.DocumentsSlot` (stub now) |
| M5 Treatment Planning (procedure/package booking, recommendations) | `NextActionMenu` items + `SideRail.RecommendationsSlot` |
| B4 Billing policy | gates the checkout *sequence*, not the layout |
| B5 Corrections | post-payment actions on the completed invoice (separate surface) |
| Communication (WhatsApp/email) | a delivery action on documents (B3+), never in B2 |
Specialty extensions add clinical service categories only — no checkout change (kind-based grouping already generic).

---

## 6. Deliverables & gate
On approval I build B2 (shared workspace, grouped charges, reception financial add, Checkout Adjustment, split/partial, money summary, Completion + Next Action), then: **Engineering Completion Report · Browser QA (both surfaces) · Regression Matrix · UX Consistency Review · Architecture Update · Decision Log · Technical Debt Register**, and **STOP** for Product-Office review before B3. No auto-continue.

**Awaiting approval of this spec to begin implementation.**
