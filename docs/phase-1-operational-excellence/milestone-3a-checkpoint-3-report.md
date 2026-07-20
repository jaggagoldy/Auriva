# Milestone 3A · Checkpoint 3 — Completion Report

**Scope executed:** Appointment→Invoice **1:N relaxation** · `settleInvoiceFromEvents` (deterministic, idempotent) · InvoiceLine + frozen snapshot generation · appointment-completion hook (backward-compatible) · settlement invariant (code + tests) · consumer-compatibility verification · currency snapshot · billing-policy event-readiness (design-only).
**Migration:** `20260720105124_m3a_c3_relax_invoice_1n_currency`
**Result:** ✅ **PASS** — **zero user-visible change**; the engine is built, proven, and dormant until 3B wires the capture UI. **Not authorized, not touched:** billing-policy activation, checkout, multi-invoice UI, service-entry UI, discounts, credit notes, refunds, any 3B.

---

## 1. Consumer inventory & compatibility verification (the highest-risk item)

Every consumer that assumed the 1:1 `Appointment ↔ Invoice` relationship, listed and individually verified — **not** relying on indirect coverage. Two were found only because the **test suite failed**, not the compiler (they used a type-assertion cast that bypassed `tsc`) — proof the "list every consumer" discipline was warranted.

| # | Consumer | 1:1 assumption | Fix | Verified by |
|---|---|---|---|---|
| 1 | `billing-service.draftInvoiceForAppointment` | `findUnique({where:{appointment_id}})` idempotency guard | → `findFirst` (earliest wins) — guard semantics identical | full billing/consultation suites |
| 2 | `consultation-service` (post-complete lookup) | `findUnique({where:{appointment_id}})` | → `findFirst` (deterministic order) | `consultation-service.test.ts` |
| 3 | `clinic-schedule-service` (board) | `invoice` relation include → `a.invoice?.status` | relation → `invoices[]`, latest-wins representative status | **new** regression test (1:N latest-wins) |
| 4 | `appointment-service` completion hook | called `draftInvoiceForAppointment` | rewired to `completeVisitInvoicing` (either/or) | `appointment` + `billing-engine` suites |
| 5 | `dashboard-service` `APPT_SELECT` | **dead** `invoice: {status,total}` select (cast-hidden) | removed (money story is `billingDaySummary`) | `dashboard-service.test.ts` (8 tests) |
| 6 | `clinic-workspace-service` today-select | **dead** `invoice: {status,total}` select (cast-hidden) | removed | `clinic-workspace` + `demo` suites |
| 7 | `clinic/page.tsx` | reads flattened DTO `invoice_status` | no schema coupling — **verify only, no change** | build + schedule regression |
| — | `event-handlers`, `print`, `billing-board`, `timeline-service`, `queue-service`, `command-center`, `onboarding` | lookups by `id`/`clinic`/`patient`, or **payment→invoice** (a different, unchanged relation) | **not 1:1 — no change** | full suite + explicit `invoice: {` sweep |

**Method:** `tsc` (relation rename surfaces every static access) → full test suite (surfaces the cast-hidden selects) → a manual `grep` sweep of every `invoice: {` / `invoice: true` occurrence, each classified as appointment-relation (fixed) vs payment-relation/type/icon (safe). All three agree: **no appointment→invoice 1:1 assumption remains.**

## 2. The 1:N relaxation (schema)

- `Invoice.appointment_id` — dropped `@unique` (the **Approved Variance** from C1, now landed). Migration drops only the unique **index**; **no data touched** (destructive-statement scan: 0).
- `Appointment.invoice Invoice?` → `Appointment.invoices Invoice[]`.
- `prisma validate` → valid; migration reviewed before apply (1 `DROP INDEX`, 1 additive `ADD COLUMN`).

## 3. The billing engine — `settleInvoiceFromEvents`

Three load-bearing properties, each **asserted in tests** (not just claimed):

| Property | Guarantee | Proof |
|---|---|---|
| **Deterministic** | Same finalized events → identical lines, snapshot (byte-for-byte), and total. Events ordered `(added_at, id)`; no clock feeds business logic. | `determinism` test — two independent settlements compared deeply-equal incl. `items_json` string identity |
| **Idempotent** | Re-settling with no newly-finalized events is a no-op (`created:false`, 0 lines). One invoice, one set of lines. | `idempotency` test (settle × 3 → 1 invoice, 2 lines) |
| **No double-attach** | A finalized event attaches to **exactly one** InvoiceLine. Enforced by the DB (`unique service_event_id`) — the second writer hits `P2002`. | test asserts `P2002` on a manual duplicate line |
| **Reconcilable** | `Invoice.total == Σ InvoiceLine.amount == Σ snapshot.amount`, snapshot shape == print's `InvoiceItem`. | **4-way reconciliation** test |

