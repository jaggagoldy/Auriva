# 16 — Release Notes

← [15 Operations](./15-operations.md) · [Index](./00-README.md) · Next: [17 Roadmap](./17-roadmap.md)

A dated changelog synthesized from git history, `docs/DELIVERY-DASHBOARD.md`, `docs/PKG-ALIGNMENT.md`, and `docs/PRODUCT-HANDBOOK.md`. Dates below are commit-message-era labels (batch/sprint names), not calendar dates except where explicitly noted — this codebase's own docs date most milestones by batch/sprint identifier rather than by calendar day.

## Foundational product build (pre-APS-044) — ✅ Built

Before the Identity & Workspace platform work began, the "existing product" already included: clinic/doctor/reception/patient surfaces, billing, appointments, and audit — i.e. the core clinical/operational spine predates the RBAC/identity rework described below. The engineering narrative throughout this era: real follow-up appointments, reception booking/reschedule/cancel, a real "previous visits" / reachable patient timeline, billing line-items UI, browser-native print (Rx/visit-summary/invoice), patient Bills/Lab tabs, the Organization entity (multi-clinic, departments, fees), and the Event Platform (OPS-001C: publish/retry/DLQ/replay + audit hooks).

## Sprint-numbered feature work (BRD-043 Team Management, chronological)

| Sprint | Delivered |
|---|---|
| Sprint 1 (Foundation) | Schema + a P0 doctor-resolution fix |
| Sprint 2 (Invitation System) | US-201–205/503 — phone-first invites, seat cap |
| Sprint 3 (Adaptive Role-Driven Dashboard) | US-301–305 |
| Sprint 4 (Team Membership Lifecycle) | US-401–405 — atomic reconciliation-gated archive |
| Sprint 5 (Plan, Upgrade & Settings IA) | US-502/504/505/601 |

Result: BRD-043 **feature-complete**, one adaptive `/clinic` surface for all roles, ADR-004 (plan is read-only clinic-side).

## Phase 0 → Batch F (the Identity & Workspace platform build, in order)

| Phase/Batch | What shipped |
|---|---|
| **Phase 0** (APS-046 §4) | Repo cleanup + dormant additive columns (`must_change_password`, `password_set_at`, `last_workspace_id`, `active_membership_id`, the six-role union) — zero behavior change, groundwork only |
| **Batch A** | A1 mandatory password-change flow · A2 managed provisioning of staff accounts · A3 workspace session spine (active membership + switch) |
| **Batch B** | The keystone migration: relaxed `StaffProfile` 1:1 → 1:N; membership-scoped resolution across every call site |
| **Batch C** | C1 capability-driven surface resolver (`resolveSurface`) · C2 Workspace Selector + capability-driven landing · Identity Flow completion (mandatory password change wired end-to-end) |
| **Batch D** | D1 action-level permission model (frozen C2 matrix) · D2 activated `practice_manager`/`nurse`/`technician` onto their surfaces · D3 ownership & operational authority (legal vs operational) · D4 Professional Edition finalization — retired the old specialty-based role heuristic |
| 🎉 **Auriva Professional Edition** | Declared **FEATURE COMPLETE**: Identity · Workspace · RBAC · Ownership · Team Management |
| **Batch E** (Experience Polish & Consistency) | E1 shared resilience component library · E2 adoption across all five workspaces · E3 India-centric professional-edition demo seed (`seed-demo-india.ts`) |
| **Batch F** (Technical Hardening → Release Candidate Readiness) | F1 unified landing + India-first phone formatting · F3A PKG Alignment (below) · F3B-1 verification & quality audit · F3B-2 release docs |

## F3A — PKG Alignment (one package at a time, complete → review → freeze)

| Package | Result |
|---|---|
| F3A-PKG1 | Identity baseline frozen: shell rail + top-bar switcher, governance cleanup |
| F3A-PKG2 (+ revamp) | Owner experience alignment: cockpit nav + top bar + live team activity |
| F3A-PKG3 | Doctor experience alignment |
| F3A-PKG4 | Reception experience alignment |
| F3A-PKG5 | Patient experience alignment |
| F3A-PKG6 | Resilience & UX states alignment — **F3A COMPLETE**, all six packages 🔒 frozen |

