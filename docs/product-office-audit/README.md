# Product Office Audit — Current Implementation

**Purpose:** a Product Office analysis of the **current, implemented** Auriva workflows — the input for the **Phase 1 Product Polish roadmap**. These documents describe *what exists today*; they **do not propose solutions** (per the Product Office instruction).

**Prepared as:** Lead Product Engineer analysis. **Verified against the code** (status machine, API routes, and every reception/doctor/patient/search component), cross-checked with the [Knowledge Base](../knowledge-base/00-README.md).

**Date:** current implementation as of the PKG-1→6 alignment (see [Release Notes](../knowledge-base/16-release-notes.md)).

## The documents

| # | Document | Covers |
|---|---|---|
| 1 | [End-to-End Operational Workflow](./01-end-to-end-operational-workflow.md) | Patient arrival → consultation → checkout → records; the status machine; every step's API, DB entities, status, rules; sequence + workflow diagrams |
| 2 | [Reception Workspace Deep Dive](./02-reception-workspace-deep-dive.md) | Navigation, board, calendar, Desk/billing, walk-in, patient search, doctor assignment, lab; limitations, pain points, missing capabilities |
| 3 | [Doctor Workflow Deep Dive](./03-doctor-workflow-deep-dive.md) | Login → completion; every page & action; business rules; transitions; limitations |
| 4 | [Patient Workflow Deep Dive](./04-patient-workflow-deep-dive.md) | Search, booking, doctor discovery, records, family, payments, notifications; limitations |
| 5 | [Search & Filtering Audit](./05-search-and-filtering-audit.md) | Every search/filter surface: fields, filters, sorting, backend support, UI limitations, gaps |

## How to read these

- **Diagrams** are Mermaid (state, sequence, flowchart) + ASCII wireframes.
- **"Limitation" ≠ "bug."** Many gaps are deliberate deferrals — the register lives in [Deferred Features](../knowledge-base/18-deferred-features.md) and [Technical Debt](../knowledge-base/25-technical-debt-register.md).
- Cross-references point into the Knowledge Base for the underlying rules/data model.

## Recurring themes surfaced by the audit (for the roadmap conversation)

1. **Search is name-centric, client-side, and today-scoped** — the identity-resolution backend (phone/health_id/name/dob) is richer than any single UI exposes; there is no global patient search on reception/doctor surfaces (Doc 5).
2. **Doctor assignment is fixed at creation** — no reassignment / queue transfer on the board (Doc 2).
3. **Calendar and board are separate** — "who's here now" vs "who's coming" is a nav switch (Doc 2).
4. **Clinical data lives on the Appointment "god table"** — free-text, no structured taxonomy (Docs 1, 3).
5. **No notification delivery exists** — reminders/results/confirmations never leave the app (Docs 3, 4).
6. **No pagination / sorting** anywhere — list UIs return full lists in fixed order (Doc 5).
7. **The cash cycle is closed but shallow** — invoice line-items minimal; Services/Treatments not wired into consult→invoice (Docs 1, 2).

*Next step (Product Office): use these findings to produce the Phase 1 roadmap — prioritized user stories, UX improvements, acceptance criteria, and sequencing. No engineering begins before that roadmap.*
