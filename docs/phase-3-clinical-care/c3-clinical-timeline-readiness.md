# C3 — Clinical Timeline — Engineering Readiness

> **Process v3.0 · Step 1.** Concise readiness for Product-Office approval. **No code until approved.**
> **Customer Promise:** *"See every patient interaction in one place."* · Phase 3 · Milestone C3 · ~1–2 sprints.
> **Operational question:** *"What has happened throughout this patient's care journey?"*

## Why now? (new PO rule)
- **Why needed now:** a patient's history is already produced but **scattered** — visits here, plans there, documents elsewhere, payments in a fourth place. A doctor reconstructs it manually before every consult. C3 unifies it into one longitudinal record.
- **Why before the next milestone:** C4 (Prescription) and C5 (Communication) both **surface through the Timeline** — prescriptions appear on it, communications/reminders anchor to its events. Building the Timeline first gives them a home instead of a bolt-on.
- **What capability it unlocks:** better clinical decision-making (full history at a glance) and the patient's "my health record."
- **What future milestone depends on it:** **C4 and C5** both become materially more valuable once the Timeline is the central place their outputs appear.

## Scope (IN)
- **Enrich the existing timeline** (`timeline-service` already emits appointment/prescription/lab/invoice/payment) with the artifacts C1/C2/B3 now produce: **Treatment Plans & sessions** (created, session attended/missed, plan completed/extended) and **Documents** (Visit Summary, Invoice, Receipt, Credit Note, Refund, Treatment Plan).
- **Deep-links:** every entry opens its artifact — a document → the Document Viewer/print; a plan → the plan; a payment → its receipt.
- **A first-class, filterable Timeline presentation** reused across the surfaces that already consume the timeline (`/doctor/patients/[id]`, `/staff/patients/[id]`, patient app Records) — grouped by date, filter by kind, newest first.
- **Performance:** one batched query plan (extend the existing `Promise.all`), never N+1.

## Out of scope (deferred)
- No **new source of truth** and **no editing from the Timeline** — it is read-only aggregation over existing data.
- **Analytics / reporting / trends** → Phase 4 (the Timeline is per-patient, not cross-patient KPIs).
- **Specialty-specific timeline items** (dental chart entries, physio measurements) → Phase 5 Specialty Extensions.
- **Communication events** on the timeline → land with **C5** (the Timeline is designed to accept them).

## Architecture
Pure **read-model / aggregation** — no new ledger, no new tables. C3 extends `timeline-service.getPatientTimeline` with two more batched sources (treatment plans/sessions, documents) and standardises an entry shape carrying a **`link`** (artifact reference) so any surface can deep-link. The Timeline **component** becomes the shared presentation. Mirrors the C2 discipline: enrich an existing capability, don't fork it.

## Database
**None** — read-only over existing tables (`Appointment`/events, `Prescription`, `LabOrder`, `Invoice`, `Payment`, `TreatmentPlan(Session)`, `Document`). No migration.

## Backend
- `timeline-service.ts`: add `treatment_plan` + `document` entry kinds; batch-query plans/sessions + documents by patient (2 added `Promise.all` branches — no N+1); add a `link` field (`{ kind, id }`) to entries for deep-linking; keep it clinic-scoped for staff and patient-scoped for the app.
- Reuse existing endpoints (`/api/patients/[id]/timeline`, patient records) — extend their payload, no new route.

## Frontend
- **Shared `ClinicalTimeline` component** — chronological, grouped by day, **kind filter chips** (Visits · Plans · Documents · Payments · Labs), each entry deep-linking to its artifact (opens the Document Viewer for documents; the plan panel for plans).
- **Mounted** into the surfaces that already show a timeline: `/doctor/patients/[id]` (pre-consult context), `/staff/patients/[id]`, and the **patient app Records** — replacing/upgrading the current per-event list.

## Risks
- **N+1 / performance** — the top risk (a timeline aggregates 6+ sources). Mitigation: one batched `Promise.all`, index-backed lookups, a sane default window/limit with "load older".
- **Volume** on long-history patients — mitigation: paginate/limit by default.
- **Presentation over live data** — low risk (no new writes); the only correctness concern is consistent ordering (single sort by timestamp).
- **Consumer breadth** — the timeline is consumed by 3+ surfaces; the shared component keeps them consistent (the parity pattern).

## Demo Story
> A returning patient arrives. The doctor opens their **Clinical Timeline** before the consult and sees, in one scroll: last visit + diagnosis, the **active Physio Plan at session 6/10**, the last **Invoice** and **Receipt**, and the **Visit Summary** document — each a tap away, no tab-switching. Filter to **Documents** → every artifact for this patient, newest first.

## Future behaviour (recorded per PO, not built)
- **Course Completion split** (PO note): surface *"Course Completed — awaiting doctor review"* — separating **operational completion** (all sessions attended) from **clinical completion** (doctor signs off). The Timeline is the natural place to show this; candidate for C3-surface / C4.

---
**STOP — awaiting Product Office approval of this readiness before implementation.** On approval I build the entire C3 milestone, then deliver the full Process v3.0 package (Completion Report · Demo · QA · Known Limitations · "What's New in C3" · Milestone Summary Card · Release Dashboard update) and stop for review.
