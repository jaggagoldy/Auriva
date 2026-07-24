# Milestone 3B · Checkpoint B1 — Doctor Service Capture — Completion Report

**Scope executed:** Clinical `ServiceEvent` capture inside the Consultation Workbench (doctor adds/removes/re-quantifies clinical services), the base-consultation seed, catalog + ad-hoc capture, permission-by-kind at the capture boundary, and Complete Visit integration through the M3A settlement engine.
**Result:** ✅ **PASS** — the first user-visible M3B checkpoint. **Not authorized, not touched:** Checkout, Receipt/Invoice UI, Discounts, Refunds, Credit Notes, Billing Policy, Timeline UI, Visit Summary UI, Document Engine, Patient App, and the `/doctor` consult surface (see §9 boundary).

---

## 1. What was built

### Backend
| File | Role |
|---|---|
| `src/services/service-capture-service.ts` (new) | Clinic-scoped capture orchestration: `openVisitCapture` (idempotent base-consultation seed + list), `addVisitClinicalService` (catalog or ad-hoc, clinical only), `setVisitServiceEventQty`, `removeVisitServiceEvent`, `listVisitServiceEvents`. Composes the pure M3A/M3B primitives; adds appointment clinic-scoping. |
| `src/app/api/clinic/service-events/route.ts` (new) | `GET` list · `POST {open\|add\|set_qty\|remove}`; every mutation returns the refreshed list. Auth via `requireStaffContext`; capture errors mapped locally (403/404/400). |
| `src/services/service-event-service.ts` | +`updateServiceEventQty(id, qty)` — draft-only, recomputes `amount` from snapshot `unit_price`. |
| `src/services/billing-service.ts` | Exported `resolveConsultationFee` (reused by the seed — one fee-resolution chain, no duplication). |

### Frontend (Consultation Workbench only — no new pages)
| Change | Detail |
|---|---|
| **New "Services" section** | Replaces the old single-select "Treatment & fee". Shows the visit's charges (consultation + captured clinical services), a running "To collect" total. |
| **Inline category picker** | `+ Procedure / + Injection / + Lab / + Therapy / + Consumable` → an **inline panel** (not a modal): catalog services of that category + an ad-hoc "custom" name/price row. |
| **Per-line controls** | Quantity stepper (− n +), amount, remove (×). "Custom" badge on ad-hoc lines. |
| **States** | Loading ("Loading services…"), empty ("No services added yet."), saving (controls disabled during a mutation), error (toast). |
| **Payload** | Stopped sending the legacy `treatment_id`; charges are captured ServiceEvents now, settled by the engine on Complete Visit. |

