# BRD-043 — Release Roadmap

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). The complete execution path from today (Engineering Planning complete) through Launch.

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 0 — Product Office (COMPLETE)                                  │
│   BRD-043 frozen → Technical Feasibility approved →                  │
│   HTML Prototype approved (v1.1, pre-freeze refinement) →            │
│   Engineering Planning (this document set)                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1 — Sprint 1: Foundation                                        │
│   membership_status · Invitation.expires_at · rate limiting ·         │
│   P0 single-doctor-assumption fix · Organization plan schema          │
│   No user-visible change. Full regression must stay green.            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2 — Sprint 2: Invitation System                                 │
│   Invite form → live validation → WhatsApp/copy-link →                │
│   acceptance flow → seat-limit guard, all in the same release         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3 — Sprint 3: Adaptive Dashboard                                 │
│   4 role-keyed layouts, financial-exclusion contract-tested            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4 — Sprint 4: Team Membership Lifecycle                          │
│   Member cards · growth indicator · suspend/reactivate ·               │
│   reconciliation-gated archive                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5 — Sprint 5: Plan, Upgrade & Settings IA                        │
│   3-tier Plan screen · request-upgrade · admin-side toggle ·           │
│   Settings regroup (Practice/Team/Plan)                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 6 — System Integration                                          │
│   All 5 sprints' work integrated on one branch/environment.           │
│   Cross-feature checks: invite → team → dashboard → archive →         │
│   plan, executed as one continuous flow, not siloed per-sprint.       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 7 — Regression Testing                                          │
│   Full existing suite (385+ baseline, growing with this initiative's  │
│   own tests) + every contract/security test from Sprints 1-5 run as   │
│   one consolidated pass. Zero tolerance for regressions in the        │
│   shipped P1-P6 solo-clinic surface.                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 8 — UAT (Product Office)                                        │
│   Full Product Verification Guide executed independently by           │
│   Product Office against staging. Every P0 item must resolve          │
│   before proceeding.                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 9 — Release Candidate (Sprint 6)                                │
│   No new stories. Founder Demo Guide executed start to finish         │
│   with zero deviation from the approved prototype. Final sign-off.    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 10 — Marketing Website Refresh                                  │
│   Update public-facing marketing (/platform, /pricing) to reflect     │
│   Team Management + Professional tier as real, live capabilities —    │
│   not before RC sign-off, so marketing never advertises unshipped     │
│   functionality. Owned by the marketing/growth track, not this        │
│   engineering plan's sprints — sequenced here only for dependency     │
│   ordering (must not go live before Phase 9 completes).               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 11 — Launch                                                     │
│   Production rollout. Feature-flagged if the release process          │
│   supports it (recommended, though not mandated by any BRD-043        │
│   decision — an Engineering Manager call at deployment time).         │
└─────────────────────────────────────────────────────────────────────┘
```

## Governing constraints carried through every phase (do not revisit)

Restated from the Product Office's frozen Engineering Principles — every phase above operates inside these, and no phase is where they get renegotiated:

One adaptive application, no workspace switching · exactly three roles (Owner, Doctor, Receptionist) · Solo-first philosophy · adaptive navigation · clinic owns patients, doctor owns clinical notes · Active→Suspended→Archived lifecycle · archive requires reassignment before completion · WhatsApp/Copy-Link invitation only · administrative subscription management only · no custom permissions · no multi-clinic · no enterprise RBAC · no billing gateway.

## What ends this phase

Per the governing instruction: **this Engineering Planning phase ends only once all documents in this set are completed and approved.** That is now true — this roadmap is the last of the 12 requested deliverables. Nothing in Phases 1–11 above should begin until Product Office has reviewed and approved this full planning package, exactly as Phase 0 required for the prototype before this planning work began.

## Document set index

1. [EEP-043 Engineering Execution Plan](./eep-043-engineering-execution-plan.md) — master document
2. [Epic Breakdown](./brd-043-epics.md)
3. [User Story Catalogue](./brd-043-user-stories.md)
4. [Sprint Plan](./brd-043-sprint-plan.md)
5. [Readiness Matrices](./brd-043-readiness-matrices.md) (API · Database · Frontend · Backend)
6. [Sprint Completion Template](./brd-043-sprint-completion-template.md)
7. [Founder Demo Guide](./brd-043-founder-demo-guide.md)
8. [Product Verification Guide](./brd-043-product-verification-guide.md)
9. Release Roadmap — this document
10. [Screen Specifications](./brd-043-screen-specifications.md) (from the UX Freeze phase, referenced throughout as the design contract)
11. [Governance Addendum](./brd-043-governance-addendum.md) (feature flags, migration validation protocol, API versioning ADR-005, performance budget, observability plan — closed 2026-07-13 per the Engineering Director's pre-Sprint-1 review)
