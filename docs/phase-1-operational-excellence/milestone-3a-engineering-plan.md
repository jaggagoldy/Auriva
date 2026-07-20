# Milestone 3A — Engineering Plan · Revenue Foundation

**Status:** PLAN — awaiting Product Office approval (Gate 5). **No code, and — per PO scope — NO UI in 3A.**
**Scope (approved):** `Service` (+ category + kind) · `ServiceEvent` · `InvoiceLine` · Billing Policy — the data + service layer only.
**Deferred to 3B (Revenue Experience):** doctor/reception service-adding UI, Billing UI, checkout, multiple-invoice UX, **Adjustments (discounts)**, **Credit Notes / refunds**, reversal UI.
**Architecture basis:** [Billing & Revenue Architecture Review](./milestone-3-billing-architecture-review.md), with the Product Office's 11 refinements applied.

---

## 1. Database schema evolution (all additive)

### 1.1 `Service` — extend (catalog gains meaning)
| New field | Type | Notes |
|---|---|---|
| `category` | String (validated) | Consultation · Procedure · Lab · Radiology · Vaccination · Injection · Therapy · Consumable · Administrative · **Package** |
| `kind` | String (validated) | `clinical` \| `financial` — drives who may add it (§3) |

*(Tax fields `tax_rate`/`hsn_sac` are intentionally **not** in 3A — additive later; noted so the InvoiceLine design leaves room.)*

### 1.2 `ServiceEvent` — **new (the keystone)**
The atomic clinical/financial fact. Snapshots the catalog so later price changes never rewrite history.
```
id · clinic_id · patient_id
appointment_id            // ACTIVE relationship (M3)
encounter_id  String?     // FUTURE-PROOF — nullable, UNUSED in M3 (per PO)
service_id    String?     // catalog link; null = ad-hoc
name · category · kind    // snapshots
unit_price · qty · amount // snapshots (amount = unit_price * qty)
status  String            // draft → finalized | removed ; finalized → reversed
needs_catalog_review Boolean @default(false)   // ad-hoc flag (per PO decision 8)
added_by_user_id String? · added_by_role String  // 'doctor' | 'reception'
added_at · finalized_at? · removed_at?
invoice_line_id String? @unique   // set when billed
```

### 1.3 `InvoiceLine` — **new (implement now, per PO decision 5)**
Relational lines are the source of truth for reporting/GST/packages/insurance; `items_json` stays as the frozen **print snapshot**.
```
id · invoice_id
service_event_id String? @unique   // null for legacy/consult-fee lines
description · category?             // snapshots
qty · unit_price · amount
created_at
```

### 1.4 `Invoice` — relax + bridge
- **Drop `appointment_id @unique`** → an appointment may have **1..N invoices** (PO decision 4).
- Add relation `lines InvoiceLine[]`.
- **Keep `items_json`** — now *generated from `InvoiceLine`* (source → snapshot). Frozen at issue; regenerated from lines while `draft`.

### 1.5 `Clinic` — billing policy
| New field | Type | Default |
|---|---|---|
| `billing_policy` | String | **`postpaid`** for existing rows (zero behaviour change); **new clinics created as `prepaid`** (default for Indian clinics, PO decision 1) |

> **Not in 3A (designed-for, built in 3B):** `Adjustment` (discounts — a *billing* concept, not a ServiceEvent, PO decision 7) and `CreditNote` + refund `Payment` (PO decision 9). 3A's schema is shaped so both attach to `Invoice` additively later.

---

## 2. Migration strategy (ordered, reversible)

1. **Add `Service.category`, `Service.kind`** — nullable → **backfill** (existing services → `category='Consultation'`, `kind='clinical'`; flagged for admin reclassification in 3B) → set NOT NULL with defaults.
2. **Create `ServiceEvent`.**
3. **Create `InvoiceLine`.**
4. **Drop the unique index on `Invoice.appointment_id`** (keep the FK; it becomes 1:N).
5. **Add `Clinic.billing_policy`** default `postpaid`.
6. **Data backfill:** for every existing `Invoice`, parse `items_json` → create matching `InvoiceLine` rows (so 100% of invoices have relational lines; totals verified equal). No `ServiceEvent` is retro-created for historical invoices (they predate the event model — their lines carry `service_event_id = null`).

Each step is its own migration; steps 1–5 are schema, 6 is a data migration run once and idempotent.

---

## 3. Service-layer changes (no UI — pure functions + guards, fully unit-tested)

| Module | Change |
|---|---|
| `domain/service-catalog.ts` (new) | `SERVICE_CATEGORIES`, `SERVICE_KINDS`, validators — the single source for the enums (mirrors `appointment-status.ts`/`invoice-status.ts`). |
| `service-catalog-service.ts` | `createService`/`updateService` accept `category` + `kind` (validated). |
| `service-event-service.ts` (new) | `addServiceEvent(appointmentId, input, actor)` — **permission by kind**: `clinical` requires the doctor capability, `financial` requires reception; ad-hoc (`service_id=null`) sets `needs_catalog_review`. `removeServiceEvent` — **draft only**. `finalizeServiceEvents(appointmentId)` — draft→finalized. `reverseServiceEvent(id, reason)` — finalized→reversed, **reason mandatory** (PO decision 10; the *function + guard* land in 3A, the UI in 3B). |
| `billing-service.ts` | New `settleInvoiceFromEvents(tx, appointmentId, opts)` — creates an `Invoice` + `InvoiceLine`s from **finalized** ServiceEvents and writes the `items_json` snapshot. One shared **`renderItemsJson(lines)`** generator (the only place JSON is produced → no drift). Balance stays **derived** (`total − Σpayments`; expose Outstanding/Paid/Balance — PO decision 6). |
| `domain/billing-policy.ts` (new) | `BILLING_POLICIES` (`prepaid`/`postpaid`/`hybrid`) + `resolveBillingPolicy(clinic)`. The **engine reads it**; the *trigger points* (prepaid-collect-at-registration, checkout) are 3B. |

