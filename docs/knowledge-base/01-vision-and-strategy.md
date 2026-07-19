# 01 — Vision & Strategy

← [Index](./00-README.md) · Next: [02 Product Constitution](./02-product-constitution.md)

## What Auriva is

**Auriva is a Healthcare Operating System.** Its mission: help healthcare organizations deliver better care while running efficient, profitable practices.

That framing is deliberate and narrow. Auriva is not trying to be everything a clinic touches — it is trying to be the **operating system for the clinical and business workflows that are unique to running a healthcare practice.** Adjacent problems (payroll, generic accounting, recruitment) are explicitly left to other, already-mature software, and Auriva integrates with them rather than rebuilding them.

## What Auriva is explicitly NOT

Source: `AGENTS.md` (the permanent guardrails document every model must read before writing code).

| Not this | Why it's excluded |
|---|---|
| An HRMS | Practice Operations (pillar 2) explicitly excludes payroll/attendance/performance reviews |
| A generic ERP | Would dilute focus from healthcare-specific workflows |
| A hospital management system trying to do everything | Auriva targets independent and multi-doctor clinics, not full hospital systems |
| A payroll system | Not a healthcare workflow — better served by dedicated payroll software |
| A recruitment platform | Same reasoning |
| An accounting system | Auriva has a cash ledger (Invoice/Payment) for the clinic's own billing, but is not a bookkeeping/GST/accounting product |

**Red flags — Architecture Review required if implementation drifts toward:** HRMS features, payroll, attendance tracking, recruitment, asset management, employee performance reviews, accounting/ERP, generic CRM. Any of these must **stop implementation immediately** and raise a warning before continuing — this is a standing instruction to every AI model working on this codebase.

## The Six Product Pillars

Every feature must strengthen at least one of these. If a proposed feature doesn't, it should be challenged before implementation — this is not a formality, it is how Auriva stays a healthcare product rather than accreting generic SaaS features.

| # | Pillar | Examples (from AGENTS.md) | What's actually built (cross-reference) |
|---|---|---|---|
| 1 | **Clinical Excellence** | Appointments, Queue, Consultation, EMR, Prescriptions, Clinical Timeline, Follow-up | Consult Workbench, prescription editor, clinical safety strip, patient Records timeline — see [06](./06-feature-catalog.md) |
| 2 | **Practice Operations** | Doctor Availability, Clinic Operational Calendar, Room Scheduling, Appointment Capacity, Operational Alerts | Doctor Availability + time blocks, reception Calendar, awareness strip — explicitly **excludes** payroll/attendance/performance reviews |
| 3 | **Financial Operations** | Billing, Payments, Insurance, Revenue, Packages, Invoices, Settlement | Invoice/Payment lifecycle, Desk (Collect & close), Command Center revenue tiles. Insurance is deferred (see [18](./18-deferred-features.md)) |
| 4 | **Patient Engagement** | Patient Portal, Online Booking, Digital Forms, Teleconsultation, Communication, Feedback | `/patient` mobile-first app (Home/Book/Records/Family/You), public booking (`/book`, `/find-care`), Reviews. Teleconsultation is a future idea (see [20](./20-future-ideas.md)), not built |
| 5 | **Organization Intelligence** | Command Center, Reports, Analytics, Operational KPIs, Doctor Productivity, Clinic Performance | Owner Command Center (Practice Health → Needs attention → Quick actions → At-a-glance → On the floor → Activity) |
| 6 | **Platform Foundation** | Identity, Authorization, Event Platform, Audit, APIs, Integration Framework, Notifications | Six-role RBAC, capability model, Event Platform (OPS-001C — publish/retry/DLQ, **not** user notifications), Audit trail, session/workspace model |

## Target customers

- **Primary:** independent clinics and small multi-doctor practices, **India-first** (phone-first login, ₹ currency, `Asia/Kolkata` timezone default, UPI as a first-class payment method, health_id format tuned for India).
- **Growth path:** solo practice → small team → multi-clinic group, all on the **same product**, with complexity revealed only as a team forms (no forced migration — see the "solo → cockpit" auto-transition in [08](./08-business-rules.md)).
- The canonical demo world (`Sunrise Health Network`, Pune) models a **multi-specialty, multi-doctor, single-clinic-today** organization — six doctors across specialties, three receptionists, a nurse, a technician, an owner, and a practice manager. See [03-personas.md](./03-personas.md) for full credentials.

## Supported practice types

