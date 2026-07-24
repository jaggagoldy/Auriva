# Milestone 3B · Checkpoint B2 — Checkout (Reception) Workspace — Completion Report

**Scope executed:** shared Checkout Workspace (both `/clinic` + `/staff`) · grouped charges (Clinical read-only / Administrative editable) · reception financial charge add · **Concession** (pre-payment) · money summary (Estimated → Concession → Net → Collected → Outstanding) · split/partial payment · **Reception Notes** · Checkout Completion + **Next Action** menu · Visit Status.
**Result:** ✅ **PASS** — all 8 PO refinements incorporated; **590/590** tests; parity by construction across both surfaces.
**Not touched (deferred):** Receipt/Visit Summary generation (**B3**), billing-policy gating (**B4**), credit notes/refunds/immutable-invoice edits (**B5**), Next-Action items beyond Follow-up (**M5**).

---

## 1. What was built

### Backend
| File | Role |
|---|---|
| `prisma` migration `m3b_b2_checkout_notes` | `Invoice.checkout_notes String?` — additive, 1 column |
| `src/services/checkout-service.ts` (new) | `getCheckout` (grouped view + money summary + visit status), `addFinancialCharge` (reception/financial ServiceEvent + line), `applyConcession`/`removeConcession` (ManualAdjustment line, single, ≤ charges, reason required), `removeCheckoutCharge` (financial only — Principle 6), `setCheckoutNotes`, `recordCheckoutPayment` (reuses `recordPayment`) |
| `src/app/api/clinic/checkout/route.ts` (new) | GET view · POST `add_charge`/`concession`/`remove_concession`/`remove_charge`/`notes`/`pay`; each returns refreshed view |
| `src/services/billing-engine-service.ts` | +`regenerateInvoice(tx, id)` — rebuilds total + snapshot from lines (keeps 4-way reconciliation after any draft-line change) |

### Frontend
| File | Change |
|---|---|
| `src/components/shared/checkout/checkout-workspace.tsx` (new) | The whole shared workspace + `useCheckout` hook: VisitHeader (+ Visit Status), ChargesPanel (grouped, Read-Only badge, Add charge), MoneySummary, ConcessionInline, PaymentPanel (methods + split/partial), SideRail (Reception Notes, collapsible Payment History, Documents/Recommendations stubs), CheckoutCompletion (checklist + Next Action menu + Print) |
| `src/app/clinic/page.tsx` | Replaced the single-amount `PaymentStep` with `<CheckoutWorkspace>` |
| `src/components/staff/billing-board.tsx` | "Collect" → **"Checkout"** opens `<CheckoutWorkspace>`; retired the small `PaymentDialog` |

**Parity by construction:** one `CheckoutWorkspace`, both surfaces — the B1b pattern.

---

## 2. The 8 PO refinements — all in
| # | Refinement | Delivered |
|---|---|---|
| 1 | **Concession** (not "Adjustment") | User-facing label "Concession"; backend `origin=ManualAdjustment` unchanged |
| 2 | **Visit Status** in header | Consulting / Ready for Checkout / Partially Paid / Completed (derived) |
| 3 | **Patient Header** | Name · Token · Doctor · **Appointment Type** (Walk-in/Appointment/Follow-up) · Time |
| 4 | **Money Summary** order | Estimated → Concession → **Net** → Collected → Outstanding |
| 5 | **Completion checklist** | ✓ Clinical Consultation Complete · ✓ Payment Recorded · ✓ Invoice Ready |
| 6 | **Read Only badge** | Explicit "🔒 Read only" badge on Clinical Services (not just an icon) |
| 7 | **Payment History collapsible** | Collapsed panel with count + total; expands |
| 8 | **Reception Notes** (NEW) | Operational notes on the invoice, audited (`checkout_notes_updated`) |

**Principle 6 enforced** end-to-end: clinical lines are `removable:false` (server) and render read-only (client); `removeCheckoutCharge` rejects non-financial lines (403).

---

## 3. Money integrity
- Every draft-line change (financial charge, concession, remove) calls `regenerateInvoice` → **total == Σ lines == Σ snapshot** (asserted by `reconciles()` in tests).
- **Concession** is a single line (re-apply updates, never stacks), capped at the charge total, reason mandatory + audited.
- **Split/partial** reuse `recordPayment` (rejects over-collection; draft→issued→paid); Collected/Outstanding update live; Payment History shows each tender.

---

## 4. Test evidence
`src/services/checkout-service.test.ts` (new, **10**): grouped view + money + visit status · financial add + reconcile · **clinical-service rejected (permission)** · concession recompute/reconcile/remove · concession ≤ charges + reason guards · single-concession-line · **Principle 6 clinical not removable** · financial removable · reception notes · **split/partial status transitions**.
Full suite **590/590** (was 580) · `tsc` clean · **0 new lint** (billing-board's 2 `set-state-in-effect` are pre-existing baseline, HEAD-confirmed) · `next build` clean · demo reseeded.

---

## 5. Browser QA — both surfaces (ⓢ = screenshot)
**Login:** phone + `password123`.

**A) /staff (reception):** `9876500005` → **/staff** → Billing/"Collect & close" → a payable invoice → **Checkout** → the workspace opens. ⓢ
1. Header shows patient · token · doctor · **appointment type** · **Visit Status** badge. ⓢ
2. **Clinical Services** group shows a **🔒 Read only** badge; no remove on those rows. ⓢ
3. **Add charge** → "Registration" ₹100 → appears under **Administrative** (removable). ⓢ
4. **Concession** → ₹100 + reason "Doctor approved" → **Net** drops; Money summary shows Estimated → Concession → Net → Collected → Outstanding. ⓢ
5. **Collect** a partial amount (e.g. half) → Visit Status → **Partially Paid**; Collected/Outstanding update; **Payment History** (collapsible) shows it. ⓢ
6. Collect the remainder with a different method (**split**) → **Completion**: ✓ Clinical Consultation Complete · ✓ Payment Recorded · ✓ Invoice Ready + **Print invoice** + **Next Action ▾** (Book Follow-up active; others "soon") + **Done**. ⓢ
7. **Reception Notes** → type "Paid by spouse" → Save note. ⓢ

