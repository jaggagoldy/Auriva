# Auriva — Release 1.x Master Roadmap
## v1.0 — FROZEN (governing document for the remainder of Release 1.x)

> **Planning document only. No code. No implementation specs.**
> Prepared as CPO / VP Engineering / Principal Architect / Healthcare Workflow Consultant / UX Director would jointly produce it. Grounded in the actual codebase as of Phase S1 closure (`a5993cd`) — every "done" claim is verifiable in `src/services/`, `prisma/schema.prisma`, and the M3A–S1 checkpoint reports.
> **v1.0 supersedes v0** (the initial draft) with Product Office strategic refinements: customer-value framing, demo stories, editions, success metrics, an explicit exclusion list, an expanded dashboard, and a business-growth narrative.

### Where this sits in Auriva's document hierarchy
```
docs/AURIVA-PRODUCT-BIBLE.md      "why Auriva exists" — vision, beliefs, the 6 pillars    (unchanged by this doc)
docs/PRODUCT-HANDBOOK.md          "how each surface behaves" — UX conventions, components (unchanged by this doc)
                │
                ▼
THIS DOCUMENT                     "what we build, in what order, and why a clinic pays for it"
                │
                ▼
Milestone Engineering Readiness   (Process v2.0, ≤2 pages, per milestone)
                │
                ▼
Sprint execution → Completion Report → Release Dashboard update (Part 11)
```
The Product Bible already carries Vision/Principles/Pillars; the Handbook already carries UX/component law. This roadmap deliberately does not duplicate either — it is the missing middle layer: sequencing, business justification, and tracking. A separate "Master Product Portfolio" document was considered and rejected as redundant — the three documents above already form that hierarchy without a fourth file to keep in sync.

---

## Part 1 — Current Platform Assessment

### Clinical Platform — ✅ Mature
**Built:** patient identity (`health_id`, family sharing, OTP auth), appointment lifecycle, consultation (shared component across `/clinic` and `/doctor` — B1b), Clinical Services capture, diagnosis/prescription/investigations, follow-up scheduling, clinical templates (SOAP), Visit Summary documents.
**Gaps:** no treatment planning, no procedure/session tracking, Prescription is still free-text print, no structured lab/diagnostics (deliberately narrow — recommend-and-refer, not lab ops).

### Revenue Platform — ✅ Mature
**Built:** `ServiceEvent → InvoiceLine → Invoice → Payment`, deterministic/idempotent settlement, billing policy (prepaid/postpaid/hybrid + gate), Checkout Workspace (grouped charges, Concession, split/partial, Reception Notes), Financial Corrections (Credit Notes + Refunds, immutable paid invoices). Full audit trail.
**Gaps:** no packages/memberships, no insurance/TPA, multi-invoice UI hidden by design, tax fields inactive.

### Document Platform — ✅ Foundation mature, narrow content
**Built:** `Document` model — immutable, versioned, categorized, unified numbering, one shared renderer, browser PDF. Live types: Invoice, Receipt, Visit Summary, Credit Note, Refund Receipt.
**Gaps:** Prescription, Medical Certificate, Referral, Lab/Radiology Request, Procedure Notes are reserved types — platform ready, content not built.

### Workflow Platform — ✅ Mature
**Built:** shared components used by construction across surfaces (audited zero-duplication in S1), 7-role RBAC + capability grants, audit log, event platform (publish/retry/DLQ/replay).
**Gaps:** the event platform has no consumer-facing product yet.

### Organization Platform — ✅ Mature
**Built:** real `Organization` entity, multi-clinic + departments, Team Management (invites/roles/seat caps/lifecycle), adaptive surfaces per role.
**Gaps:** none blocking; multi-clinic is real but under-exercised by live customers so far.

### Security / Identity Platform — ✅ Mature
**Built:** session auth (scrypt staff / OTP patient), per-membership status, "visibility exceeds authority," forced password reset, audit trail.
**Gaps:** none blocking.

### Notification Platform — ⚠️ Partial
**Built:** in-app patient notifications (create/list/read) are real. A phone-resolver stub exists for a future SMS channel.
**Not built:** any actual SMS/WhatsApp/Email delivery. **This is precisely what C5 closes.**

---

## Part 2 — Product Capability Map

