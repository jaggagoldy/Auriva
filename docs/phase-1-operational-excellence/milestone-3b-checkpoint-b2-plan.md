# Milestone 3B · Checkpoint B2 — Checkout Workspace — Engineering Plan

> **Status:** PLAN for Product-Office approval. **No B2 code is written until this is approved.** (B1/B1b were small enough to build directly; B2 is the largest UI checkpoint — reception's all-day surface — so scope is locked first, exactly as M3A was.)
> **Authorized:** Checkpoint B2 only. Builds on B1/B1b (Clinical Services) + the M3A engine.

---

## 1. What B2 is
The **reception-facing** one-page checkout: review auto-assembled charges → collect payment → complete the visit. Reception's most-used screen. The five PO principles are **design law** for B2:
1. Reception never calculates — review, adjust (permission), collect.
2. Feels like **POS**, not billing software.
3. Under **30 seconds**.
4. **One page** — charges + payment + completion, no wizard.
5. Think **beyond payment** — completion → documents → follow-up → done.

## 2. What already exists (so B2 is redesign + unify + complete, not greenfield)
| Capability | Today | B2 |
|---|---|---|
| Solo checkout | `/clinic` `PaymentStep` (single amount + method, modal) | **Replaced** by the Checkout Workspace |
| Reception checkout | `/staff` `BillingBoard` + `PaymentDialog` (amount/method/reference) | **Reworked** into the workspace |
| Charges | Invoice + `InvoiceLine`s (from B1 ServiceEvents) | **Reviewed**, auto-assembled |
| Discount | crude negative line (`BillingBoard.InvoiceDetailDialog`) | see **Decision D2** |
| Invoice print | `/print/invoice/[id]` (exists) | **Reused** on completion |
| Payments | `recordPayment`, many-per-invoice | **Split/partial** UI on top |

**Consequence:** B2 is mostly UX + orchestration over proven services. Low backend risk.

## 3. The big decision — surface strategy (like B1/B1b)
There are **two** checkout surfaces. Options:
- **(A, recommended) One shared Checkout Workspace** used by both `/clinic` (solo) and `/staff` (reception) — parity by construction, the B1b lesson. Slightly more upfront design; zero drift, one place to evolve.
- (B) Build `/staff` first (reception is the primary user), then port to `/clinic`.

**Recommendation: A** — a shared workspace, consistent with how B1b resolved the same problem and with the PO's "Reception Workspace as an extensible architecture" guidance.

## 4. Reception Workspace architecture (PO directive: not a billing screen)
Design a workspace **shell** with the Checkout panel primary and **named slots** for future capability, so nothing needs redesigning later:
```
┌───────────────────────────── Reception Workspace ─────────────────────────────┐
│  Patient header (name, token, doctor, visit)          [context slot]           │
├────────────────────────────────────┬──────────────────────────────────────────┤
│  CHECKOUT (primary)                 │  Side rail (extensible slots):           │
│   • Charges (auto-assembled)        │   • Patient context                      │
│   • + financial charge (reception)  │   • Payment history                      │
│   • Estimated Charges               │   • Documents        → B3 (stub now)     │
│   • Discount (permission)  → D2     │   • Pending recommendations → future     │
│   • Outstanding                     │                                          │
│   • Cash / UPI / Card / Split       │                                          │
│   • [Collect Payment]               │                                          │
├────────────────────────────────────┴──────────────────────────────────────────┤
│  CHECKOUT COMPLETION (after collect): Visit Completed ✓ …  [Print][Follow-up][Done] │
└────────────────────────────────────────────────────────────────────────────────┘
```
B2 builds the shell + the Checkout panel + Completion; the side-rail slots are defined but only Patient context + Payment history are populated now (Documents/Recommendations are labeled stubs pointing at B3/future).

## 5. Scope — IN (B2)
1. **One-page checkout**: auto-assembled charges (Invoice + `InvoiceLine`s) → **Estimated Charges** → Outstanding (derived) → payment. No wizard.
2. **Reception financial charge add** — the reception counterpart to B1's clinical capture: add `kind=financial` ServiceEvents at the desk (Registration, Consumable, Administrative) via the **existing** `/api/clinic/service-events` (permission-by-kind, reception role). *(No new backend — the API already supports it; B1 only wired the doctor/clinical path in the UI.)*
3. **Split + partial payment**: multiple `Payment` rows via existing `recordPayment`; UI to collect across methods and leave a balance.
4. **Checkout Completion** end-state: `Visit Completed · ✓ Payment Collected` + actions **[Print invoice]** (existing route), **[Book follow-up]** (reuse existing booking), **[Done]**. Receipt / Visit Summary appear here as **B3 stubs** ("coming in B3") — not generated in B2.
5. **Payment history** panel (existing data).
6. Deliverables at the higher UI bar: completion report, **browser QA (both surfaces)**, regression matrix, **UX Consistency Review**, architecture, Decision Log, Debt Register.

## 6. Scope — OUT (deferred, with clean boundaries)
| Deferred | Why | Lands in |
|---|---|---|
| Receipt + Visit Summary **document generation** | Document Engine | **B3** (B2 reuses invoice print) |
| Billing-policy **gating** (prepaid/hybrid sequence) | Behavior change | **B4** |
| Credit notes, refunds, formal adjustment model | Corrections | **B5** |
| Ad-hoc→catalog reconciliation, tax/GST | later | post-B |

## 7. Decisions to confirm before I build
| # | Decision | Recommendation |
|---|---|---|
| **D1 — Surface** | Shared Checkout Workspace for both `/clinic` + `/staff`, or `/staff`-first then parity? | **Shared** (parity by construction). |
| **D2 — Discounts in B2 or B5?** | The POS mockup shows a Discount line and Principle 1 says "adjust (permission)"; a crude discount already exists in `BillingBoard`. Options: (a) include a clean **permission-gated discount line** in B2 (credit-notes/refunds still B5), or (b) keep **all** corrections in B5 and B2 is collect-only. | **(a)** — a simple, audited, permission-gated discount is core to the POS "adjust" step; the heavier credit-note/refund machinery stays B5. |
| **D3 — Reception financial charge-add in B2?** | Add financial ServiceEvents at the desk. | **Yes** (reception counterpart to B1; API already supports it). |
| **D4 — Completion documents** | Use existing invoice print in B2; Receipt + Visit Summary generated in B3? | **Yes** — B2 reuses invoice print; documents are B3. |
| **D5 — Book follow-up on completion** | Reuse the existing follow-up/booking flow from the completion screen? | **Yes**, if reachable; else a stub link. |

## 8. Permissions, audit, states
- Collect payment, add financial charge, apply discount → **reception** (+ owner). Discount authority/cap per **D4 from BRD-044** (reception to a cap, else owner) — enforced in B2 if D2=(a).
- Audit: `payment_collected`, `discount_applied`, `service_added` (financial) via `recordAudit`.
- States: loading / empty (no charges) / saving / partial-paid / completed; keyboard-first (amount entry, method selection, Enter to collect); light+dark.

## 9. Verdict / next step
On approval of **D1–D5**, I build B2 as one checkpoint (shared workspace, POS checkout, reception financial add, split/partial, Checkout Completion), verify (tsc/lint/tests/build), reseed, produce the full deliverable set, commit, and **STOP for review** before B3. No B2 code until this plan is approved.