**B) /clinic (solo):** `9876500001` → **/clinic** → complete a visit → the same workspace opens at checkout (identical behavior). ⓢ

**Negatives:** concession > charges → blocked; over-collect → blocked; remove a clinical line → not possible (no control).

---

## 6. Regression matrix
| Area | Expectation | Status |
|---|---|---|
| Consultation → completion → invoice | Settles clinical services (B1) | ✅ |
| /clinic visit flow (consult → checkout) | Now opens the workspace | ✅ replaced PaymentStep |
| /staff billing list + filters + stats | Unchanged | ✅ |
| /staff invoice detail dialog (view/print/charge) | Retained | ✅ (secondary path) |
| Existing `recordPayment` / invoice status machine | Reused unchanged | ✅ |
| Print invoice route | Reused on completion | ✅ |
| Full automated suite | 590/590, tsc, build | ✅ |

---

## 7. UX Consistency Review
| Criterion | Result |
|---|---|
| Design-system consistency | ✅ warm tokens (`honey-deep` for outstanding), `Card`/`Button`/`Input`, matching radii |
| No visual regression | ✅ new surface; board list untouched |
| Spacing / type / responsive | ✅ `tabular-nums` for money; primary + side rail collapse to one column on mobile |
| Keyboard a11y | ✅ Enter collects/applies; aria-labels on remove; method buttons focusable |
| Empty / loading / saving / error | ✅ loading spinner; empty groups; controls disabled while saving; toast errors |
| Money clarity | ✅ Estimated→Concession→Net→Collected→Outstanding; split shows partial hint |
| Light + dark | ✅ status/badges token-based with dark variants |

---

## 8. Architecture update
```
Consultation (B1) → Complete Visit → settle → draft Invoice + InvoiceLines
        │
        ▼
Reception opens Checkout Workspace  (shared: /clinic + /staff)
  GET /api/clinic/checkout → grouped view (Clinical | Administrative), money, status
  ├─ add_charge   → financial ServiceEvent + line → regenerateInvoice
  ├─ concession   → ManualAdjustment line (single) → regenerateInvoice
  ├─ remove_*     → draft-only; clinical never (Principle 6)
  ├─ notes        → Invoice.checkout_notes (audited)
  └─ pay          → recordPayment (split/partial; draft→issued→paid)
        │
        ▼
Checkout Completion → checklist + Print invoice + Next Action (Follow-up | …future)
SideRail slots: Documents(B3 stub) · Recommendations(future stub)   ← extension points
```

## 9. Decision Log
- **Reception financial charges are real ServiceEvents** (`kind=financial`, finalized) + their line — honors the canonical "every billable thing is a ServiceEvent" model; permission-by-kind reused.
- **Concession = one ManualAdjustment line**, re-apply updates it — a single clean "Concession" figure in the summary.
- **`regenerateInvoice`** centralizes total+snapshot rebuild → reconciliation holds after any draft-line edit; shared conceptually with settlement.
- **Consolidated reception checkout** onto the shared workspace; retired the small `PaymentDialog`. Kept `InvoiceDetailDialog` as a secondary view/print path (not removed — lower risk).
- **Completion overlay derived from `status==="paid"`** (no extra state; also gives paid-invoice reprint).
- **Split = partial payments by method** via `recordPayment` (no new payment backend).

## 10. Technical Debt Register
| Item | Reason | Lands in |
|---|---|---|
| Receipt + Visit Summary generation | Document Engine | **B3** |
| Concession **authority cap** (reception→owner over a limit) | BRD-044 D4; no clinic cap field yet — B2 allows + audits | **B5 / policy** |
| Billing-policy gating (prepaid/hybrid) | behavior | **B4** |
| Credit notes / refunds / post-payment corrections | corrections | **B5** |
| `InvoiceDetailDialog` (legacy charge/discount) coexists with the workspace | kept for lower risk; fold in later | 3B cleanup |
| Next Action: Procedure / Package booking | future entities | **M5** |
| Explicit multi-row "Split" collector | current split = sequential partials; richer UI later if needed | later |

## Verdict & next step
**Checkpoint B2 is complete** — a shared, POS-style Reception Checkout Workspace with grouped charges, Concession, split/partial payment, Reception Notes, Visit Status, and a Completion + Next Action experience, all on the M3A engine with reconciliation intact and Principle 6 enforced. **Stopping for Product Office review.** No checkpoint auto-continues. With approval, **B3 (Document Engine — Visit Summary, Receipt, Invoice, Timeline)** is next.