- **Solo practice** — a single owner-doctor who is also the front desk. Runs everything from one consolidated `/clinic` surface (see PKG-2).
- **Multi-doctor / multi-specialty clinic** — the demo world's shape: six doctors (Cardiologist, General Physician, Dermatologist, Pediatrician, Orthopedician, Gynecologist) on one clinic, with dedicated reception, nursing, and diagnostics staff.
- **Multi-clinic group (Organization → many Clinics)** — the `Organization` entity supports multiple `Clinic` branches with departments; a staff member can in principle hold multiple `StaffProfile` memberships (one per clinic) since the Batch B schema relaxation (1:1 → 1:N). Multi-clinic **patient** experience (a patient seeing their history across clinics in one place) remains out of scope for this release.
- Demo data references dental, physiotherapy, and general/multi-specialty practice types across different design-reference documents (the *prototype* casting used SmileCare Dental / HSR Family Clinic / Sunrise Physio as three branches of one org); the **implemented** demo world is the India-centric multi-specialty single clinic described above — see the Product Handbook §3 for the canonical/implemented distinction.

## Editions

| Edition | Status |
|---|---|
| **Auriva Professional Edition** | The **approved and implemented** scope for this release. Everything in this KB describes Professional Edition unless stated otherwise. |
| Solo | Not a separate edition/SKU — a **plan** (`Organization.plan = "solo"`) with a 2-seat cap (1 doctor + 1 receptionist beyond the free owner) that shares the same codebase and the same consolidated `/clinic` surface. See [08](./08-business-rules.md) seat model. |
| Enterprise | Modelled in the plan enum (`Plan = "enterprise"`) as unbounded seats, but **not a real tier this release** — UI-only "Coming soon." |

## Architecture philosophy

Four structural ideas run through the whole platform and explain almost every design decision elsewhere in this KB:

1. **Surfaces are workflow containers, gated by CAPABILITIES, not roles.** `/doctor`, `/staff`, `/admin`, `/clinic`, `/patient` are not "one screen per role" — they are shared containers that different roles can share when their capabilities overlap. A Nurse opens `/doctor` alongside the Doctor; a Technician opens `/staff` alongside Reception — the surface is the same, but the **C2 permission model** (not the surface) decides what each role may actually do there. See `resolveSurfacePath()` in [08-business-rules.md](./08-business-rules.md).
2. **One credential → many workspaces.** A single `User` account can hold multiple `StaffProfile` memberships (one per clinic). Login resolves to a *Workspace Selector* when there are 2+ memberships, and to the right surface automatically when there is only one. Switching workspaces re-scopes all content — this is the APS-044/045 Identity & Workspace platform.
3. **The status machine is the connective tissue.** A single `Appointment.status` state machine (`scheduled → checked_in → waiting → doctor_ready → in_consultation → completed`, plus `skipped`/`no_show`/`cancelled`) is what patient, reception, and doctor surfaces all read and write. Every hand-off between personas is a status transition with exactly one visible owner at a time (see the Workflow Ownership Continuity audit in [07](./07-workflow-library.md)).
4. **Two tones, by design.** Staff surfaces say *"Let's work"* (efficient, **pine** primary color, desktop left-rail nav). The patient surface says *"You're being taken care of"* (reassuring, **honey** primary color, mobile-first bottom-tab nav). This is the brand's core emotional differentiator — documented explicitly as a rule never to "fix" or unify (see [10-design-system.md](./10-design-system.md)).

## Product vision (synthesis)

Auriva's bet is that most healthcare practice software fails by trying to be a generic ERP with a clinical veneer, or a pure EMR with no operational muscle. Auriva instead builds **one coherent system where the appointment lifecycle is the spine** — booking, queueing, consulting, billing, and patient record-keeping are all views onto the same underlying facts, not separate modules bolted together. The six pillars are the boundary of that ambition: clinical work, the practice's own operations, its money, its patients' experience, its own self-awareness (analytics), and the platform plumbing that makes all of the above trustworthy and extensible.

## What Auriva intentionally does NOT do (recap, exhaustive)

- No payroll, attendance tracking, or HR performance reviews (pillar 2 boundary).
- No general ledger / GST accounting — only the clinic's own cash ledger (Invoice/Payment) for services rendered.
- No recruitment or staffing marketplace.
- No asset management (equipment inventory, maintenance schedules).
- No generic CRM (marketing campaigns, lead scoring, generic pipelines) — patient engagement stays healthcare-specific (booking, records, communication about care).
- No insurance claims processing (deferred, Category C — see [18](./18-deferred-features.md)).
- No AI clinical decision support in this release (the "Suggested protocol" one-tap fill was explicitly deferred as a future clinical-intelligence release, given regulatory risk).
- No hospital-scale features (bed management, OT scheduling, pharmacy dispensing) — out of scope for the independent/multi-doctor clinic target.