| Domain | Capability | Grade | Note |
|---|---|---|---|
| Clinical Care | Treatment Planning | Core | Multi-visit care plans |
| Clinical Care | Procedure Management | Core | Session-based procedures — an application of Treatment Planning |
| Clinical Care | Prescription Management | Core | Structured medicine model |
| Clinical Care | Clinical Timeline | Core | Longitudinal patient record |
| Clinical Care | Lab & Diagnostics | Extend, narrow | Stays "recommend + track result," never lab operations |
| Clinical Care | Medical Certificates / Referrals | Core | New Document types — platform-ready now |
| Patient Engagement | Patient Communication | Core | Closes the Notification Platform gap |
| Patient Engagement | Appointment Automation | Core | Rides on Communication Platform |
| Patient Engagement | Patient Portal enhancements | Core | Timeline + Documents feed the existing app |
| Patient Engagement | Teleconsultation | Extend | Needs a real demand signal before new video infra |
| Financial Ops | Packages | Core | Reserved `Package` ServiceEvent category |
| Financial Ops | Memberships | Extend | Needs Packages first |
| Financial Ops | Insurance | Extend, narrow | Claims-adjacent fields, not a TPA platform |
| Financial Ops | Reports / Finance dashboards | Core | Reuses existing money data |
| Org Intelligence | Analytics | Core | Doctor productivity, clinic performance |
| Org Intelligence | Reports | Core | Operational KPIs |
| Platform Foundation | Staff Management | **Already built** | Team invites/roles/seats — not attendance/payroll |
| Platform Foundation | Administration / Settings | Core | Incremental, alongside every milestone |
| Platform Foundation | Inventory | **⚠️ Guardrail** | Consumables tied to a dispensing ServiceEvent only — never a warehouse/PO system |
| Platform Foundation | Marketing | **⚠️ Guardrail — excluded** | Not a pillar; borders on generic CRM. Reconsider only as a thin referral-link feature if real demand appears |
| Platform Foundation | Enterprise / multi-org tooling | Extend | After a real multi-clinic customer exercises what exists |

---

## Part 3 — What We Are NOT Building (Phase 3)

Frozen exclusion list — protects scope as the product grows. Revisit only via an explicit Product Office decision, never by accretion.

❌ Hospital EMR (full inpatient/ward/bed management)
❌ Pharmacy ERP (procurement, supplier management, stock reconciliation)
❌ Warehouse Inventory (generic multi-location stock/PO system)
❌ Payroll
❌ Accounting Software (general ledger, tax filing, reconciliation beyond clinic billing)
❌ CRM (generic contact/lead/deal pipeline)
❌ Marketing Automation (campaigns, email blasts, ad attribution)
❌ HRMS (attendance, performance reviews, recruitment)
❌ Lab Operations (equipment, LIS integration, sample chain-of-custody)
❌ Insurance Claims Processing (full TPA adjudication workflow)

Every one of these is a red flag per `AGENTS.md`. If a future request pushes toward any of them, the answer is an Architecture Review, not a feature branch.

---

## Part 4 — Prioritization

| Capability | Business Value | Customer Value | Revenue Impact | Differentiation | Complexity (5=easy) | Dependencies | **Score** |
|---|---|---|---|---|---|---|---|
| **Treatment Planning** | 5 | 5 | 4 | 5 | 3 | ServiceEvent, Checkout | **22** |
| **Procedure Management** | 5 | 5 | 4 | 4 | 2 | Treatment Planning | **20** |
| **Communication Platform** | 5 | 5 | 3 | 4 | 2 | Notification-service, vendor | **19** |
| **Prescription Platform** | 4 | 5 | 2 | 3 | 4 | Document Platform | **18** |
| Packages | 4 | 3 | 5 | 3 | 3 | Treatment Planning | 18 |
| **Clinical Timeline** | 4 | 4 | 2 | 3 | 4 | Timeline-service (exists) | **17** |
| Memberships | 3 | 3 | 4 | 3 | 2 | Packages | 15 |
| Medical Certs / Referrals | 3 | 3 | 1 | 2 | 5 | Document Platform (ready) | 14 |
| Insurance (narrow) | 3 | 3 | 3 | 3 | 2 | Corrections Framework | 14 |
| Analytics / Reports | 3 | 2 | 2 | 3 | 3 | — | 13 |
| Teleconsultation | 2 | 3 | 2 | 4 | 1 | New video infra | 12 |

