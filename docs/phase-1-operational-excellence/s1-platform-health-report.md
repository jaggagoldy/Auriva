# Phase S1 — Platform Health Report
### Auriva · Revenue & Visit Experience — Production Readiness (closure artifact)

## Platform Health — ✅ GREEN
| Signal | Status |
|---|---|
| Build (`next build`) | ✅ clean |
| Type check (`tsc`) | ✅ clean |
| Tests | ✅ **607 / 607** (70 files) |
| Lint | ✅ 0 new; only the accepted TD-15 `set-state-in-effect` baseline remains |
| Migrations | 17, all additive across M3A–B5 (no destructive statements) |
| Demo seed | ✅ reseeds cleanly |

## Tests & coverage
Integration-first against the real dev DB. The revenue/visit flows are covered at the service layer end-to-end: settlement (deterministic/idempotent/4-way reconcile), capture + permission-by-kind, checkout (grouped charges, concession, split/partial), documents (3 types, versioning, numbering), billing-policy gate (matrix + hard block), corrections (credit note/refund, immutability), and the **S1 unification verification** (completion is event-sourced via every entry point). Browser E2E remains the human QA pass (scripts in each checkpoint report).

## Performance (review, not rework)
- Checkout/gate/artifacts fetch on mount; server-truth after each mutation (no optimistic money). Acceptable at clinic scale.
- Minor: the checkout side-rail and completion overlay can each mount `ClinicalArtifacts` (a second `ensureVisitDocuments` call — idempotent, harmless). Candidate for a shared fetch later.
- Document generation is lazy + idempotent; snapshots are small JSON. No large-query hotspots found.

## Legacy removed (S1)
| Removed | Replaced by |
|---|---|
| `treatmentId` re-price path + `treatment_id` API param | ServiceEvent capture (B1) |
| `collectVisitPayment` + `/api/clinic/payment` route | `/api/clinic/checkout` |
| `PaymentStep` (stale comment) | Checkout Workspace |
| `InvoiceDetailDialog` edit/charge/discount + `/api/billing/invoices` `add_item` | Checkout Workspace (kept read-only inspector, temporary) |
| `billing-service.addInvoiceItem` + `setDraftInvoiceItems` | — (dead) |
| `/print/invoice`, `/print/visit-summary` | Document Platform |
| **`draftInvoiceForAppointment` fallback** | **Unified: consultation fee is always a ServiceEvent** |

**Kept (no replacement yet):** `/print/prescription` — Prescription is a reserved (not-built) Document type.

## Architecture status — three consolidated platform pillars
- **Clinical:** patients · appointments · consultation (shared capture on `/clinic` + `/doctor`) · clinical documents.
- **Revenue:** ServiceEvents → InvoiceLines → Invoices → Payments · Billing Policy gate · Corrections (immutable + compensating).
- **Workflow:** shared Checkout Workspace, Document Viewer/Renderer, Clinical Artifacts, Service Capture.

**Shared-component audit — no duplication found.** Consumers: CheckoutWorkspace (3), DocumentRenderer (2), ClinicalArtifacts (1), ServiceCapture (2). Single implementation each; the "parity by construction" strategy held.

**Terminology audit.** Consistent post-B2/B4, with one remnant: the `/staff` board header still reads *"Cash desk / Collect & close"* while the primary action and shared surface are now *Checkout*. One-line polish (deferred — audit only).

## Technical debt (tracked, not blocking)
- `/staff` board heading → align to "Checkout" language.
- `/doctor` consultation gate shows a plain block; could reuse the `/clinic` `ConsultationGateDialog`.
- `InvoiceDetailDialog` read-only inspector — retire after one stabilization cycle once nothing depends on it.
- Patient-timeline UI attachment for documents (data model already supports it).
- Concession/refund finer authority tiers (BRD-044); soft-override reason capture.
- `/print/prescription` retires when the Prescription document ships.
- TD-15 `set-state-in-effect` baseline (pre-existing) — periodic cleanup.

## Known risks
- Prepaid produces a separate consultation invoice (multi-invoice/visit) — engine supports it; reception UI shows one invoice at a time (by design).
- Browser E2E across `/clinic` `/doctor` `/staff` is the remaining human pass before pilot.

## Production readiness — ✅ READY (pending browser E2E sign-off)
The Revenue & Visit Experience is architecturally clean, legacy-free on the money path, fully event-sourced, and green on all automated gates.

## Recommended next capability
**Treatment Planning** (recommendations, procedure/package/session booking) — plugs into the Reception Workspace `NextAction` menu and the shared surfaces without redesign — **or** the **Communication Platform** (unlocks the deferred document delivery channels). Product Office to choose.

---
*Phase S1 closes Auriva Release 1.x — Revenue & Visit Experience: Product Office ✅ · Engineering ✅ · Architecture ✅.*
