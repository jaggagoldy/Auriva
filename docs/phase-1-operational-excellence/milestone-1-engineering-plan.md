# Engineering Milestone 1 (Wave 1 · P0) — Engineering Plan

**Status:** PLAN — awaiting Product Office / Architecture approval. **No code written yet.**
**Scope (approved):** 2.1 Global Patient Search · 2.2 Health-ID Search · 1.2 Amount on Collect · 1.6 Outstanding Balance · 4.4 Context Flags (Returning / Allergy / Balance).
**Explicitly out of scope:** payment-timing policy, hybrid billing, inline checkout sheet, doctor reassignment, unified doctor picker, calendar merge, consultation services, SOAP templates, notifications, receipt delivery.

---

## 1. Current implementation (verified)

| Piece | Current state |
|---|---|
| **Command Palette** | `src/components/admin/command-palette.tsx` — ⌘K, searches `GET /api/patients?name=` only, results → `/staff/patients/[id]`. **Mounted only in `admin/layout.tsx`.** |
| **Patient search API** | `GET /api/patients?phone=&health_id=&name=&dob=` → `requireStaffContext(canManageAppointments)` (authed) → `resolveHealthcareProfile()`. **`resolveHealthcareProfile` is cross-org by design** (queries health_id / phone-contact / name+dob with **no clinic/org filter** — APS-029 identity is intentionally cross-tenant). |
| **Reception queue payload** | `queue-service.ts` `QUEUE_INCLUDE` projects `patient { id, full_name, blood_group, user_id }` — **no allergies, no balance, no visit history.** |
| **Collect button** | `queue-card.tsx` Done lane → "Collect" (no amount) → navigates `/staff/billing?patient=`. |
| **Billing** | `billing-service.ts` has `listInvoicesForPatient`, invoice `status` (draft/issued/paid/void), `total`, and `payments[]`. Balance = `total − Σpayments` for non-paid/non-void. |
| **Staff patient page** | `/staff/patients/[id]` → `PatientTimeline` (staff component). |
| **Doctor patient page** | **No `/doctor/patients/[id]`** — `/doctor/patients` is a list only. `/staff` is gated by the `reception`/`diagnostics` capability (a doctor usually lacks it). |

---

## 2. Plan by item

### 2.1 + 2.2 — Global Patient Search + Health-ID search
- **Approach:** generalize the existing Command Palette into a **shared** component and mount it on Reception + Doctor. Reuse the **existing** `/api/patients` endpoint — no new/duplicate search API. Add input-pattern detection: `AUR-…` → `?health_id=`, all-digits → `?phone=`, else → `?name=`.
- **Files to modify / add:**
  - Move/generalize `src/components/admin/command-palette.tsx` → `src/components/shared/command-palette.tsx` (accept `destinations` + patient-result target per surface). Keep a thin admin wrapper so admin behaviour is unchanged.
  - Mount in `src/app/staff/layout.tsx` and `src/app/doctor/layout.tsx` (admin already mounts it).
  - **[Decision B]** Doctor result target — see Risks.
- **APIs reused:** `GET /api/patients` (name/phone/health_id). **New APIs:** none (subject to the tenant-scoping decision, Risk A).
- **Keyboard nav:** already provided by `cmdk` (⌘K, arrows, Enter, Esc) — preserved.

### 1.2 — Amount on Collect  ·  1.6 — Outstanding Balance  ·  4.4 — Context Flags
These share **one data need**, so they're one server change + one client change.
- **Server:** enrich the reception queue payload (in `queue-service.ts` / `reception-service.ts`) with, per row:
  - `patient.allergies` (add to `QUEUE_INCLUDE` projection),
  - `is_returning` (or `prior_visit_count`) — a batched lookup of prior `completed` appointments per patient,
  - `patient_outstanding_balance` — Σ open-invoice balance for the patient (from billing data),
  - `invoice_balance` — the balance on **this** appointment's invoice (for the Collect amount).
  - All computed from the **same invoice source as billing** ("data must always match billing"); batched to avoid N+1.