---

## Part 5 — Editions (Solo / Professional / Enterprise)

Pricing is not finalized; this shows the *shape* editions should take so Phase 3 is built toward genuine differentiation, not a single flat product.

| Capability | Solo | Professional | Enterprise |
|---|:---:|:---:|:---:|
| Treatment Planning | ✅ | ✅ | ✅ |
| Procedure Management | ⚪ | ✅ | ✅ |
| Clinical Timeline | ✅ (single clinic) | ✅ | ✅ (cross-clinic) |
| Prescription Platform | ✅ | ✅ | ✅ |
| Communication | Basic (SMS reminders) | Advanced (SMS+WhatsApp) | Enterprise (all channels + templates) |
| Packages | ⚪ | ✅ | ✅ |
| Memberships | ⚪ | ⚪ | ✅ |
| Analytics | Basic (own clinic) | Advanced (own clinic, trends) | Full (multi-clinic roll-up) |
| Multi-clinic | ⚪ | ⚪ | ✅ |

*(This mirrors the existing `Organization.plan` field — `solo`/`professional`/`enterprise` — already in the schema from BRD-043; Phase 3 capabilities should gate on it the same way seat caps do today.)*

---

## Part 6 — Milestone Planning (Phase 3: Clinical Care)

### C1 — Treatment Planning
**Customer Promise:** *"Never lose a follow-up treatment again."*
**Before → After:**
> **Before:** Doctor says "come back in 10 days for the next session." Nothing tracked. Patient forgets. Revenue leaks.
> **After:** A Treatment Plan is created. Reception books the follow-up before the patient leaves the desk. Patient sees their plan progress. The clinic keeps the revenue.

**Demo story:** *Patient with knee pain → doctor diagnoses → creates an 8-session Physio Plan → reception books session 1 before the patient leaves → patient receives a printed plan.*

**Objective:** doctors move from "diagnose + prescribe" to "diagnose + plan a course of care"; reception can sell/schedule that plan.
**Business outcome:** captures multi-visit revenue at the point of clinical decision.
**Personas:** Doctor (creates), Reception (books/sells), Patient (sees "my plan").
**Sprints:** 2. **Dependencies:** ServiceEvent, Checkout Workspace, Document Platform.
**Risks:** scope creep toward generic project management — a Plan is a sequence of ServiceEvents with a cadence, never a Kanban board.
**Success metrics:** Treatment Plans created/week · follow-up booking rate · multi-session conversion rate · missed-follow-up rate · average plan completion %.

### C2 — Procedure Management
**Customer Promise:** *"Track every therapy and procedure effortlessly."*
**Before → After:**
> **Before:** A 10-session course is 10 separate, disconnected appointments. No one sees session 4 of 10 was missed until the patient has quietly dropped off.
> **After:** Session progress is visible at a glance; a missed session surfaces to reception the same day for follow-up.

**Demo story:** *A physio plan shows "3 of 10 attended" on the schedule; a missed session flags reception automatically.*

**Objective:** session-based care (physio, dental, dermatology courses) tracked as multi-visit progress, not repeated one-offs.
**Business outcome:** attendance/progress visibility reduces drop-off — a retention lever.
**Personas:** Doctor/Therapist, Reception, Patient.
**Sprints:** 2. **Dependencies:** C1 must ship first.
**Risks:** specialty-specific hardcoding — must stay generic (planned/completed/cadence), per the existing no-hardcoded-specialty rule.
**Success metrics:** session completion rate · drop-off rate before vs. after · average sessions-per-plan actually completed · reception follow-up response time on a missed session.

### C3 — Clinical Timeline
**Customer Promise:** *"See every patient interaction in one place."*
**Before → After:**
> **Before:** A patient's history is scattered — visits here, documents there, payments somewhere else. A doctor pieces it together before every consult.
> **After:** One screen tells the whole story — visits, procedures, documents, payments — for both the doctor and the patient.

**Demo story:** *Doctor opens a returning patient's Timeline before the consult — sees the last visit, the active Physio Plan at session 6, the last invoice, and the last document — in one screen, no tab-switching.*