**Workflow shape (the PO's requirement):** `Chief complaint → Examination → Diagnosis → Prescription → Investigations → Follow-up → Services → Review & complete` — one continuous scroll, no "open billing / go back."

---

## 2. The load-bearing design decision — the consultation fee is now a ServiceEvent

The settlement engine's events-only path means that if a doctor captures a Procedure but the **consultation fee is not itself an event, it would be dropped**. So opening capture **seeds a base Consultation `ServiceEvent`** (priced by the existing `resolveConsultationFee` chain: doctor → department → clinic → default). Captured services stack on top; Complete Visit finalizes + settles them **all** through one path.

- This is the fee→event unification the **C3 debt register earmarked** and exactly what the BRD-044 mockup shows (Consultation as a line among services).
- **Backward compatible:** the seed happens only when capture is *opened in the workbench*. An appointment completed **without** capture (reception marks completed from the board, or `completeVisit` called directly) has no events → the unchanged legacy consultation-fee draft. Proven by the full suite staying green.

---

## 3. Permission model (enforced, tested)

- Capture actor role is **doctor** → `canActorAddKind("doctor","clinical")`. A **financial** catalog service is rejected (`ServiceEventPermissionError` → 403). Ad-hoc is forced `kind = clinical`.
- Reception financial charges, discounts, checkout, refunds — **not present in this surface** (later checkpoints).
- Every event carries `added_by_user_id` + `added_by_role = doctor`.

---

## 4. Test evidence

| Suite | Coverage |
|---|---|
| `service-capture-service.test.ts` (new, 9) | seed idempotency · catalog add (snapshot) · ad-hoc flagged · **financial rejected (permission)** · bad-price rejected · qty recompute · remove · **cross-clinic guard** · **capture → settlement includes consultation + service** |
| `service-event-service.test.ts` | +`updateServiceEventQty` covered via capture tests |

- **New tests: +9.** Full suite **580/580** (was 571 at M3A). `tsc` clean · new-file ESLint **0** · `next build` clean · demo reseeded.

---

## 5. Browser QA — step-by-step (please capture screenshots at ⓢ)

**Login:** `/login` → phone `9876500001` (Owner) or any doctor (e.g. `9876500003`) · password `password123`. Then navigate to **`/clinic`**.

> Reachability note: `/clinic` loads via `/api/clinic/dashboard` (works for every staff role). If today has no checked-in visit, book one from the same screen and check it in.

1. **/clinic → Today.** Find a checked-in patient → click **Start consultation**. ⓢ *(workbench opens)*
2. **Scroll to the new "Services" section.** Expect one line already present: **Consultation — Dr … · ₹<fee>**, and "To collect ₹<fee>". ⓢ
3. **Add a catalog service:** click **+ Procedure** (or + Injection/Lab/Therapy/Consumable). The inline picker opens. Click a catalog chip *or* type a custom name + price → **Add**. Expect a new line + updated total. ⓢ
4. **Change quantity:** use **+ / −** on a line. Amount and total update; − is disabled at qty 1. ⓢ
5. **Add an ad-hoc (custom) service:** + Procedure → type "Wound dressing" + ₹250 → Add. Expect the line with an amber **Custom** badge. ⓢ
6. **Remove a line:** click **×**. Line disappears, total recalculates. ⓢ
7. **Review & complete:** top-right → the review dialog shows the total → **Complete visit**. Expect the existing payment step to open with that total. ⓢ *(the invoice now has one line per captured service — verify amounts on the payment/print step)*
8. **Keyboard pass:** Tab through the Services section — add buttons, qty steppers, remove, and the custom name/price inputs are all focusable; Enter in the custom price field adds the service. ⓢ

**Negative checks:** (a) custom service with empty name or blank price → inline toast, nothing added. (b) two rapid adds → controls disable while saving (no double-submit).

---

## 6. Regression matrix (existing workflow must still work)

| Area | Expectation | Status |
|---|---|---|
| Chief complaint / Examination | Capture + persist into the encounter note | ✅ unchanged |
| Diagnosis chips | Add/remove, flow to record | ✅ unchanged |
| Prescription builder | Rows, templates, → `medicines_json` + printable Rx | ✅ unchanged |
| Investigations (recommend tests) | Selector → patient Health Vault | ✅ unchanged |
| Follow-up & advice | Options + advice text | ✅ unchanged |
| Clinical templates (SOAP) | Apply into fields | ✅ unchanged |
| Left context rail | Real allergies / meds / past visits; live vitals | ✅ unchanged |
| **Complete Visit** | Advances status, drafts/settles invoice, schedules follow-up | ✅ now settlement-aware; legacy fee path intact for non-capture completions |
| Payment step (checkout) | Opens with the visit total | ✅ untouched (out of scope) |
| Full automated suite | 580/580, tsc, lint, build | ✅ |

---

## 7. UX Consistency Review (the new mandatory gate — self-assessment)

| PO criterion | Result |
|---|---|
| Consistent with the Auriva design system | ✅ reuses `Section`, `Input`, `Button`, warm tokens (`honey-deep`, `primary`, `muted`), same radii/spacing as sibling sections |
| No visual regression in the Workbench | ✅ Services occupies the former "Treatment & fee" slot; layout/columns unchanged |
| Spacing, typography, responsive | ✅ same type scale; rows use `tabular-nums`; picker + custom row stack on mobile (`sm:` breakpoints), grid on desktop |
| Keyboard accessibility (add/remove) | ✅ all controls are real `<button>`/`<input>`; `aria-label`s on qty/remove/close; Enter submits custom |
| Clear empty state | ✅ "No services added yet." |
| Loading / saving / error states | ✅ spinner on load; controls disabled while saving; toast on error |
| No disruption to the primary consultation workflow | ✅ additive section; clinical fields, prescription, and Complete Visit unchanged |

**Themes:** light/dark both covered (amber "Custom" badge has a dark variant; everything else is token-based).

---

## 8. Architecture (this checkpoint)

```
Consultation Workbench (/clinic)
  Chief complaint → Examination → Diagnosis → Prescription → Investigations → Follow-up
        │
        ▼
  Services  ──POST /api/clinic/service-events──▶  service-capture-service
   (capture)      open → seed base Consultation (resolveConsultationFee)
                  add  → service-event-service.addServiceEvent (permission-by-kind)
                  set_qty / remove (draft only)
        │
        ▼
  Review & Complete Visit ──▶ appointment-service (status → completed)
        │                        └─▶ completeVisitInvoicing (M3A C3)
        ▼                              finalize drafts → settleInvoiceFromEvents
  Invoice (draft) + InvoiceLines + snapshot  ──▶  existing payment step
```

---

## 9. ⚠️ Scope boundary — a second consultation surface exists

There are **two** doctor consultation surfaces:
- **`/clinic` `consultation-workbench.tsx`** — the solo, all-in-one surface. **B1 delivered here.** ✅
- **`/doctor` `consult-workbench.tsx`** — the multi-clinic doctor-workspace surface (uses `PrescriptionEditor` + `onUpdateStatus`, a different completion path). **B1 did NOT touch it.** Its completions still work (no events → legacy consultation-fee draft, unchanged).

Per the checkpoint discipline ("one surface at a time keeps review possible"), B1 targeted the surface literally named *Consultation Workbench*. **PO decision needed:** should the `/doctor` surface receive the same Services capture — as a small **B1b** before B2, or folded into a later checkpoint? Flagged, not silently dropped.

---

## 10. Decision Log
- **Consultation fee = a seeded base ServiceEvent** (see §2). Central decision; backward compatible.
- **Capture returns the full list on every mutation** — the client renders from server truth (no optimistic drift on money).
- **Inline picker, not modal** — honors "no popup-heavy workflow."
- **Legacy "Treatment & fee" single-select removed** from the UI; the `treatment_id` API param remains (backward compatible) but is no longer sent.
- **Actor role = doctor** for this surface; permission-by-kind blocks financial capture here.
- **`/doctor` surface deferred** (§9) — a deliberate scope-integrity call for PO ruling.

## 11. Architectural Debt Register
| Deferred item | Reason | Lands in |
|---|---|---|
| `/doctor` `consult-workbench` Services capture | One surface per checkpoint (§9) | **B1b / later (PO)** |
| Legacy `treatment_id` re-price path in `completeVisit` | Superseded by capture; param left for back-compat, unused by the workbench | 3B cleanup |
| Reception **financial** charges at the desk | Reception surface (Checkout Workspace) | **B2** |
| Discounts / credit notes / refunds | Corrections | **B5** |
| Visit Summary / Receipt / Invoice documents | Document Engine | **B3** |
| Billing-policy gating (prepaid/hybrid) | Behavior change | **B4** |
| Ad-hoc → catalog reconciliation UI | `needs_catalog_review` flag set; admin tool later | 3B/admin |

## Verdict & next step
**Checkpoint B1 is complete and passes every authorized acceptance criterion**, with the higher UI quality bar met and the automated suite green (580/580). The doctor can capture a visit's clinical services in one continuous workflow, and Complete Visit settles them through the M3A engine. **Stopping here for Product Office review** — including the §9 boundary decision. No other M3B checkpoint is started. With approval, **B2 (Checkout Workspace)** is next.