---

## 4. Billing engine updates (backward-compatible)

- **`draftInvoiceForAppointment` (the completion hook, `appointment-service.ts:487`)** is re-expressed on the new foundation: on completion it ensures a **consult-fee ServiceEvent** exists (financial), finalizes the appointment's finalized-eligible events, and calls `settleInvoiceFromEvents`. **Output is identical for the existing flow** — a consult invoice with the same `items_json`, same total, same status machine.
- **Invoice status machine unchanged** (`draft → issued → paid/void`; corrections = void+new). Immutability preserved: `items_json` frozen at issue.
- **Billing policy is inert at the engine level in 3A** beyond being read — postpaid = today's behaviour; prepaid/hybrid *timing* is wired in 3B. This keeps 3A shippable with zero user-visible change.

---

## 5. Backward-compatibility plan

| Consumer | Guarantee |
|---|---|
| Desk / Billing board (`items_json`) | Unchanged — reads the same snapshot |
| Print (Rx/invoice) | Unchanged — reads `items_json` |
| M1 balance enrichment (queue-service open-invoices) | Unaffected — invoices keep their shape; new lines are additive |
| `draftInvoiceForAppointment` output | Byte-for-byte the same consult invoice for the existing flow |
| Existing invoices | Gain backfilled `InvoiceLine`s; `items_json` remains authoritative for display |
| Appointment status machine | **Not touched** |

**Idempotency note (important):** current draft idempotency relies on `Invoice.appointment_id @unique`. After relaxing it, idempotency moves to an **application guard** — "one non-void *consult* invoice per appointment" — enforced in `settleInvoiceFromEvents`. Covered by tests (§7, R2).

---

## 6. Rollback strategy

3A is fully additive and 3A **does not create multiple invoices per appointment** (that's 3B), so rollback is clean:
1. Down-migrate `Clinic.billing_policy` (removing it → postpaid behaviour, i.e. today).
2. Re-add the unique index on `Invoice.appointment_id` (safe: 3A never violates 1:1).
3. Drop `InvoiceLine`, `ServiceEvent`, and the `Service` columns.
4. `items_json` is preserved throughout, so **every invoice remains intact and printable** after rollback.
Backfilled `InvoiceLine`s are derived data (droppable). No invoice or payment is ever mutated by rollback.

---

## 7. Test strategy

- **Domain:** category/kind/policy validators (valid + invalid).
- **service-event-service:** add/remove/finalize/reverse transitions; **permission-by-kind** (clinical⇒doctor only, financial⇒reception only); ad-hoc → `needs_catalog_review`; reverse requires a reason.
- **billing-service:** `settleInvoiceFromEvents` → correct `InvoiceLine`s + `items_json` snapshot; `total = Σ lines`; consult-fee path output identical to today; **idempotency guard** (R2).
- **Migration/backfill:** each existing invoice → lines whose sum equals the original `total`; `items_json` unchanged.
- **Backward-compat:** existing draft→issue→pay flow unchanged; M1 balance math unaffected; Desk/print snapshot identical.
- **Data QA script** (the M1/M2 pattern): against the dev DB, exercise the real services + a backfill dry-run; then reseed.
- Gate: tsc · lint (0 new over baseline) · full vitest suite · `next build` · data QA.

---

## 8. Risk assessment

| # | Risk | Mitigation |
|---|---|---|
| **R1** | **Dual source of truth** (`items_json` vs `InvoiceLine`) drift | `InvoiceLine` is the source; `items_json` is a *generated* snapshot via one `renderItemsJson()`; frozen at issue, regenerated while draft. |
| **R2** | **Idempotency** after dropping `appointment_id @unique` (duplicate consult invoices) | App-level guard ("one non-void consult invoice per appointment") + tests. |
| **R3** | **Backfill correctness** for historical invoices | Tested, idempotent migration; defensive `items_json` parse; assert per-invoice total equality. |
| **R4** | **Service classification defaults** (existing services' category/kind) | Safe defaults + `needs_catalog_review` path; admin reclassifies in 3B. |
| **R5** | **Billing-policy default regressions** | Existing clinics `postpaid` (unchanged); new clinics `prepaid` at creation; engine timing inert until 3B. |
| **R6** | Code assuming 1:1 invoice↔appointment | Audit call sites (`getInvoice`, enrichment, drafting); only the drafting idempotency relies on it → R2. |
| **R7** | Performance (line joins) | Indexed FKs; pilot-scale; `items_json` still serves the hot read path. |

---

## 9. Effort & sequencing

| Slice | Content | Est. |
|---|---|---|
| Schema + migrations + backfill | §1, §2 | ~2 days |
| Domain + service layer | §3 | ~2 days |
| Billing engine refactor + backward-compat | §4, §5 | ~2 days |
| Tests + data QA | §7 | ~1–2 days |
| **3A total** | Revenue Foundation, **no UI** | **~1–1.5 weeks** |

---

## 10. Out-of-scope confirmation (3A)
No UI. No Adjustments/Credit-Notes/refunds implementation (schema-compatible, built in 3B). No Encounter entity (only the nullable `encounter_id` placeholder). No tax activation. No appointment-status-machine change. No change to visible billing behaviour (postpaid stays identical).

---

**Awaiting approval to build 3A.** After 3A ships and is QA-passed, we move to **3B — Revenue Experience** (the UI, adjustments, credit notes, multi-invoice checkout), planned and gated the same way.