**Objective:** turn the existing per-event timeline into the patient's real longitudinal record.
**Business outcome:** the single screen a doctor opens before every consult; becomes the patient-app "my health record."
**Personas:** Doctor, Patient.
**Sprints:** 1–2. **Dependencies:** `timeline-service.ts` (exists), Document Platform, C1/C2 (for content).
**Risks:** low — presentation over existing data; watch aggregation performance (Part 10).
**Success metrics:** time-to-context at consult start (qualitative/observed) · Timeline screen opens per consult · patient-app "Records" engagement.

### C4 — Prescription Platform
**Customer Promise:** *"Professional prescriptions, fewer errors."*
**Before → After:**
> **Before:** A prescription is free text in a print template — no structure, no refill tracking, error-prone at a glance.
> **After:** A prescription is a structured Document — dose, schedule, duration, refills — versioned like every other clinical artifact.

**Demo story:** *Doctor builds a prescription from structured fields (not free text) → it prints as a proper Document → patient's app shows "refill due in 3 days."*

**Objective:** move Prescription from free-text print to a structured medicine model and a real Document type.
**Business outcome:** fewer transcription errors, refill reminders (feeds C5).
**Personas:** Doctor, Patient.
**Sprints:** 1–2. **Dependencies:** Document Platform (registry already designed for this).
**Risks:** low-medium — data-modeling discipline only.
**Success metrics:** % prescriptions using structured fields vs. free text · refill-reminder opt-in rate (once C5 lands) · prescription-related support queries (should fall).

### C5 — Communication Platform
**Customer Promise:** *"Auriva keeps your patients informed — automatically."*
**Before → After:**
> **Before:** Reminders, results, and documents live only inside the app. A patient who doesn't open Auriva never hears from the clinic.
> **After:** Appointment reminders, document shares, and follow-up nudges reach the patient on WhatsApp, SMS, or email — with delivery tracked.

**Demo story:** *Patient books a follow-up → receives a WhatsApp reminder the day before → after the visit, receives their Visit Summary and Invoice as a WhatsApp document share.*

**Objective:** deliver what the Document and Notification Platforms were designed for but never wired.
**Business outcome:** the single highest-visibility "the app finally does this" feature.
**Personas:** all, patient-facing value highest.
**Sprints:** 2–3. **Dependencies:** Document Platform's reserved `DeliveryChannel` seam, in-app Notification foundation, **C4** (worth sending once Prescription is structured).
**Risks:** highest in this roadmap — vendor approval (WhatsApp Business API), consent/opt-in compliance, cost bounds. A platform build, not a button (BRD-044 §9).
**Success metrics:** patient opt-in rate · reminder delivery success rate · no-show rate before vs. after · document-share open rate · cost per delivered message (bounded).

---

## Part 7 — Sprint Breakdown

*(C1 detailed as the lead milestone; C2–C5 receive the same treatment once C1 ships, to avoid over-specifying work several milestones out.)*

### C1 · Sprint 1 — Treatment Plan core
**Goal:** a doctor can create and view a Treatment Plan during consultation.
**Backend:** `TreatmentPlan` model (patient, clinic, doctor, cadence, linked ServiceEvents), plan-service.
**Frontend:** "Treatment Plan" section in the shared Consultation surface, next to Clinical Services (reuses the B1 pattern).
**DB:** one additive migration.
**Shared components:** extends `ServicesCaptureView` conventions.
**Testing/QA:** service-layer integration tests; browser QA on both consult surfaces.
**Users notice:** a new "Plan" option next to Clinical Services.
**Business value unlocked:** multi-visit intent captured for the first time.

### C1 · Sprint 2 — Plan → Checkout → Schedule
**Goal:** reception can see, sell, and schedule against an active plan.
**Backend:** plan-aware checkout grouping; plan-linked appointment suggestion.
**Frontend:** Checkout Workspace shows "Active Plan: 3 of 10 sessions"; scheduling surfaces "book next session."
**DB:** none beyond Sprint 1.
**Testing/QA:** end-to-end plan→checkout→next-appointment.
**Users notice:** plan progress at checkout; one-click follow-up booking.
**Business value unlocked:** the revenue-leak this milestone exists to close is closed.

---

## Part 8 — Product Evolution

