# 18 — Deferred Features

← [17 Roadmap](./17-roadmap.md) · [Index](./00-README.md) · Next: [19 Competitive Analysis](./19-competitive-analysis.md)

**Read this file before proposing any feature.** Every row here was a real product decision to *not* build something now — not an oversight. If a stakeholder asks "why doesn't Auriva do X," check here first; if X is listed, the answer is "considered and deliberately deferred, for this reason," not "nobody thought of it." Source: `docs/RELEASE-CANDIDATE.md` §3 (the complete Category-C register) plus the per-package deferrals logged in `docs/PKG-ALIGNMENT.md`.

## Complete Category-C Deferred Register

| Item | Why deferred | Persona / surface |
|---|---|---|
| **Self-service password reset** (SEC-4) | New workflow (email/token infrastructure); assisted (admin-initiated) reset from Team Management is retained as the interim path | Staff, all roles / PKG-1 Identity |
| **Grow Transition screen** | Lifecycle/first-run logic — the *functional* transition (solo → cockpit) already happens automatically via `resolveSurfacePath`; only the celebratory one-time UI moment is deferred | Owner / PKG-2 |
| **"Needs your attention" View/Resolve/Dismiss actions** | Per-item resolved/dismissed state isn't persisted yet — today it's a read-only-with-action-buttons surface built from existing snapshot tiles | Owner, Practice Manager / PKG-2 Command Center |
| **Patient Favourites / High-Risk / Follow-up-Due facets** | New persistence + classification logic beyond the existing 4-column table | Doctor / PKG-3 Patients |
| **Schedule "Requests" tab** | New workflow (patients requesting specific slots pending doctor approval) | Doctor / PKG-3 Schedule |
| **Consult Workbench "Suggested protocol" card** (AI one-tap fill of notes/diagnosis/prescription) | Category-C clinical decision-support — new capability **and** regulatory risk; reserved for a future clinical-intelligence release. What *is* built (the clinical-safety strip) is a factual, read-only summary of existing structured data only — never a suggestion engine | Doctor / PKG-3 Workbench |
| **Notify workflow, capacity thresholds** on the reception board | New operational feature — the awareness strip today is deliberately calm/informational only | Reception / PKG-4 |
| **Schedule editing / drag-drop / recurring / advanced planner** | New operational features beyond the existing week-view + availability model | Reception, Doctor / PKG-4/PKG-3 |
| **Front Desk Intelligence** (auto queue-balancing, wait-time prediction, patient SMS while waiting, overbooking warnings, suggested reassignment, reception KPIs, queue heat map, no-show prediction, auto room allocation) | Kept out to preserve operational simplicity — an entire future epic, not MVP | Reception / PKG-4 |
| **Seat re-check on role change** | New feature surface (re-validating seat usage mid-lifecycle when a role changes, not just at invite time) | Owner, Practice Manager / Batch D |
| **Nurse/Technician dedicated action surfaces** (vitals-capture UI, results-entry UI) | New feature surfaces — permissions (`vitals:write`, `diagnostics:results:write`) and the underlying data model already exist; only the dedicated screens are missing | Nurse, Technician / Batch D |
| **Multi-instance rate limiting** | Scale/cleanup item — currently in-memory/single-instance, correct for one server instance | Platform |
| **Brand-color tokenization** cleanup | Scale/cleanup item | Platform |
| **"After the Visit" moment** (a post-checkout "take medicine 5 days · follow-up in 7 · need help? call clinic" screen) | Future backlog — flagged as "one of the most memorable moments to add later," not built this release | Patient / PKG-5 |
| **Emergency Contact surfaced in You** | Noted during review (a safety consideration) but not included in the final five PKG-5 refinements — awaiting an explicit Product Office call | Patient / PKG-5 You |
| **Insurance** | Not a real workflow this release — no claims processing, no payer integration | Financial Operations / Patient, Owner |
| **Medication-adherence tracking** | Deferred clinical feature | Patient, Doctor |
| **Capacity/room alerts** | Deferred practice-operations feature (distinct from the calm awareness strip that *is* built) | Practice Operations |
| **Online payments** (patient-initiated, e.g. pay-before-visit or pay-from-app) | Deferred financial-operations feature — today all collection happens at the reception Desk | Patient, Financial Operations |
| **Multi-clinic patient experience** | A patient seeing history across more than one clinic in one unified view — out of scope even though the Organization→Clinic data model supports multiple branches | Patient |
| **Clinics tab / Plan tab** (Owner cockpit) | Shown honestly as disabled "Soon" nav items rather than hidden or faked | Owner |

## What "deferred" does NOT mean

- It does not mean "technically hard." Several deferred items (Nurse/Technician action surfaces, seat re-check) are described as needing only new **screens**, with the underlying data/permission model already in place.
- It does not mean "rejected forever." Several items (After the Visit, Grow Transition, teleconsultation-adjacent ideas) are explicitly framed as "future backlog" or "future epic," i.e. worth revisiting once there's a validated reason (pilot feedback, a specific customer request that clears the six-pillar test in [01](./01-vision-and-strategy.md)).
- It does not mean "nobody asked." Several were raised **during** the PKG review process itself and consciously deferred by Product Office in the same pass that approved everything else on that screen (e.g. the Emergency Contact note on PKG-5 You).

## Red-flag territory vs ordinary deferral — the distinction that matters

Everything above is an ordinary product-scoping deferral: a real, sometimes-desirable feature that didn't make this release's cut for a stated reason (new workflow, regulatory risk, scale-readiness, or simply not-yet-prioritized). This is different in kind from the **Red Flags** in [01-vision-and-strategy.md](./01-vision-and-strategy.md) (HRMS, payroll, attendance, recruitment, asset management, performance reviews, generic accounting/ERP, generic CRM) — those aren't "deferred," they are **structurally excluded** from what Auriva is trying to be at all, and drifting toward them requires an Architecture Review stop, not a deferral note.

## How to use this file in practice

When asked "should we build X":
1. Check this table. If X (or something close to it) is here, quote the exact reason it was deferred and which persona/surface it touches.
2. If X is genuinely new (not in this table and not a red flag), run it through the Feature Evaluation Checklist in [01-vision-and-strategy.md](./01-vision-and-strategy.md) before recommending it.
3. If X sounds like a red flag, stop and raise the Architecture Review warning rather than continuing (see [02-product-constitution.md](./02-product-constitution.md)).
