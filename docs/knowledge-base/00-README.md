# Auriva Knowledge Base — Index

**Purpose:** this is the permanent, self-contained reference for Auriva — a Healthcare Operating System — written so that another AI (or a new human hire) can act as Product Office, Chief Product Officer, UX Director, or Solution Architect **without reading the codebase**. It assumes the reader has never seen Auriva before.

**Last updated:** 2026-07-19 (reflects PKG-1→6 frozen, Batch F in progress, Release Candidate pending go-live gates).

**Status of the underlying product:** Auriva Professional Edition is **feature-complete** for its planned scope. UX is **100% frozen** (UXS-043 Packages 1–6). Engineering health is strong (522 tests green, `tsc`/`next build` clean). The release is a **Release Candidate** — pending infrastructure go-live gates (production DB, backups, OTP/SMS provider, monitoring), not further feature work. See [17-roadmap.md](./17-roadmap.md) and [15-operations.md](./15-operations.md).

---

## How to use this knowledge base

1. **Start with [01-vision-and-strategy.md](./01-vision-and-strategy.md) and [02-product-constitution.md](./02-product-constitution.md)** — they set the non-negotiable frame every other file assumes.
2. **If you are asked "should we build X?"** — go to 01 (pillars + what Auriva is NOT), then 02 (constitution), then 18 (deferred register, to check if X was already considered and deferred on purpose).
3. **If you are asked about a specific screen or persona** — go to 03 (personas) → 04 (information architecture) → 06 (feature catalog, has the wireframe + regions + actions for every page).
4. **If you are asked about a business rule** ("can a doctor collect payment?", "what happens when an invite expires?") — go to 08-business-rules.md first; it is the exhaustive rulebook.
5. **If you are asked about data model or APIs** — 11-database-concepts.md and 12-api-concepts.md.
6. **If you are asked "what's next" or "why isn't X built"** — 17-roadmap.md and 18-deferred-features.md, in that order.
7. **Every file cross-links** to the others via relative markdown links — follow them rather than re-deriving facts.

## Authority chain (what governs what)

```
AGENTS.md (vision, six pillars, red flags — the constitution)
   │
   ▼
PRODUCT_BASELINE.md (PKG-1→6 is the FROZEN UX baseline — supreme over any other mockup)
   │
   ▼
docs/prototype/PKG-1..6-*.md + pkg-*.html (the frozen UX spec per surface, screen by screen)
   │
   ▼
docs/PRODUCT-HANDBOOK.md (condensed single reference: surfaces, demo world, glossary, component vocabulary, behaviour matrix)
   │
   ▼
docs/PKG-ALIGNMENT.md (screen-by-screen sign-off log — what shipped against each PKG row)
   │
   ▼
docs/RELEASE-CANDIDATE.md (deferred register, known limitations, go-live gates)
```

This knowledge base sits **alongside** that chain — it restates and expands it for a reader who has no repo access, but the documents above remain the primary source of truth if the two ever disagree. This KB was built by reading all of them plus the schema and core domain code on 2026-07-19.

## Section map

| # | File | Covers |
|---|---|---|
| 01 | [Vision & Strategy](./01-vision-and-strategy.md) | What Auriva is, six pillars, target customers, editions, architecture philosophy, what Auriva is NOT |
| 02 | [Product Constitution](./02-product-constitution.md) | The immutable, quotable principles governing every decision |
| 03 | [Personas](./03-personas.md) | Owner, Practice Manager, Doctor, Nurse, Reception, Technician, Patient — jobs, home routes, capabilities, demo credentials |
| 04 | [Information Architecture](./04-information-architecture.md) | Per-persona nav structure, ASCII site maps, journeys |
| 05 | [Complete Navigation](./05-complete-navigation.md) | Every route in `src/app/`, grouped by surface, with capability gates |
| 06 | [Feature Catalog](./06-feature-catalog.md) | Every page: purpose/features/actions/states + wireframe + screenshot placeholder; Feature Matrix table |
| 07 | [Workflow Library](./07-workflow-library.md) | Every end-to-end workflow, step by step, plus the 5 journeys |
| 08 | [Business Rules](./08-business-rules.md) | The exhaustive rulebook — status machines, identity, seats, isolation, money, queue aging |
| 09 | [UI Components](./09-ui-components.md) | Every shared/composite component, purpose, where used |
| 10 | [Design System](./10-design-system.md) | Tokens, typography, motion, honey/pine, dark mode, icons |
| 11 | [Database Concepts](./11-database-concepts.md) | Entities, relationships, ER diagram, nullability rules that matter to product |
| 12 | [API Concepts](./12-api-concepts.md) | The API surface by domain, conceptually |
| 13 | [Events](./13-events.md) | The Event Platform (OPS-001C) — what it is and is NOT |
| 14 | [Security](./14-security.md) | Auth, authorization, audit, isolation, rate limiting |
| 15 | [Operations](./15-operations.md) | Config, deployment, seeding, go-live gates, pilot assumptions |
| 16 | [Release Notes](./16-release-notes.md) | Dated changelog from Phase 0 through the PKG freeze |
| 17 | [Roadmap](./17-roadmap.md) | Near/mid/long term, known limitations |
| 18 | [Deferred Features](./18-deferred-features.md) | The complete Category-C deferred register |
| 19 | [Competitive Analysis](./19-competitive-analysis.md) | Auriva vs generic PMS/HIS/EMR/HRMS — positioning (labelled inference where speculative) |
| 20 | [Future Ideas](./20-future-ideas.md) | Speculative directions consistent with the six pillars — explicitly not commitments |

## Conventions used throughout this KB

- **"Deferred"** means a real product decision was made to *not* build something now — it is different from "not started." Always check 18 before assuming a gap is an oversight.
- **Screenshots:** no image capture was possible. Every key page in 06-feature-catalog.md instead carries an ASCII wireframe, a "Main regions" list, a "Key actions" list, and a literal placeholder line (`📸 Screenshot placeholder — route: …`).
- **Display language vs domain model:** Auriva deliberately uses different words for the same entity on different surfaces (e.g. `Appointment` = "visit" to a patient, "appointment" to reception, "consultation" to a doctor). This is documented, not a bug — see the glossary in [04](./04-information-architecture.md) and [08](./08-business-rules.md).
- **UNSURE markers:** where this KB had to infer something not explicitly stated in the source documents, it is flagged inline as `**[INFERRED]**` with the reasoning, so it can be verified against the live team.