### Capability sequence
```
Today (S1 closed)
  Foundation + Revenue & Visit Experience — production-ready
      │
      ▼
C1  Treatment Planning        "the doctor plans, not just prescribes"
      │
      ▼
C2  Procedure Management      "multi-session care is tracked, not repeated one-offs"
      │
      ▼
C3  Clinical Timeline         "one screen tells the patient's whole story"
      │
      ▼
C4  Prescription Platform     "medicines are structured, not free text"
      │
      ▼
C5  Communication Platform    "the app finally reaches the patient outside the app"
```

### Business growth story — how the clinic itself evolves
```
Solo Practice
      │  (Revenue & Visit Experience — done: checkout, documents, billing policy)
      ▼
Treatment Plans          "I stop losing follow-up revenue"
      │
      ▼
Sessions & Procedures    "I can run a physio/dental practice, not just single visits"
      │
      ▼
Patient Timeline         "my patients feel remembered, not processed"
      │
      ▼
Communication            "my patients hear from me without me lifting a phone"
      │
      ▼
Growing Clinic  ──────►  Professional edition (Packages, Procedure Mgmt, Advanced Comms)
      │
      ▼
Multi-location  ──────►  Enterprise edition (cross-clinic Analytics, Memberships, narrow Insurance)
```
This is the story Sales, Onboarding, and Release Notes can all use — a clinic doesn't "get features," it **grows** through Auriva.

---

## Part 9 — UX Roadmap

| Milestone | New screens | Modified screens | Shared components | Navigation | Journey change |
|---|---|---|---|---|---|
| C1 | Treatment Plan detail view | Consultation (+Plan section), Checkout (+plan progress) | `ServicesCaptureView` pattern reused | none new | Doctor: diagnose→**plan**→prescribe. Reception: charges→**plan progress**→checkout |
| C2 | Session tracker / attendance view | Treatment Plan detail (+progress bar) | reuses C1 | Schedule gets a "plan session" badge | Reception sees session cadence on the daily schedule |
| C3 | Patient Timeline (unified) | Patient record entry points across `/clinic`, `/doctor`, `/staff` | new `Timeline` shared component | Timeline becomes a primary tab | Doctor opens Timeline before every consult |
| C4 | Structured Prescription editor | Document Viewer (new `prescription` type) | extends `DocumentRenderer` registry | none new | Doctor builds Rx from structured fields |
| C5 | Communication preferences (opt-in), delivery-status indicators | Document Viewer (Share, currently a stub) | new `DeliveryChannel` (designed since B3) | Settings gains "Communication" | Patient receives reminders/documents outside the app |

---

## Part 10 — Technical Roadmap

| Milestone | Backend | Frontend | Shared components | API | DB | Architecture notes | Perf | Tech debt |
|---|---|---|---|---|---|---|---|---|
| C1 | `treatment-plan-service.ts` | Plan section, Plan panel | extends B1 pattern | `/api/clinic/treatment-plans` | +2 tables | Plans = ServiceEvent sequences, not a parallel ledger | low | none |
| C2 | extends plan-service | Session tracker | reuses C1 | extends C1 API | +1 table | generic session model, no per-specialty branching | low | — |
| C3 | extends `timeline-service.ts` (aggregation) | `Timeline` screen | new, reusable across 3 surfaces | `/api/clinic/timeline` | none — read-model | pure aggregation | **watch:** N+1 risk across 4+ sources — needs one query plan | addresses S1's duplicate-fetch note |
| C4 | extends `document-service.ts` (new assembler) | Prescription editor | extends `DocumentRenderer` registry | extends `/api/clinic/documents` | none | zero new architecture — the registry proving itself | low | retires `/print/prescription` (kept exactly for this) |
| C5 | new `communication-service.ts` | opt-in UI, delivery status | new `DeliveryChannel` (B3-reserved seam) | new `/api/clinic/communications` | +2 tables | the one milestone needing new external infra | **watch:** rate limits, cost bounds, async delivery | closes the Notification Platform gap |

---

## Part 11 — Release Dashboard (master tracking sheet)

