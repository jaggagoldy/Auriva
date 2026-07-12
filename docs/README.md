# Auriva — Documentation Index

The **single navigation entry point** for all Auriva documentation. Every
document below has a clear owner and purpose; historical material lives in
`docs/archive/` and `design/archive/`.

> **Governance order (who wins on conflict):** Founder → `AGENTS.md` → APS-039 →
> APS-030–038 → APS-040–042 → APP-001–003 → ADRs → Release documents → Sprint
> reports → Technical Debt → Engineering notes. See
> [governance-hierarchy.md](governance-hierarchy.md) for the full ruling.

> **Two APS numbering schemes coexist** (both authoritative in their era):
> Phase-1 planning used **APS-001–028**; the Release-1.2 Product Office uses
> **APS-030–039**. Where a Phase-1 doc's roadmap conflicts with APS-032+, the
> newer document wins.

---

## 1. Constitution & Guardrails (top of hierarchy)

- **`../AGENTS.md`** — engineering guardrails + six product pillars. **Wins on all conflicts.**
- **[aps-039-healthcare-os-foundation.md](aps-039-healthcare-os-foundation.md)** — APS-039, constitutional architecture (check every decision against it).
- **[auriva-product-constitution.md](auriva-product-constitution.md)** — long-form product principles/guardrails. *Subordinate to APS-039 and AGENTS.md.*

## 2. Product Office Governance (Release 1.2, frozen)

- [aps-030-experience-architecture.md](aps-030-experience-architecture.md) — APS-030
- [aps-031-design-system.md](aps-031-design-system.md) — APS-031 (design tokens SoT). Supporting parts: [screen-inventory-audit](aps-031-screen-inventory-audit.md) · [figma-organization-plan](aps-031-figma-organization-plan.md) · [design-review-package](aps-031-design-review-package.md)
- [auriva-platform-state-report.md](auriva-platform-state-report.md) — **APS-032** (Platform State Report; the roadmap reference point)
- [aps-033-planning-validation.md](aps-033-planning-validation.md) — APS-033
- [aps-034-product-positioning.md](aps-034-product-positioning.md) — APS-034
- [aps-035-execution-backlog.md](aps-035-execution-backlog.md) — APS-035
- [aps-036-release-management.md](aps-036-release-management.md) — APS-036 (implemented)
- [aps-037-engineering-validation-pack.md](aps-037-engineering-validation-pack.md) — APS-037
- [aps-038-engineering-execution-handbook.md](aps-038-engineering-execution-handbook.md) — APS-038

> **Missing from repo (referenced by the AEO-001 manual):** APS-040/041/042
> (Engineering Governance), APP-001/002/003 (Product Portfolio), and the
> "Sprint 2 Engineering Readiness Checklist" are named as frozen but have no
> file here. Tracked as a governance gap in
> [governance-hierarchy.md](governance-hierarchy.md).

## 3. Product Blueprint & Strategy

- [product-requirements.md](product-requirements.md) — **APS-016** executive PRD (Phase 1; roadmap portion superseded by APS-032/035)
- [auriva-customer-strategy.md](auriva-customer-strategy.md) — customer acquisition strategy (V1 accepted)

## 4. Architecture (living references — track current code)

- [domain-architecture.md](domain-architecture.md) — APS-013 (domain map)
- [event-architecture.md](event-architecture.md) — APS-018 (event platform)
- [workflow-architecture.md](workflow-architecture.md) — APS-019 (workflows)
- [architecture-audit.md](architecture-audit.md) — Sprint 1 audit (companion to the debt register)
- [org-workspace-ia.md](org-workspace-ia.md) — APS-014 · [org-workspace-ux-spec.md](org-workspace-ux-spec.md) — APS-015 · [enterprise-ux-standards.md](enterprise-ux-standards.md) — APS-017

## 5. Subsystem Operating Guides (living)

- [data-governance.md](data-governance.md) — validation, domain-rule ownership, integrity, config
- [observability-operations.md](observability-operations.md) — logging, audit, health checks
- [patient-communication-and-feedback.md](patient-communication-and-feedback.md) — notifications & feedback

## 6. Identity Platform

- [aps-029-identity-registration-platform.md](aps-029-identity-registration-platform.md) — APS-029 (Phases 1–4 built; 5–6 unbuilt)

## 7. Engineering Decisions (ADRs)

- [adr/README.md](adr/README.md) — process + index. Accepted: [0001](adr/0001-layered-architecture-and-invariants.md) layered architecture · [0002](adr/0002-batch1-auth-hardening.md) auth hardening · [0003](adr/0003-adaptive-workspace-capability-model.md) capability model · [0004](adr/0004-public-booking-surface.md) public booking.

## 8. Release & Sprint Records

- **Current:** [release-1.2-blueprint.md](release-1.2-blueprint.md) (authoritative Sprint 2+) · [release-1.2-execution-readiness-pack.md](release-1.2-execution-readiness-pack.md) (governance companion)
- **Frozen UX contract (Release 1.2 UX v1.0 — Sprint 3 implementation contract, changes need a POCR):** [solo-practice-experience-blueprint.md](solo-practice-experience-blueprint.md) — Solo-practice first-day UX. Prototypes: [`onboarding`](../design/solo-practice-onboarding-flow.html) · [`workspace`](../design/solo-practice-workspace-mockup.html). Acceptance criteria: [sprint-3-success-metrics.md](sprint-3-success-metrics.md).
- [release-1.2-sprint-2-report.md](release-1.2-sprint-2-report.md) — Sprint 2 (CERTIFIED WITH CONDITIONS)
- [release-1.2-stabilization-report.md](release-1.2-stabilization-report.md) — this stabilization phase
- [rc1-engineering-report.md](rc1-engineering-report.md) — **current** RC1 engineering push (2026-07-10): B4/B5 rehearsed for real, repo-wide readiness sweep, scores
- **MVP integration:** [mvp-integration-report.md](mvp-integration-report.md) — APS-028 (ticket IDs APS-040–058; **not** the manual's APS-040/041/042)
- Historical sprint/status reports → `archive/`

## 9. Engineering Baseline

- [technical-debt.md](technical-debt.md) — the debt register (single SoT for debt)
- APIs / DB / services → **source of truth is the code** (`src/`, `prisma/`)

## 10. Design (`../design/`)

- Current design system: `aps-031-*.html` (design-system, homepage, entry-experience, onboarding-activation, org-workspace, doctor-patient-review, trust-security)
- Phase-1 design track: `aps-003`–`aps-008`, `aps-012-business-architecture.html`
- Workspace mockups: `doctor-workspace-blueprint.html`, `doctor-workspace-hifi-mockup.html`, `org-workspace-hifi-mockup.html`, `patient-doctor-flow-mockup.html`, `patient-workspace-excellence-review.html`
- `auriva-design-system.html` — APS-002 predecessor, **superseded by APS-031** (kept for the precedence reference; marked historical in APS-030/031)
- Point-in-time snapshots → `design/archive/`

---

## Archive

`docs/archive/` — HANDOFF.md, sprint-2-audit-and-plan.md, session logs,
Release 1.1 sprint reports, Release 1.2 Sprint 1 report + packet,
ops-001-status-report.md, single_practitioner_analysis.md.
`design/archive/` — live-build-screens snapshot, phase-1-technical-summary.html.

Archived documents are retained for provenance and are **not** current sources
of truth. Prose references to `docs/HANDOFF.md` in older governance documents
now resolve to `docs/archive/HANDOFF.md`.
