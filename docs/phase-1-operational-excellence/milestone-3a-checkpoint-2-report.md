# Milestone 3A · Checkpoint 2 — Completion Report

**Scope executed:** Service layer — `service-event-service` (add/remove/finalize/reverse with permission-by-kind), `billing-policy-service` (deterministic resolution + audited setter), transition guards, unit + transition + integration tests. **Nothing else** — no billing-engine wiring, no invoice/settlement changes, no appointment-completion hooks, no multi-invoice, no UI, no checkout/payment, no 3B (the change freeze held).
**Result:** ✅ **PASS** — pure domain logic, zero user-visible change; every authorized acceptance criterion met.

---

## 1. What was built

| File | Role | Notes |
|---|---|---|
| `src/services/service-event-service.ts` | ServiceEvent lifecycle | `addServiceEvent`, `removeServiceEvent`, `finalizeServiceEvent`, `reverseServiceEvent`, `listServiceEventsForAppointment` + 5 typed error classes. **Touches only `Service_Events` (reads `Services`).** No invoice/payment/UI import. |
| `src/services/billing-policy-service.ts` | Billing-policy read/write | `resolveBillingPolicy` (pure, deterministic), `getBillingPolicy`, `setBillingPolicy` (audited, idempotent) + 2 typed error classes. |
| `src/domain/service-catalog.ts` | +`canActorAddKind(role, kind)` | Permission-by-kind predicate (pure). |
| `src/domain/service-event-status.ts` | +`isReasonRequiredForTransition(from, to)` | Reason gate (pure). |

**Purity confirmed:** neither service imports React, `next/*` UI, invoice/payment services, or print/checkout code. `service-event-service` never writes to `Invoices`, `Invoice_Lines`, or `Payments` — verified by inspection and by the tests (no invoice/payment rows are created by any service-event test).

## 2. Permission-by-kind (the core guard)

`doctor ⇒ clinical`, `reception ⇒ financial` — enforced in `addServiceEvent` via the pure `canActorAddKind`. Both directions tested, both allowed and both denied paths:

| Actor | clinical | financial |
|---|---|---|
| doctor | ✅ add | ❌ `ServiceEventPermissionError` |
| reception | ❌ `ServiceEventPermissionError` | ✅ add |

Catalog services are **snapshotted** (name / category / kind / unit_price / `service_version`); ad-hoc services (no `serviceId`) are allowed but flagged `needs_catalog_review = true` with `service_version = null`.

## 3. Transition matrix (PO-mandated, exhaustive)

Verified in `src/domain/service-event-status.test.ts` over **every** (from, to) pair, and end-to-end through the service:

| Transition | Expected | Result |
|---|---|---|
| Draft → Finalized | ✅ allow | ✅ |
| Draft → Removed | ✅ allow | ✅ |
| Draft → Reversed | ❌ reject | ✅ `InvalidServiceEventTransitionError` |
| Finalized → Reversed | ✅ allow (reason required) | ✅ |
| Finalized → Removed | ❌ reject | ✅ `InvalidServiceEventTransitionError` |
| Reversed → Finalized | ❌ reject | ✅ |
| any → itself | ❌ reject | ✅ |

**Reason gate:** a reversal with a blank/whitespace reason throws `ReasonRequiredError`; a valid reason is trimmed and stored in `reversal_reason`. No other transition requires a reason.

## 4. Billing policy — tested independently, deterministic

`resolveBillingPolicy` is pure and total (never throws):

| Input | Output |
|---|---|
| `prepaid` → `prepaid`, `postpaid` → `postpaid`, `hybrid` → `hybrid` | pass-through |
| `unknown` / `null` / `undefined` / `""` | **`postpaid`** (deterministic fallback) |

`setBillingPolicy` is the single audited choke point: validates via `isBillingPolicy`, writes `Clinic.billing_policy`, records `billing_policy_changed` (`"<from> → <to>"`) against the clinic's organization. **Idempotent** — an unchanged set is a no-op with **no second audit row**. Invalid policy and missing clinic throw typed errors and write nothing.