**Per-package commit trail (most recent first, from `git log`):**
`feat(brd-043): Sprint 5 …` → `chore(phase-0)` → Batch A (A1/A2/A3) → Batch B → Batch C (C1/C2/M3) → Batch D (D1/D2/D3/D4) → `feat(batch-e)`: shared resilience library (E1), adoption (E2), India demo seed + close Batch E (E3) → `chore(batch-f)`: unified landing + India-first phones (F1) → F3A-PKG1..6 (freeze pass per package) → `F3B-1: Verification & quality audit` → PKG-3/4/5/6 experience rebuilds (Workbench tab honey accent + clinical-safety chips; front desk board 3 lanes + doctor-column calendar + Desk; one centered phone shell + Home/You alignment + duplicate-profile fix; reduced-motion + empty-state contract) → `refactor(brd-043): UXS-043 Phase-2 reconciliation — F2 owner switcher chip, F4 EmptyState` → `docs(brd-043): add Product Handbook`.

## UXS-043 — the frozen UX specification series

| Package | Frozen date | Score |
|---|---|---|
| PKG-1 Identity | 2026-07-14 | 9.7/10 |
| PKG-2 Owner | 2026-07-19 (per PKG-ALIGNMENT freeze log) | — |
| PKG-3 Doctor | 2026-07-14 | 9.7/10 (flagship) |
| PKG-4 Reception | 2026-07-14 | 9.8/10 |
| PKG-5 Patient | 2026-07-15 | 9.7/10 |
| PKG-6 Resilience | 2026-07-15 | 9.95/10 |

**UXS-043 Phase 1 (2026-07-15):** whole-of-product end-to-end review across five user journeys. Headline: strongly coherent, **no blockers**; the one real theme was a fractured demo world (three unrelated clinic/doctor/patient universes across the prototype packages) plus small shared-affordance/terminology reconciliations (F1–F8, see [07-workflow-library.md](./07-workflow-library.md) and the source document for the full findings register). Overall score 9.4/10 (demo-narrative-consistency was the only sub-9 category at 6.9).

**UXS-043 Phase 2 (2026-07-15):** consistency reconciliation producing four governed deliverables:
- **A — Canonical Demo World** (resolves F1): one org, clinics, doctor roster, patient set — re-skinned the prototype's P1/P3.
- **B — Global Product Glossary** (resolves F3): the three-layer vocabulary now baked into [04-information-architecture.md](./04-information-architecture.md).
- **C — Shared UI Behaviour Standard** (resolves F2/F8): the canonical component vocabulary in [09-ui-components.md](./09-ui-components.md).
- **D — UX Traceability Register** (resolves F4): interaction → component → business rule → spec reference.

**F2/F4 reconciled directly into real code** (not just the prototype) per the later commit `refactor(brd-043): UXS-043 Phase-2 reconciliation — F2 owner switcher chip, F4 EmptyState`.

## PKG-ALIGNMENT freeze log (screen-by-screen, all 🔒 as of 2026-07-19)

- **PKG-1:** Category A (password toggle, remember-me copy, trust line, footer relayout) + Category B (credential error moved to inline callout; patient-OTP action moved to footer) implemented; Category C (self-service password reset, SEC-4) confirmed **not built**, deferred.
- **PKG-2:** Solo hero (date + "Today" + solo banner), Command Center reordered to the frozen hierarchy, Team → "Your people." Category C approved-and-built: "Needs your attention" V1 (existing-data only, no new engine). Category C deferred: Grow Transition screen.
- **PKG-3:** "N min behind" indicator, honest Patients placeholder copy. Deferred: Patient facets (Favourites/High-Risk/Follow-up-Due), Schedule "Requests" tab.
- **PKG-4:** Board → "Today's flow," Desk → "Collect & close." Approved-and-built (existing-data only): the operational awareness strip. Built: reception Calendar (`/staff/calendar`, PO-approved new route, no new scheduling engine).
- **PKG-5:** Bottom nav, mobile-first hero, quick-action tiles all verified aligned. Small copy fix ("Quick access" → "Quick actions"). **No Category C** this pass.
- **PKG-6:** `OfflineBanner` mounted globally (was built but unmounted) with the PKG-6 copy; `ErrorState` given its 3-tier model. **No Category C.**

## Documentation milestone: the Product Handbook

`docs/PRODUCT-HANDBOOK.md` was published as the single governed condensed reference once PKG-1→6 were implemented and reconciled — it explicitly supersedes the scattered per-package notes for day-to-day use, anchored by `AGENTS.md`, `PRODUCT_BASELINE.md`, the prototype docs, and `docs/RELEASE-CANDIDATE.md`. This knowledge base (`docs/knowledge-base/`) extends that same chain one layer further, for a reader with no repository access at all.

## Where things stand today (recap, see [17-roadmap.md](./17-roadmap.md) for what's next)

Feature-complete for the planned Professional Edition scope; UX 100% frozen; Release Candidate status pending infrastructure go-live gates (production DB, backups, OTP/SMS provider, monitoring) — not further feature work.
