# M3B · B4 — Billing Policy Framework — Completion Report

**Result:** ✅ PASS. Billing policy (prepaid/postpaid/hybrid) is now **active** as a consultation-start gate — soft by default, hard configurable. **603/603** tests, tsc/lint/build clean.

## Completed work
**Backend**
- `Clinic.prepaid_hard_gate` (additive migration).
- `billing-policy-service`: `requiresPrepaidConsultation`, `getPolicySettings`, `setPrepaidHardGate` (audited), `evaluateConsultationGate(appointment)` → `{policy, required, satisfied, hardBlock, consultationFee, collected}` (satisfied = payments ≥ resolved consult fee).
- **Hard-block enforced in `transitionStatus(in_consultation)`** → covers every surface (/clinic, /doctor, API). `PrepaidGateError`.
- `checkout-service.prepareConsultationInvoice` — seed consult event + finalize + settle → invoice to collect up front (reuses B1/B2/B3 engine).
- APIs: `/api/clinic/billing-policy` (GET/PATCH), `/api/clinic/consultation-gate` (GET eval · POST prepare/override, override audited).

**Frontend**
- `BillingPolicySettings` card (Practice settings): choose policy + hard-gate toggle (audited setter).
- `ConsultationGateDialog` on `/clinic` start: postpaid/collected → straight through; else **Collect now** (prepare → Checkout Workspace → re-check) or **Start anyway** (audited soft override; hidden on hard gate).

## Tests
`consultation-gate.test.ts` (+7): policy matrix (postpaid inert / prepaid+hybrid required), hard-block throws at start + allows after payment, soft never blocks, postpaid never blocks, settings get/set + audit. Full suite **603/603**; 0 new lint.

## QA (reception `9876500005` → /staff · owner `9876500001` → /clinic)
1. /clinic → Settings → Practice → **Billing Policy** → set **Prepaid** (+ optional **Hard gate**). ⓢ
2. /clinic → Today → **Start** a visit → gate dialog "Collect consultation fee ₹X". ⓢ
3. **Collect now** → Checkout Workspace → pay → dialog closes → consultation opens. ⓢ
4. Soft (hard-gate off): **Start anyway** proceeds (audited). Hard-gate on: only **Collect now** (Start-anyway hidden; backend also blocks). ⓢ
5. Set back to **Postpaid** → Start opens the visit immediately (no gate). ⓢ

## Architecture changes
- Billing policy moves from *stored* (M3A) to *active* (gates consult start). No change to the settlement engine, checkout, or documents.
- Prepaid yields a consultation invoice separate from the services invoice — the 1:N-per-visit the engine already supports; each is checked out independently.

## Technical debt
- `/doctor` "Start Consultation" is hard-blocked backend-side but shows a plain error (no rich dialog) — the `/clinic` dialog UX could be shared later.
- Concession authority cap (BRD-044 D4) still open → policy/B5.
- Soft-override reason is optional (audited without a mandatory reason) — tighten if needed.

## Next checkpoint
**B5 — Financial Corrections Framework** (credit notes, refunds, immutable post-payment invoices) — opens with a concise Engineering Readiness.