| Milestone | Sprints | Backend | Frontend | DB | API | Testing | QA | Business KPI | User Value | Release Status |
|---|---|---|---|---|---|---|---|---|---|---|
| M3A Revenue Foundation | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | Settlement accuracy | (foundation, invisible) | ✅ Shipped |
| B1 Clinical Services | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | Charge capture accuracy | "Clinical Services" in consult | ✅ Shipped |
| B1b Shared Consultation | — | — | ✅ | — | — | ✅ | ✅ | — | same UI on /clinic + /doctor | ✅ Shipped |
| B2 Reception Workspace | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Checkout time-to-complete | Checkout Workspace | ✅ Shipped |
| B3 Clinical Document Platform | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Document reprint accuracy | Clinical Artifacts, print/PDF | ✅ Shipped |
| B4 Billing Policy Framework | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Prepaid collection rate | Billing Policy settings, gate | ✅ Shipped |
| B5 Financial Corrections | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Correction audit completeness | Corrections panel | ✅ Shipped |
| S1 Stabilization | — | ✅ | ✅ | — | — | ✅ | ✅ | Zero legacy-path incidents | (cleanup, mostly invisible) | ✅ Shipped |
| **C1 Treatment Planning** | 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Follow-up booking rate | "Plan" in consult + checkout | ✅ **Approved** (+C1.1 polish) |
| C2 Procedure Management | 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Session completion rate | Follow-ups worklist + progress | ✅ **Approved** |
| C3 Clinical Timeline | 1–2 | ✅ | ✅ | — | ✅ | ✅ | ✅ | Consult prep time (qualitative) | Enriched deep-linked Timeline (doctor + reception) | ✅ **Approved** |
| C4 Prescription Platform | 1–2 | ✅ | ✅ | — | ✅ | ✅ | ✅ | % structured prescriptions | Structured Rx + RX document + patient-language | ✅ **Approved** |
| C5 Communication Platform | 2–3 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | 🔲 | No-show rate reduction | SMS/WhatsApp/Email | ⬜ Planned |

*(Update this table at the end of every milestone's Completion Report — it is the single source of truth for stakeholder status.)*

---

## Part 12 — Phase 4 & Phase 5 (preview, not yet planned in detail)

### Phase 4 — Business Growth
Packages · Memberships · Reports · Analytics. Sequenced after Phase 3 because Packages needs Treatment Planning's data model, and Analytics is materially more valuable once there's clinical depth (plans, sessions, structured prescriptions) to report on.

### Phase 5 — Scale
Enterprise · Advanced Organization tooling · narrow Insurance · multi-location enhancements. Sequenced last because it should be informed by a real multi-clinic customer's actual friction, not speculation.

*(Both phases get their own Part-1-through-11 planning pass when Phase 3 nears completion — not before, per the "architect for 3–5 milestones, build only approved scope" principle already governing this project.)*

---

## Part 13 — Recommendations & Next Steps

1. **Build C1 next.** Highest score, unlocks C2 directly, first Phase-3 capability a doctor feels as a step-change rather than a refinement.
2. **C2 immediately after C1, not parallel** — it's an application of C1's data model, not a separate engine.
3. **C3 and C4 can run concurrently** once C1/C2 land — Timeline is read-only aggregation, Prescription extends the Document registry; neither blocks the other.
4. **C5 last**, despite a high score — needs C4's structured content to be worth sending, and is the one milestone with real external vendor/compliance risk.
5. **Defer, don't build:** generic Inventory, Marketing (Part 3), narrow Insurance, Teleconsultation, Memberships (needs Packages first).
6. **Named risks:** C1 scope creep into generic project management; C2 specialty hardcoding; C3 aggregation performance; C5 vendor/compliance risk (needs its own focused readiness spec before implementation).
7. **Process stays Process v2.0.** Every milestone: select from this roadmap → concise Engineering Readiness → build → QA → concise Completion Report → update the Release Dashboard (Part 11). PO approval gates remain scoped to data-model, core-workflow, permissions, billing logic, product scope, and long-term architecture changes only — everything else proceeds on established principles.

**This document is now v1.0 — frozen.** Amendments require an explicit Product Office decision, recorded as a dated changelog entry below, not silent edits.

### Changelog
- **v1.0** — Product Office review incorporated: customer-value framing, demo stories, editions, success metrics, exclusion list, expanded dashboard, business-growth narrative. Frozen as the governing roadmap for Release 1.x.
- v0 — Initial draft (Parts 1–10, engineering-capability framing).