- **Client:** `queue-card.tsx` renders:
  - Collect button → **"Collect ₹{invoice_balance}"** (or "Collected" if zero),
  - context chips → **Returning/New**, **⚠ Allergy** (if present), **₹X due** (if `patient_outstanding_balance > 0`) — using the shared `Badge` component; colour + icon + label (never colour alone).
- **Shared type:** add the new optional fields to the `Appointment` view type in `src/shared/queue.ts` (additive, backward-compatible).
- **No** business-rule / workflow / invoice-lifecycle change — **display only**.

---

## 3. Components affected

| Component | Change |
|---|---|
| `command-palette.tsx` → shared | Generalize; input-pattern detection; per-surface config |
| `staff/layout.tsx`, `doctor/layout.tsx` | Mount the shared palette |
| `queue-service.ts` (+`reception-service.ts`) | Enrich queue projection (allergies, returning, balances) |
| `queue-card.tsx` | Collect amount + context chips (shared `Badge`) |
| `shared/queue.ts` | Additive optional fields on the Appointment view type |
| (Risk B) `doctor/patients/[id]/page.tsx` | Possibly a new minimal timeline route |

## 4. New APIs
**None required** for the display items. Patient search **reuses `/api/patients`**. The only open question is whether search must be **org-scoped** (Risk A) — if so, it's an *additive filter on the existing endpoint/service*, not a new API.

## 5. Database changes
**None.** All new fields are computed/projected from existing tables (`PatientProfile.allergies`, `Appointment`, `Invoice`/`Payment`). No migration.

## 6. Risks & decisions (please confirm before code)

| # | Risk / Decision | Detail | Recommendation |
|---|---|---|---|
| **A** | **Tenant isolation on patient search** | `resolveHealthcareProfile` is **cross-org by design**; the existing admin palette already returns patients across tenants. The milestone requires "maintain tenant isolation." | **Scope the global staff search to the caller's org** (filter results to patients registered-by / with visits in the caller's org) — an *additive* scope in the search path, reusing the endpoint. **Needs your OK** since it slightly changes what the admin palette returns (tighter, safer). |
| **B** | **Doctor patient-result target** | No `/doctor/patients/[id]`; reusing `/staff/patients/[id]` is capability-blocked for doctors. | **Add a minimal `/doctor/patients/[id]`** timeline route reusing the existing timeline data/component (small, additive). Alternative: ship search on **Reception now**, Doctor next milestone. |
| **C** | **N+1 on queue enrichment** | Per-row balance/returning lookups could be N+1. | Batch the invoice/visit lookups by patient-id set (single query each). Pilot-scale safe; noted for review. |
| **D** | **"Returning" definition** | Is "returning" = any prior completed visit at this clinic, or org-wide? | Propose **prior completed visit at this clinic** (tenant-safe, matches reception's mental model). |

## 7. Estimated effort

| Item | Complexity | Est. |
|---|---|---|
| 2.1 + 2.2 (search: generalize palette, mount ×2, pattern detection, **scoping**) | Medium | ~2–3 days |
| 1.2 + 1.6 + 4.4 (queue enrichment + card chips) | Medium | ~2–3 days |
| Risk B (minimal doctor patient route, if approved) | Low | ~0.5 day |
| **Milestone 1 total** | **Medium** | **~1 week** |

## 8. Verification approach (per the standards)
After each logical section: `tsc --noEmit`, lint (no *new* errors over the accepted baseline), the vitest suite, and a manual no-regression check on the board + palette. **Stop on any regression.** Reseed demo after test runs.

## 9. Out-of-scope confirmation
No changes to: status machine, invoice lifecycle, payment workflow, booking, doctor assignment, calendar, services, templates, notifications. Backward compatibility preserved; all additions are additive/optional.

---

**Awaiting approval on Risks A–D (especially A tenant-scoping and B doctor target) before writing any code.**
