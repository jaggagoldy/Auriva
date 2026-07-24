# Auriva — Pre-RC Product Alignment & Workflow Remediation

**Status:** Analysis & planning only. No code, schema, API, or UI was changed to produce this document (per the phase's explicit rule). Every classification below is grounded in a read of the current `main`-line codebase (Sprints 1–5 of BRD-043 merged on their per-sprint branches).

**Purpose:** study the current implementation against the 12 workshop sections, classify each, and produce a remediation roadmap for Product Office approval **before** Release Candidate. Implementation happens only after sign-off, on a dedicated branch.

---

## 0. The one finding that reframes everything

BRD-043 (Sprints 1–5) optimised for the **solo owner-doctor** in a **single adaptive `/clinic`** surface. Sprint 3's Rule 2 — *"one `/clinic`, everyone lands there, no per-role workspaces"* — was frozen and approved.

This remediation is fundamentally about **multi-person, reception-first clinics**. And the capabilities those clinics need — a rich Doctor workspace and a rich Reception workspace — **already exist in the codebase** as `/doctor/*` and `/staff/*`, built in earlier milestones (Doctor Workspace APS-009/011; reception queue/walk-in/billing/lab). **Sprint 3's routing change bypassed them**: `defaultWorkspacePathForRole` now sends doctors and receptionists to `/clinic`, where a Doctor gets a single "Dashboard" nav item and a Receptionist gets Dashboard/Today/Payments — a *thinner* experience than the workspaces that already existed.

**Therefore:**
- A large share of Sections 5 & 6 is **"reconnect and extend what exists,"** not "build from scratch."
- The core strategic decision Product Office must make is the **surface model**: keep collapsing all roles into `/clinic` (BRD-043 Rule 2), or route **solo → unified `/clinic`, multi-person → role-specific operating systems** (`/doctor`, `/staff`, owner cockpit). This document recommends the latter and treats it as the P0 keystone every other item depends on.
- This means **consciously revisiting a frozen Sprint-3 decision.** That is a Product Office call, not an engineering one — it is the first thing the roadmap asks you to ratify.

This tension (solo-unified vs reception-first-multi-surface) is the lens for every section below.

---

## 1. Section-by-section classification

Classification legend: **✅ Correct** · **◐ Partial** · **✗ Incorrect assumption** · **⟳ Requires redesign** · **↗ Already planned elsewhere** · **⏸ Should be deferred**.

### S1 — Identity & Staff Provisioning → ◐ Partial / ⟳ Redesign
- **Current:** invite-link only (Sprint 2): phone-first, WhatsApp/Copy-Link (ADR-003), invitee sets their own password at `/join/[token]`. No owner-set credentials, no forced first-login change, no 2FA.
- **Assessment:** the workshop is right that invite-links have real friction for non-technical staff. **Option A (Managed Provisioning)** — owner creates the account + a temporary password, staff log in and are forced to change it — is a genuine gap and the correct primary path for small Indian clinics. It needs **no** SMS/email (owner hands the temp password over in person), so it stays inside ADR-003.
- **Recommendation:** make **Option A the primary** staff-onboarding path; keep the existing **invite-link as the secondary** (Option B) for clinics that prefer it. **Option C (SCIM / Azure AD / Okta / M365)** and **2FA** → **⏸ defer to Enterprise tier** (consistent with the frozen "Enterprise is inert/roadmap-only" decision).
- **Migration impact:** additive and low. Reuse the existing `Invitation`/accept transaction; add a provisioning path that sets a temp password + a "must change password" flag on the account. No destructive change.

### S2 — Reception-First Operating Model → ✗ Incorrect assumption / ⟳ Redesign
- **Current:** the `/clinic` solo visit flow is `consult → pay` (`VisitOverlay` step machine) — consultation first, billing after. Reception primitives exist (`checkIn`, `registerWalkIn` with `queue_number`, a rich status machine `scheduled→checked_in→waiting→doctor_ready→in_consultation→completed`) but there is **no** pre-consultation fee collection, **no** token issuance step, **no** reception checkout step, and **no** procedure-recommendation → reception handoff.
- **Assessment:** correct critique. The product's *default mental model* is doctor-led. Real clinics are reception-led. The **infrastructure is ~60% present** (registration, check-in, queue numbers, statuses); the **workflow orchestration and the money-timing are wrong**.
- **Recommendation (P0):** introduce the reception-first encounter journey — Arrival → Registration → **Consultation-fee collected up front** → Token → Waiting → Consultation → Procedure recommendation → **Reception checkout** → Payment → Follow-up — as the operating model for multi-person clinics. Solo owner-doctor keeps a simplified single-surface flow.

### S3 — Billing Model → ✗ Incorrect assumption / ⟳ Redesign
- **Current:** `Invoice` is one-per-appointment (`appointment_id @unique`), `items_json` line items, `Payment` against the invoice, statuses `draft→issued→paid→void`. Discounts are modelled as negative line items. This is an **invoice-centric, single-invoice** model.
- **Assessment:** correct. Split billing (Phase 1 consult fee **before**, Phase 2 procedure/diagnostics **after**) does not fit one-invoice-per-appointment. An **Encounter (Visit) Ledger** — one encounter, many charges, many payments, a running balance — is the right healthcare model and is what HealthPlix/Practo Ray-class products use.
- **Recommendation (P0):** adopt an **Encounter Ledger**: a `Visit`/`Encounter` aggregate as the billing parent; charges (consult, procedure, diagnostic) and payments both hang off the encounter; the current `Invoice` becomes a *printed statement* of an encounter rather than the source of truth. **Phase this** — keep `Invoice` working, introduce `Encounter` as the parent, relax `appointment_id @unique`.
- **Guardian note:** keep this **Financial Operations (Pillar 3)** — an encounter ledger, not a general ledger. Do **not** drift into accounts-receivable/GL/ERP territory (an explicit AGENTS.md red flag).

### S4 — Queue Model → ◐ Partial
- **Current:** appointment-centric with real walk-in support (`walk_in`, `allow_walk_ins`, `queue_number`) and a queue-capable status machine (`waiting`, `doctor_ready`, `skipped`). There is **no** clinic-level `scheduling_mode` switch.
- **Assessment:** the hard part (queue state machine + tokens + walk-ins) **already exists**. What's missing is making it a **configurable mode** (Appointment / Queue / Hybrid) rather than an implicit hybrid.
- **Recommendation (P1):** add a clinic-level `scheduling_mode` config and let it drive booking/queue UI. Mostly configuration + UI; the data model largely supports it already. Lower risk than S2/S3.

### S5 — Doctor Experience (Clinical OS) → ↗ Already implemented, ORPHANED by Sprint 3 routing
- **Current:** a rich Doctor workspace **exists** at `/doctor/*` — Today/Mission-Control, consult Workbench (SOAP), Schedule, Patients, Practice, Profile — plus availability, `DoctorTimeBlock` (leave/holiday **as availability blocks**, correctly *not* HR leave), clinical templates, prescriptions, test recommendations. **But** Sprint 3 routes doctors to `/clinic`, where they get only an adaptive Dashboard.
- **Assessment:** the gap is **not** "build the Clinical OS." It largely exists. The gap is that **BRD-043 disconnected it.** "Procedure Queue" and "Favorites" are the only genuinely new items.
- **Recommendation (P0, keystone):** reconnect routing so a Doctor at a multi-person clinic lands in the Doctor OS (`/doctor`), not the thin `/clinic` dashboard. This **partially reverses Sprint 3 Rule 2** and is why the surface-model decision (§0) is the keystone.
- **Guardian note:** "Leave/Holiday" here = availability blocks (exists). It must **not** become HR leave management (AGENTS.md red flag).

### S6 — Reception Experience (Reception OS) → ◐ Partial + orphaned
- **Current:** `/staff/*` surfaces exist (dashboard, queue, walk-in, billing, lab, patient) — also orphaned by Sprint 3 routing. **Missing entirely:** cash **drawer open/close**, **shift settlement**, dedicated **checkout** step, **procedure payment** timing, **refunds**, **token printing**, and discounts beyond a negative line item.
- **Assessment:** registration/check-in/queue/consult-billing exist; the **cash-management and checkout cycle** — the heart of a front desk — does not.
- **Recommendation (P0):** reconnect `/staff` as the Reception OS **and** build the cash cycle: drawer session (open float → transactions → close/settle → variance), checkout, refunds, discounts as first-class, token printing. **Financial Operations (Pillar 3)** — legitimate and a major competitive gap vs India-market peers.

### S7 — Owner Experience → ◐ Partial + one RED FLAG
- **Current:** `/admin` command center (multi-clinic KPIs) + `/clinic` owner dashboard (revenue, collections, team, alerts) exist. Subscriptions/plan (Sprint 5) and practice settings exist.
- **Assessment:** most owner needs are assemblable from existing pieces + the new cash-drawer/settlement data (S6). One item is a hard constitution violation:
- **🚩 GUARDIAN CHALLENGE — "Attendance":** attendance tracking is an **explicit AGENTS.md red flag** ("Attendance tracking" — HRMS). **Recommend REJECT**, or reframe narrowly as *operational presence* ("who is on shift / rostered today," derived from availability + login, **not** timesheets/HR attendance). Product Office must rule before any build. This is exactly the kind of scope-creep the constitution asks me to stop.
- **Recommendation (P1):** build the owner cockpit from existing KPI/finance/team data + drawer/settlement; **exclude attendance** pending a Product Office ruling.

### S8 — Patient Experience → ✅ Correct (mostly) / minor gaps
- **Current:** rich mobile-first `/patient/*` (book, records/Health-Vault, care, family, doctors, find-care, profile, you). **Patient in-app notifications DO exist** (`Notification` model + `notification-service` + `notification-center` — this corrects an earlier assumption that notifications were entirely unbuilt). No online payment (consistent with ADR-004, no gateway).
- **Assessment:** the least-broken area. Delivery-channel notifications (push/SMS/WhatsApp) and online payment are the notable absences, both already scoped-out by ADRs.
- **Recommendation (P2/P3):** minor journey polish; **defer** online payment (ADR-004) and notification delivery channels.

### S9 — Role Responsibilities (RBAC) → ◐ Partial / **frozen-decision conflict**
- **Current:** exactly 4 roles (`patient`, `super_admin`=owner, `doctor`, `receptionist`) + a 4-capability model (`reception`, `doctor_workspace`, `admin_portal`, `patient_workspace`). **No** Nurse, Practice Manager, or Caretaker.
- **🚩 GUARDIAN CHALLENGE:** BRD-043 **froze exactly three staff roles, "closed enum, no extensibility this release."** The workshop's Nurse / Practice Manager / Caretaker request **directly reopens a frozen decision.** The capability model *can* extend cleanly, but this must be a **conscious Product Office reopening**, not an implementation detail. Partial pre-existing coverage: **Caretaker** ≈ family access already exists via `AccountProfileLink`; **Practice Manager** ≈ a receptionist granted `admin_portal`-lite; **Nurse** is genuinely new (clinical-adjacent, would need its own capability + surface).
- **Recommendation (P2):** treat as a **scope decision, not a build task.** If Product Office reopens the freeze, add Practice Manager (cheap, capability-only) first; Nurse is a larger clinical surface; Caretaker is largely done.

### S10 — Navigation → ◐ Partial / ⟳ (downstream of S2/S5/S6)
- **Current:** `/clinic` nav is module-oriented (Dashboard/Today/Calendar/Treatments/Payments/Settings→Practice/Team/Plan). The proposed operations-oriented IA (TODAY / CONSULTATION / OPERATIONS / SETTINGS) is cleaner for clinic staff.
- **Assessment:** navigation cannot be finalised until the surface model (§0) and reception-first workflow (S2) are decided — nav is **downstream**. Each operating surface (Doctor OS, Reception OS, Owner cockpit) should get its own operations-oriented IA rather than one shared module list.
- **Recommendation (P1):** redesign IA per surface **after** S2/S5/S6 are ratified.

### S11 — UI/UX scope note
Meta-instruction, not a classification target. All recommendations here are **IA / workflow / journey / navigation** only; visuals, design system, and prototypes are explicitly out of scope for this phase.

### S12 — Product audit vs peers → see Deliverable 3 below.

### S13 — Do not implement → acknowledged. This document contains **zero** code, schema, API, or UI changes.

---

## 2. Deliverable 1 — Current State Assessment (summary)

| Capability | State | Evidence |
|---|---|---|
| Staff onboarding | Invite-link only (phone/WhatsApp) | `onboarding-service.createInvitation/acceptInvitation`, `/join/[token]` |
| Reception primitives | Check-in, walk-in, queue numbers | `reception-service.checkIn`, `walkin-service.registerWalkIn` |
| Money timing | Consult **then** pay; 1 invoice/appointment | `Invoice.appointment_id @unique`, `VisitOverlay` `consult→pay` |
| Cash cycle (drawer/settle/refund) | **Absent** | no drawer/settlement/refund/checkout anywhere |
| Queue modes | Implicit hybrid, not configurable | `queue_number`, `walk_in`, status machine; no `scheduling_mode` |
| Doctor OS | Rich, but **orphaned** by routing | `/doctor/*` exists; `defaultWorkspacePathForRole` → `/clinic` |
| Reception OS | Exists, but **orphaned** by routing | `/staff/*` exists; same routing change |
| Owner cockpit | KPIs/finance/team/plan exist | `/admin`, `/clinic` dashboard, Sprint 5 plan |
| Patient portal | Rich, mobile-first, in-app notifications | `/patient/*`, `Notification` model |
| RBAC | 4 roles / 4 capabilities, closed | `domain/authorization.ts` |

## 3. Deliverable 3 — Operational Workflow & Competitor Comparison

**Current vs Proposed journey**

| Stage | Current | Proposed (reception-first) |
|---|---|---|
| Arrival/registration | Reception can register/check-in | Same (keep) |
| Consultation fee | Collected **after** consult | Collected **before** consult (Phase 1) |
| Token / waiting | queue_number exists, no token print | Issue + print token |
| Consultation | Doctor (rich `/doctor`, currently bypassed) | Doctor OS reconnected |
| Procedure reco → reception | No handoff | Doctor recommends → routed to reception |
| Checkout | No dedicated step | Reception checkout (Phase 2 charges) |
| Payment | Single invoice | Encounter ledger, multi-charge |
| Follow-up | Exists | Keep + surface at checkout |

**Peer audit (S12):** India-market comparables **HealthPlix** and **Practo Ray** are explicitly reception-first with token flow, pre-consult fee, and cash-drawer/settlement — the exact areas Auriva lags. **Cliniko / Jane / SimplePractice / Halaxy** are Western allied-health/SaaS; they are appointment-centric and invoice-centric (closer to Auriva today) but weaker on the walk-in/token/cash-drawer cycle that Indian clinics need. **Auriva's genuine advantages:** adaptive role dashboards with server-enforced financial privacy (Sprint 3), WhatsApp-first zero-infra invitations (ADR-003), solo-first simplicity, tight India fit. **Auriva's weaknesses vs peers:** no reception cash cycle, invoice-not-ledger billing, no configurable queue modes, and the post-BRD-043 thinning of the doctor/reception surfaces.

## 4. Deliverable 4 — Healthcare Best-Practice Alignment
- **Reception-first + pre-consult fee** = standard OPD practice in India → currently misaligned (P0).
- **Encounter ledger** = standard clinical billing (a visit accrues charges) → currently misaligned (P0).
- **Cash drawer + shift settlement** = standard front-desk control → absent (P0).
- **Continuity of care on staffing change** = already aligned (Sprint 4 reconciliation-gated archive reassigns, never cancels).
- **Financial privacy by role** = already aligned and ahead of peers (Sprint 3 server-shaped payloads).

## 5. Deliverable 5 — Commercial Risk Analysis
| Risk | Severity | Note |
|---|---|---|
| Multi-person clinics reject the product on front-desk cash workflow | **High** | The reception cash cycle (S2/S6) is table-stakes for paid India clinics |
| BRD-043's "one `/clinic`" thinned the doctor/reception UX vs what shipped earlier | **High** | Sprint 3 reroute; fixable by reconnecting existing surfaces |
| Attendance request pulls product into HRMS | Medium | Constitution violation; reject/scope now |
| Role expansion reopens a frozen scope with unclear ceiling | Medium | Decide deliberately, don't drift |
| Encounter-ledger migration touches live billing data | Medium | Phase it; keep Invoice working |

## 6. Deliverables 6–8 — Architecture / Database / API Impact (planning-level; not to be built yet)
- **Architecture:** the keystone is the **surface-model decision** (solo `/clinic` vs multi-person role surfaces). Everything else layers on top. No new architectural *layer* is required — the `domain → service → route → app` structure and the existing `/doctor`, `/staff` surfaces are reused.
- **Database (additive, phased):** new `Encounter`/`Visit` aggregate + charge/payment links (relax `Invoice.appointment_id @unique`); `CashDrawerSession` + `DrawerTransaction`; `Clinic.scheduling_mode`; `User.must_change_password` (managed provisioning); optional new roles/capabilities (only if S9 freeze is reopened). **No destructive change proposed** — same additive discipline used in Sprints 1–5.
- **API:** new reception/checkout/drawer/settlement endpoints; encounter/charge endpoints; a managed-provisioning endpoint; a `scheduling_mode` setting. Existing invoice/appointment/queue endpoints stay backward-compatible during the phase.

## 7. Deliverable 9 — Migration Strategy
Additive, reversible, phased — the exact playbook proven across Sprints 1–5 (nullable/defaulted columns, backfill, no drops). Encounter ledger ships **alongside** the current invoice model (Invoice becomes a view/statement of an encounter) so no billing data is rewritten in place; the cutover is per-clinic and reversible.

## 8. Deliverable 10 — Prioritised Remediation Roadmap

**P0 — commercial blockers for multi-person clinics (do first, gated on §0 decision):**
1. **Ratify the surface model** (solo `/clinic` vs multi-person role surfaces) — the keystone decision. Reconnect `/doctor` (S5) and `/staff` (S6) routing.
2. **Reception-first workflow + pre-consult fee** (S2).
3. **Encounter Ledger / split billing** (S3).
4. **Reception cash cycle** — checkout, drawer, settlement, refunds, token print (S6).
5. **Managed provisioning (Option A)** for staff onboarding (S1).

**P1 — important, post-P0:**
6. Configurable **queue modes** (S4).
7. **Owner cockpit** consolidation **minus attendance** (S7).
8. **Navigation IA** redesign per surface (S10).

**P2 — scope decisions / lower urgency:**
9. **RBAC role expansion** (Nurse / Practice Manager) — **only if Product Office reopens the BRD-043 freeze** (S9).
10. Patient portal journey polish (S8).

**P3 — defer:**
11. Enterprise identity (SCIM/SSO), 2FA (S1 Option C).
12. Notification delivery channels, online payment (ADR-003/004).

## 9. Deliverable 11 — Risk Register
| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Surface-model decision stalls (frozen Sprint-3 Rule 2) | Med | High | Put it first; it gates P0 |
| R2 | Encounter-ledger migration corrupts billing | Low | High | Phase alongside Invoice; additive; per-clinic reversible cutover |
| R3 | Attendance/HRMS scope creep | Med | Med | Reject/scope at Product Office now |
| R4 | Role expansion has no ceiling | Med | Med | Reopen freeze deliberately or hold |
| R5 | Reception cash cycle underestimated | Med | High | Treat drawer/settlement as its own P0 slice, not a billing footnote |
| R6 | RC slips while remediation runs | High | Med | This is by design — RC is explicitly gated behind this phase |

## 10. Deliverable 12 — Implementation Sequence (only after approval)
1. **Product Office decisions** (blocking): (a) surface model; (b) attendance reject/scope; (c) role-freeze reopen yes/no; (d) encounter-ledger go/no-go.
2. Managed provisioning (S1) — small, unblocks nothing else, good warm-up.
3. Encounter Ledger foundation (S3) — the billing spine everything else charges into.
4. Reception-first workflow + cash cycle (S2/S6) on top of the ledger, with `/staff` reconnected.
5. Doctor OS reconnect + procedure-reco handoff (S5).
6. Queue modes (S4), Owner cockpit (S7), Navigation IA (S10).
7. Scope-gated: RBAC expansion (S9), patient polish (S8).
8. **Then** Release Candidate.

---

## What this phase needs from Product Office
Four blocking rulings before any implementation:
1. **Surface model** — reconnect role-specific `/doctor` + `/staff` for multi-person clinics (recommended), keeping `/clinic` as the solo unified surface? This revisits frozen Sprint-3 Rule 2.
2. **Attendance** — reject (recommended) or narrowly reframe as operational presence, not HR attendance?
3. **RBAC freeze** — reopen BRD-043's closed 3-role set to add Nurse / Practice Manager, or hold?
4. **Encounter Ledger** — approve replacing invoice-centric billing with an encounter/visit ledger (phased)?

Nothing in P0–P3 begins until these are ratified. Release Candidate begins only after this roadmap is signed off.
