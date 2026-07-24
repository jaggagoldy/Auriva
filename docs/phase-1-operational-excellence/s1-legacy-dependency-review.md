# Phase S1 — Legacy Dependency Review (for Product-Office approval)

> **No code removed.** This is the removal proposal. For each candidate: current references · replacement · migration impact · risk. **Awaiting PO approval of the list before any deletion.** Grep-verified against the codebase.

## Removal candidates

| # | Candidate | Current references (today) | Replacement | Migration impact | Risk |
|---|---|---|---|---|---|
| 1 | **`treatmentId` re-price path** in `completeVisit` (+ the `treatment_id` API param + `setDraftInvoiceItems`/`addInvoiceItem` re-price usage) | `consultation-service.ts` (branch + `setDraftInvoiceItems`), `/api/clinic/consultation` (passes `treatment_id`), `consultation-service.test.ts` (3 refs). **No production UI sends `treatment_id`** — B1 removed the "Treatment & fee" selector. | ServiceEvent capture + settlement (B1) — already the live path | Strip the param + dead branch; update 3 test references | **Low** (dead in prod) |
| 2 | **`PaymentStep`** remnant | `clinic/page.tsx:822` — **a comment only**; the component was deleted in B2 | Checkout Workspace | Delete the stale comment | **None** |
| 3 | **`InvoiceDetailDialog`** + its `/api/billing/invoices/[id]` PATCH (`addInvoiceItem` charge/discount) | `billing-board.tsx` (row name-click → `viewingInvoice`), the PATCH route | **Checkout Workspace** (charges via ServiceEvents + Concession) | Repoint the row click → Checkout Workspace; remove the dialog + the crude charge/discount API path | **Medium** (active /staff UI + an API path) |
| 4 | **`/print/invoice/[id]`** route | `billing-board.tsx:400` (inside #3's dialog) | **Invoice Document** (B3) | Removable once #3 is done; ensure any "print invoice" points at the Document viewer | **Medium** (coupled to #3 + Document adoption) |
| 5 | **`/print/visit-summary/[id]`** route | `appointment-drawer.tsx:241` (used in /doctor etc.) | **Visit Summary Document** (B3) | Repoint the drawer link → Document viewer/print; ensure the VS Document exists for that visit | **Medium** |
| 6 | **`/print/prescription/[id]`** route | `appointment-drawer.tsx:232` | **None yet** — Prescription is a *reserved* (not-built) Document type | **KEEP** — no replacement until the Prescription document ships | — |
| 7 | **`draftInvoiceForAppointment`** legacy fee fallback | `billing-engine-service.ts:115` — the `eventCount === 0` branch in `completeVisitInvoicing` | Unify: always seed a Consultation ServiceEvent + settle (the "everything is a ServiceEvent" endgame) | Change **completion-without-capture** (e.g. reception marks a visit completed with no consultation opened) from an `items_json` fee draft to an event-sourced consultation invoice — same total, different mechanism; needs E2E on that edge path | **Medium** (behavioral unification) |
| 8 | **`/api/clinic/payment`** + `collectVisitPayment` | tests only — **no UI caller** (the workspace uses `/api/clinic/checkout` `pay`) | `/api/clinic/checkout` | Remove the route + wrapper; update tests | **Low** (dead route) |

## Key findings (accuracy notes)
- **#7 is the big one and is NOT dead code** — `draftInvoiceForAppointment` is still the live fallback when a visit completes without the consultation surface opening. Retiring it is a *behavioral unification*, not a delete. I recommend doing it **last**, with explicit E2E on the "reception completes without consult" path.
- **#6 must be kept** — there is no Prescription document yet, so `/print/prescription` has no replacement.
- **#3 → #4 are coupled** — the invoice print link lives inside `InvoiceDetailDialog`; remove them together.
- **#1, #2, #8 are genuinely safe** (dead paths / stale comment).

## Recommended sequencing
1. **Batch A (Low/None):** #1, #2, #8 — dead code + stale comment. Zero behavior change.
2. **Batch B (Medium, coupled):** #3 + #4 — repoint /staff row → Checkout Workspace, remove `InvoiceDetailDialog` + legacy charge/discount API + `/print/invoice`.
3. **Batch C (Medium):** #5 — repoint `appointment-drawer` → Visit Summary Document; remove `/print/visit-summary`.
4. **Batch D (Medium):** #7 — unify the consultation fee onto ServiceEvents; remove `draftInvoiceForAppointment`. Full E2E on non-capture completion.
5. **Keep:** #6 `/print/prescription`.

Each batch: implement → full suite + targeted E2E → commit → proceed. After cleanup, the remaining S1 work (E2E matrix, perf, regression, UI consistency, docs) and the **Platform Health Report**.

## Request
**Approve the removal list (and the batch order), or amend it.** On approval I execute Batch A→D with a verification gate per batch; I will not delete anything not on the approved list.
