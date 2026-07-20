# Milestone 3A · Checkpoint 1 — Completion Report

**Scope executed:** Schema evolution · migrations · backfill · fail-fast reconciliation · domain enums. **Nothing else** (no service layer, billing engine, UI, or policy activation — the change freeze held).
**Commit:** `f157e90` · **Migration:** `20260720102107_m3a_revenue_foundation`
**Result:** ✅ **PASS** — zero user-visible change; all acceptance criteria met.

---

## 1. Schema Verification

| Check | Result |
|---|---|
| New tables created | ✅ `Service_Events`, `Invoice_Lines` |
| New indexes created | ✅ `Service_Events(clinic_id,status)`, `Service_Events(appointment_id)`, `Invoice_Lines(invoice_id)`, unique `Invoice_Lines(service_event_id)` |
| Foreign keys valid | ✅ 6 FKs (ServiceEvent→clinic/patient/appointment/service; InvoiceLine→invoice/serviceEvent) with correct `onDelete` (Cascade / SetNull) |
| New columns | ✅ `Services.category/kind/version`, `Clinics.billing_policy` — all `NOT NULL DEFAULT` (safe on existing rows) |
| Constraints validated | ✅ `prisma validate` → "schema is valid 🚀" |
| **No destructive schema changes** | ✅ Migration SQL scanned — **NONE** (`DROP TABLE/COLUMN/CONSTRAINT`, `DELETE`, `TRUNCATE` = 0). Additive only. |

> **Scope note (deferred, not skipped):** `Invoice.appointment_id` intentionally **stays `@unique` (1:1) in C1.** Relaxing to 1:N forces `Appointment.invoice → invoices[]` and updates to ~5 service/UI consumers (clinic-schedule, dashboard, clinic-workspace, clinic page) — **service-layer work outside C1's authority + the change freeze.** Moved to **Checkpoint 3** (billing engine), where multiple-invoices-per-appointment first becomes real and those consumers are touched anyway. Zero risk to C1.

## 2. Backfill Report

| Metric | Value |
|---|---|
| Invoices found | 13 |
| Line-items to create | 14 |
| **Invoices processed** | **13** |
| **Invoices verified** | **13** |
| **Invoices passed** | **13** |
| InvoiceLines created | 14 |
| Skipped (idempotent, already had lines) | 0 (first run) |
| **Failures** | **0** |
| Rollback executed | No (not needed — 0 failures) |

**Processed = Verified = Passed = 13.** No partial success. Runs in **one transaction**; any single mismatch aborts the whole migration (proven by design). **Idempotent** — a re-run after reseed processed only the 3 new invoices and skipped the 10 that already had lines.

## 3. Reconciliation Report (exact, no tolerance)

For **every** one of the 13 invoices, the pre-flight and post-write checks proved:

```
Original Invoice.total  ==  Σ InvoiceLine.amount  ==  Generated snapshot total
```

- **100%** reconciled · **0** offenders · **no rounding variance** (integer INR throughout).
- Amounts are integer paise-free INR, so equality is exact by construction; the check asserts it rather than assumes it.

## 4. Performance

| Metric | Value |
|---|---|
| Migration wall-time | ~3 s (schema apply + client generate) |
| Backfill duration | **33–47 ms** for 13 invoices / 14 lines |
| Rows processed | 13 invoices → 14 lines |
| Indexes added | 4 (2 on ServiceEvent, 2 on InvoiceLine incl. the unique) |
| Peak memory | Negligible (streamed per-invoice; single small transaction) |

*(Pilot-scale numbers; the pattern — per-invoice, indexed FKs, single transaction — scales linearly and is safe for larger PostgreSQL datasets.)*

## 5. Database Integrity

| Check | Result |
|---|---|
| Existing invoices still printable (`items_json` intact) | ✅ Untouched — `items_json` is the frozen print snapshot |
| Existing payments untouched | ✅ Count + Σ amount unchanged |
| Balances unchanged | ✅ Balance is derived (`total − Σpayments`); neither operand changed |
| Appointment relationships unchanged | ✅ `Invoice.appointment_id` unchanged (still 1:1); new `ServiceEvent.appointment` is additive |
| **M1/M2 features unaffected** | ✅ Full suite **522/522**, `tsc` clean, `next build` clean |
| Service defaults applied | ✅ existing services → `category=Consultation, kind=clinical, version=1` |
| Clinic policy default | ✅ `billing_policy=postpaid` (today's behaviour) |

## 6. Rollback Verification (exercised, not just written)

Ran the full cycle on the dev DB:

```
Apply migration → Backfill
   BEFORE: 13 invoices (₹8,300) · 9 payments (₹6,200) · 14 lines
→ ROLLBACK (drop Invoice_Lines, Service_Events; drop 4 columns)
   Payments & Invoices untouched ✅ · invoices still printable ✅
→ REAPPLY forward migration
   schema restored · lines=0 (dropped)
→ Re-run backfill (idempotent)
   14 lines restored ✅
```

**PO refinement 9 proven:** rollback dropped only 3A-introduced structures and **never deleted or mutated Payments, Invoices (`items_json`), or audit history.** *(The one-shot rollback-verification script was removed after use — a table-dropping script shouldn't live in the repo; its evidence is captured above. The reusable, safe `prisma/backfill-invoice-lines-3a.ts` is retained.)*

## 7. Decision Log (new governance rule)

- Adopted **`ServiceEvent`** as the atomic clinical/financial fact (event-first).
- **`InvoiceLine` is the relational source of truth**; `items_json` is a generated, frozen print snapshot (single generator planned for C3).
- **Billing policy remains inactive** — `Clinic.billing_policy` added, default `postpaid`; the engine does not read or act on it in C1.
- **No legacy data rewritten** — historical invoices gain derived lines (`origin=LegacyMigration`); their `items_json`, totals, and payments are untouched.
- **No appointment-workflow / status-machine changes.**
- **Invoice 1:1 relaxation deferred to C3** (coupled to service/UI consumers + the billing engine) — a deliberate scope-integrity call, not an omission.
- **`Service.category/kind` carry migration-safety defaults** (`Consultation`/`clinical`); explicit values become mandatory at the service layer in C2, and existing services are reclassifiable via the `needs_catalog_review` path.
- **Domain enums** (`service-catalog`, `service-event-status`, `billing-policy`) mirror the existing status-machine pattern — one source of truth, no free-form strings.

---

## Verdict & next step

**Checkpoint 1 is complete and passes every acceptance criterion**, with zero user-visible change and a foundation that is fully reversible. **Stopping here for Product Office review.** With approval, **Checkpoint 2 (Service Layer)** is next: the domain-backed `service-event-service` (add/remove/finalize/reverse with permission-by-kind), `setBillingPolicy` (audited), and their unit tests — still no billing-engine wiring, still no UI.