> **Scope note:** the policy is stored and audited only. **The billing engine still does not read or act on it** — activation (prepaid/hybrid settlement timing) remains 3B, exactly as in C1.

## 5. Test evidence

| Suite | Tests |
|---|---|
| `domain/service-event-status.test.ts` | full transition matrix + reason gate + removable |
| `domain/service-catalog.test.ts` | category/kind validators + permission-by-kind |
| `services/billing-policy-service.test.ts` | resolution determinism, audited setter, idempotency, invalid/missing |
| `services/service-event-service.test.ts` | permission both directions, snapshot, ad-hoc flag, lifecycle guards, list filtering |

- **New tests: +37.** Full suite **559/559** (was 522 at C1). `tsc` clean · new-file ESLint **0 warnings** · `next build` clean.
- Demo reseeded after the vitest run (`prisma/seed-demo-india.ts`).

## 6. Decision Log

- **Actor model is `{ userId, role: "doctor" | "reception" }`** passed explicitly to `addServiceEvent`. The service does not resolve sessions/RBAC itself — that belongs to the C3/3B caller. Keeps the service a pure lifecycle unit and trivially testable.
- **`transition()` is one private helper** for all three state changes (remove/finalize/reverse); each public function names its target status. One place owns the guard + reason check + timestamp stamping.
- **Ad-hoc is permitted, not blocked** — flagged `needs_catalog_review` (PO decision: ad-hoc allowed but flagged). Explicit-required catalog values remain deferred (see register).
- **`setBillingPolicy` no-op skips the audit** deliberately — an unchanged "save" is not an operational change and should not create audit noise.
- **`listServiceEventsForAppointment` returns draft + finalized only** (excludes removed/reversed) — the caller-facing "current charges" view; the billing engine (C3) will read finalized events specifically.
- **No `Encounter` coupling** — `encounter_id` stays an unset placeholder; events attach to `appointment_id`.

## 7. Architectural Debt Register

Carried forward (deliberately postponed, **not** forgotten):

| Deferred item | Reason | Lands in |
|---|---|---|
| Billing-engine wiring (`settleInvoiceFromEvents`, InvoiceLine generation) | Not in C2 scope; needs the 1:N relaxation | **C3** |
| Appointment → 1:N invoices (relax `@unique`) | Approved Variance (from C1) | **C3** |
| Appointment-completion hook → finalize events | Billing-engine wiring | **C3** |
| Billing-policy **activation** (prepaid/hybrid settlement timing) | Engine still does not read the policy | **3B** |
| Session/RBAC resolution of the actor | Caller's responsibility; service stays pure | **C3 / 3B** |
| `Service.category/kind` explicit-required at catalog write | Migration-safety defaults still stand; ad-hoc uses `needs_catalog_review` | **3B** |
| Adjustments (discounts), Credit Notes + refund Payments | Billing concepts, not ServiceEvents | **3B** |
| Reversal **UI** + reversal-authority rules | Function + guard built here; surface + who-may-reverse later | **3B** |
| Tax / GST activation | Nullable line fields exist; activation later | Post-3B |
| `Encounter` entity | `encounter_id` placeholder only | Future |

## Verdict & next step

**Checkpoint 2 is complete and passes every authorized acceptance criterion** — pure domain-backed service layer, permission-by-kind, the full transition matrix with a mandatory reversal reason, and independently-tested deterministic billing-policy resolution with an audited setter. Zero user-visible change; zero billing-engine/UI work. **Stopping here for Product Office review.** With approval, **Checkpoint 3 (Billing Engine)** is next: the 1:N relaxation, `settleInvoiceFromEvents` (finalize → InvoiceLine → frozen `items_json`), and the appointment-completion hook — still no 3B UI.