**Settlement invariant** (`checkSettlementInvariant`, code + test): for an appointment, every finalized ServiceEvent is *attached exactly once* OR *awaiting settlement* — **never lost, never doubled**, and no line points at a draft/removed event. Returns `{finalized, attached, awaiting, violations, healthy}`.

**4-way reconciliation** — for the settled invoice, the test proves all four representations describe the same document: `Invoice.total` = Σ`InvoiceLine.amount` = Σ snapshot rows, and each snapshot row equals its line `{description,qty,unit_price,amount}` (the exact shape `/print/invoice` parses).

## 4. Completion hook — backward-compatible either/or

`completeVisitInvoicing(tx, appointment)`, in the same transaction as the status change:

- **No ServiceEvents captured** (today's production reality — no capture UI until 3B) → the existing consultation-fee auto-draft, **byte-for-byte unchanged**.
- **Events captured** → finalize the visit's draft charges (`draft→finalized`, guard-free), then settle them into an event-sourced invoice.

Because production has no events yet, **today's behaviour is identical** — the engine stays dormant until 3B, exactly like the C2 billing policy. Both branches are tested.

## 5. C3 refinements folded in

- **Currency snapshot** — `ServiceEvent.currency String @default("INR")` (additive column). INR-only today, future-proofed at ~zero cost; test asserts the default snapshots as `INR`.
- **`BillingPolicyChanged` event-readiness** — `setBillingPolicy` remains the single choke point; a documented extension point marks exactly where `publishEvent({ eventType: "billing.policy.changed", … })` will emit **without changing the API**. Deliberately not wired (no billing events consumed yet) — 3B.

## 6. Verification

| Gate | Result |
|---|---|
| `prisma validate` / migration scan | ✅ valid · additive + 1 index drop, **0 destructive** |
| `tsc --noEmit` | ✅ clean |
| ESLint (new + changed) | ✅ **0 new** |
| Test suite | ✅ **571/571** (+12 from C2's 559: 11 engine + 1 schedule regression) |
| `next build` | ✅ clean |
| Demo reseed | ✅ `seed-demo-india.ts` (post-vitest) |

## 7. Decision Log

- **Backward-compatible either/or completion** — settlement activates only when events exist; the legacy fee-draft is untouched. Chosen over a dual-write (auto-create a fee ServiceEvent) to keep C3 zero-risk; unifying the fee path onto events is a 3B decision.
- **Settled = has an InvoiceLine** — no `settled_at`/status flag on ServiceEvent; the presence of a line (unique FK) is the single source of truth for "settled", which is what makes idempotency and the no-double-attach invariant free at the DB level.
- **Settlement produces a `draft` invoice** — issuing/payment stays the existing `transitionInvoice`/`recordPayment` flow (unchanged, not in C3 scope).
- **`findFirst` + `orderBy: created_at asc`** everywhere the old `findUnique(appointment_id)` lived — deterministic "earliest wins", preserving single-invoice semantics.
- **Dead `invoice` selects removed, not migrated** — dashboard/workspace never read them; removing beats carrying forward a stale relation.
- **`nextInvoiceNumber` exported and reused** (not duplicated) by the engine — one numbering scheme.
- **Currency lives on ServiceEvent only** — not added to Invoice/InvoiceLine now (INR-only; avoid over-building), snapshot carries through where it matters later.

## 8. Architectural Debt Register

| Deferred item | Reason | Lands in |
|---|---|---|
| Billing-policy **activation** (prepaid/hybrid settlement timing) | Engine still does not read the policy | **3B** |
| Legacy fee-draft → event-sourced unification (fee as a ServiceEvent) | Backward-compat either/or in C3; unify when capture UI ships | **3B** |
| Service-entry / checkout / multi-invoice **UI** | Revenue Experience | **3B** |
| Reversal → **Credit Note + refund Payment** | Reversal function exists (C2); financial counter-document is 3B | **3B** |
| Adjustments (discounts) | Billing concept, not a ServiceEvent | **3B** |
| Tax / GST activation | Nullable line fields exist; `currency` snapshotted | Post-3B |
| `billing.policy.changed` domain event emission | Extension point in place; event platform carries it later | **3B** |
| Session/RBAC actor resolution for capture | Caller's responsibility; engine + service stay pure | **3B** |
| `Encounter` entity | `encounter_id` placeholder only | Future |

## Verdict & next step

**Checkpoint 3 is complete and passes every authorized acceptance criterion.** The Appointment→Invoice relation is safely 1:N with **every** consumer inventoried and verified; the billing engine is **deterministic, idempotent, invariant-guarded, and 4-way reconcilable**; the completion hook is backward-compatible and dormant until 3B. Zero user-visible change; zero unauthorized scope.

**This completes Milestone 3A (Revenue Foundation).** **Stopping here for Product Office review.** The engine has no UI surface, so there is no browser QA to hand off — verification is the migration scan + the test suite above. With approval, the next milestone is **3B (Revenue Experience)**: capture UI, checkout, policy activation, adjustments, credit notes/refunds — the first place any of this becomes user-visible.
