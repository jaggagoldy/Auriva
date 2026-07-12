# APS-019 — Auriva Workflow Architecture

**Phase 2 · Platform Architecture** · 03 Jul 2026 · Status: For review
Builds on (approved, not redesigned): APS-012 business · APS-013 domains · APS-014 IA · APS-015 UX · APS-016 PRD · APS-017 standards · **APS-018 events (approved)**.
Feeds: APS-020 Capability · APS-021 Extension · APS-022 AI · APS-023 Integration & Data.
**Not in this document:** screens, code, APIs, schemas. This is the canonical reference for how healthcare journeys run *across* modules.

---

## 1. What a workflow is in Auriva (and what it is not)

APS-013 gave us domains that own facts. APS-018 gave us events that carry facts. What neither owns is the **journey**: a walk-in patient's arrival-to-payment, an admission's request-to-discharge, a claim's draft-to-settlement. Journeys cross domains by definition — and the moment we let any domain own a journey, coupling returns through the back door.

**Definition:** a workflow is a *named, versioned journey definition* — trigger, steps, completion criteria, deadlines — whose **instances** are tracked objects correlating events across domains (`correlationId`, APS-018 E4). A workflow instance is the thing APS-018's reserved `workflow.*` events describe.

**The central architectural decision — choreography by default, orchestration by exception:**

- **Choreographed workflows** (most of the catalog): no coordinator exists. Domains react to events per their own policy (E3); the workflow instance is a *passive tracker* — a projection over the event stream that knows which journey step each fact represents. It gives visibility (journey state, stall detection, KPIs) without adding a single runtime dependency. If the tracker is down, care proceeds; only journey visibility lags.
- **Orchestrated workflows** (the exceptions): a **workflow engine** actively drives — issuing ordinary authorized commands, setting timers, joining parallel branches. Orchestration is permitted only when a journey has at least one of: **(a) deadlines with escalation** (discharge countdown, payer SLA clocks), **(b) parallel branches that must join** (discharge preconditions), **(c) long-running timer loops** (engagement campaigns, maintenance schedules), **(d) multi-domain setup requiring compensation** (org onboarding).

**The engine is an actor, not a superpower.** It holds grants like any staff role (E10), issues the same commands a human would (synchronous, per APS-018 Part 1), and publishes only the `workflow.*` family. It never mutates domain data directly and never publishes another domain's events (E6). Removing the engine degrades deadlines and automation — never correctness of any single domain.

**The `workflow.*` event family (formalizing APS-018's reservation):**

| Event | Meaning | Pri | Audit |
|---|---|---|---|
| `workflow.instance.started` | A journey definition matched its trigger | P2 | A1 |
| `workflow.instance.step_completed` | A tracked step's completing event arrived | P3 | A1 |
| `workflow.instance.stalled` | Deadline/inactivity threshold breached → escalation per definition | P1 | A1 |
| `workflow.instance.completed` / `.abandoned` | Completion criteria met / journey explicitly closed without completion (reason mandatory) | P2 | A1 |

Every instance carries: workflow type + version, `correlationId` (shared by all constituent events), subject entities, org/location, current step, deadline state. Every event a domain publishes during a journey carries that `correlationId` — set by the first command in the chain and propagated by causation (E4). **This is how the brief's objective is met:** Auriva is designed around journeys, yet no module gained a dependency.

---

## 2. Workflow taxonomy

Five patterns govern the 35 mandated workflows. A pattern fixes the skeleton (trigger shape, lifecycle shape, failure philosophy); a workflow instantiates it; org-type presets (APS-014 §3.1) decide which are active.

| Pattern | Shape | Mode | Workflows |
|---|---|---|---|
| **P1 · Encounter** | Arrival → encounter → outputs (orders, charges) → closure | Choreographed (except WF-06 Discharge: orchestrated) | WF-01 Walk-in · WF-02 Scheduled · WF-03 Emergency · WF-04 Follow-up · WF-05 Admission · WF-06 Discharge · WF-07 Referral · WF-08 Teleconsultation |
| **P2 · Fulfillment** | Order → route → fulfill → result/close | Choreographed | WF-09 Lab Order · WF-10 Sample Collection · WF-11 Result Review · WF-12 Radiology · WF-13 Prescription Fulfilment · WF-14 Refill · WF-15 Inventory Consumption |
| **P3 · Money** | Obligation → instrument → payer/patient response → closure | Choreographed; WF-20/21 orchestrated (payer SLA clocks) | WF-16 Estimate · WF-17 Invoice · WF-18 Payment · WF-19 Refund · WF-20 Pre-authorization · WF-21 Claims · WF-22 Settlement |
| **P4 · Lifecycle/Setup** | Request → verify → configure → activate | Orchestrated (compensation on partial completion) | WF-23 Doctor Onboarding · WF-24 Staff Onboarding · WF-25 Organization Setup · WF-26 Department Setup · WF-27 Shift Planning · WF-28 Inventory Procurement · WF-29 Asset Maintenance |
| **P5 · Engagement Loop** | Condition (time- or event-derived) → outreach → response → re-arm | Orchestrated (timer-driven by nature) | WF-30 Reminder · WF-31 Recall · WF-32 Health Campaign · WF-33 Chronic Care · WF-34 Vaccination · WF-35 Preventive Care |

One workflow per pattern is specified at full depth (§3); the remainder follow in the standardized catalog (§4) — same fields, compressed. Composites: WF-05+06 form one admission journey (specified together); WF-10/11 are contained segments of WF-09; WF-16–19 are segments of the revenue pipeline around one encounter.

---

## 3. Exemplar workflows (full depth, one per pattern)

### WF-01 · Walk-in Consultation (P1 exemplar — choreographed)

**Business objective:** APS-012 §02's core clinic loop — arrival to completed, paid consult with follow-up armed — with C1 (time transparency) and C4 (recall) built in, ≤ 60s to token (FR-05).
**Trigger:** patient presents without booking. **Actors:** patient, receptionist, doctor; system actors: D6, D15, engine (tracker only).
**Preconditions:** org open; ≥1 doctor with live queue; walk-in policy active (Settings → Scheduling).

**Diagram:**
```
Arrive → [register/match patient] → patient.created?          (D5)
       → [queue add]  → appointment.checked_in + token         (D6)
       → wait          → queue.position_changed …              (D6)  → patient live ETA
       → [call]        → encounter.started                     (D7)
       → consult       → orders? prescription/lab              (D8)
       → [close]       → encounter.completed                   (D7)  → follow-up window armed (D15)
       → bill          → invoice.generated → payment.received  (D10)
       ⇒ workflow.instance.completed
```

**Lifecycle:** (1) Front desk searches phone/name → match or fast-create (`patient.created`); dedupe check async in-field. (2) Queue add against chosen doctor → `scheduling.appointment.checked_in`, token issued — the ≤60s budget ends here. (3) Waiting: every call/skip/reorder emits `queue.position_changed` → token display + patient phone ETA. (4) Doctor calls → `encounter.started`; consult work (notes D9, orders D8) rides the encounter. (5) Close → `encounter.completed`; D15 arms the follow-up window (org policy, e.g. 7-day free revisit — APS-012 §02's untracked rule, now tracked). (6) Charges assemble → `billing.invoice.generated` → `billing.payment.received`.

**Alternate paths:** patient already exists (skip create) · patient books a slot instead of queueing (→ WF-02) · consult produces admission advice (→ WF-05 spawned, correlated) · consult free under follow-up window (invoice zero-rated but still emitted — the policy becomes measurable).
**Exception paths:** patient leaves before call → queue entry expired by grace timer → `appointment.cancelled` (reason: left) → owner sees walkout rate · doctor unavailable mid-queue → queue reassignment/notify (D6 policy + D15) · duplicate patient discovered later → D5 merge (registry workflow, audit-preserving).
**Completion criteria:** `encounter.completed` + terminal billing state (paid / zero-rated / explicitly credited). Abandonment: walkout or queue-expiry.
**Domains:** D5, D6, D7, D8/D9 (if orders), D10, D15 · **Modules:** Front Desk, Patients, Encounters, Billing.
**KPIs (D16 canon):** registration-to-token time · wait-time actual vs quoted · walkout rate · follow-up window conversion · same-visit payment rate.
**Automation:** grace-timer expiry; ETA computation; zero-rating under follow-up policy. **AI (APS-022):** per-token wait prediction from consult-duration history; duplicate-patient candidate scoring at registration.
**Integrations (APS-023):** none mandatory; UPI at payment. **Audit:** A2 on encounter/clinical/billing facts; A1 on queue trail — sufficient to reconstruct the visit minute-by-minute.

### WF-05 + WF-06 · Admission & Discharge (P1 composite — discharge orchestrated; the C2 flagship)

**Business objective:** an admission whose discharge countdown starts at admission, not at "you can go home" — recovering the 4–8 lost hours (APS-012 §04) that block beds and poison the family's memory.
**Trigger:** WF-05 — admission advice from an encounter (planned), or emergency stabilization (unplanned). WF-06 — clinician marks *clinically dischargeable* (but the engine has been working since day one).
**Actors:** patient/family, admitting consultant, RMO, nursing, bed manager, TPA desk, billing; engine (orchestrating WF-06's joins and deadlines).
**Preconditions:** WF-05: bed availability (synchronous check — never eventual); payer identified (cash deposit policy or insurance → spawns WF-20 pre-auth, correlated). WF-06: admission encounter open.

**Diagram (discharge pipeline — parallel from day one):**
```
encounter.started (admission profile)
  ├─ track A · clinical: rounds → dischargeable decision
  ├─ track B · summary: draft accumulates from day 1 (D9)      ┐
  ├─ track C · money: running bill live (D10); claim dossier    ├─ JOIN = discharge_ready
  │            assembles continuously (D11)                     │
  └─ track D · logistics: pharmacy returns, follow-up plan      ┘
"dischargeable" → engine verifies joins → encounter.admission.discharge_ready
  → final approval (payer) ∥ final bill ∥ family notified with countdown
  → patient leaves → encounter.completed → WF-31 recall armed (post-discharge program)
```

**Lifecycle (compressed):** admission opens the encounter container (APS-013 Q2) → nested encounters (rounds, OT) attach → all four tracks accumulate *during* the stay — the engine's job is watching join-readiness, not doing the work. On "dischargeable": missing preconditions become named tasks with owners and deadlines (`workflow.instance.stalled` escalates per track); once joined, `discharge_ready` fans out (APS-018 M3) — payer final approval, final bill, family countdown run in parallel, not sequence.
**Alternate paths:** LAMA/transfer-out (→ WF-07 referral with data, D17) · death (distinct closure protocol, registers per D14) · step-down to day-care partner (network seam).
**Exception paths:** payer final-approval overdue → stall escalation to TPA lead with payer SLA evidence; org policy may authorize discharge-against-receivable (owner-grade grant) — the decision is a logged command, not a workaround · returns dispute → billing hold on one track without freezing others.
**Completion criteria:** patient departed + encounter completed + bill terminal + claim submitted (claim *settlement* is WF-21's journey, correlated but not blocking).
**Domains:** D5–D15 nearly all · **Modules:** Encounters, Front Desk, Billing, Claims, Pharmacy, Diagnostics.
**KPIs:** dischargeable-to-departure time (the headline) · % discharges with `discharge_ready` before noon · stall causes by track · estimate-vs-final-bill variance (trust metric).
**Automation:** the entire join; task generation from missing preconditions; family countdown messaging. **AI:** discharge-date prediction from day 2 (bed forecasting); summary drafting (`encounter.completed` → draft, doctor signs — APS-018 Part 8).
**Integrations:** NHCX final approval (WF-20/21); payer portals fallback. **Audit:** A2 throughout; the discharge timeline itself is producible evidence (NABH-friendly by construction).

### WF-09 · Lab Order → Result (P2 exemplar — choreographed; contains WF-10, WF-11)

**Business objective:** APS-012 §05's promise — order in, trustworthy result out, on time — with the loop closed back to the prescriber (C6) and the result understood, not just delivered.
**Trigger:** `orders.lab_order.created` (from an encounter, front desk, or B2B client via D17). **Actors:** ordering clinician, phlebotomist, lab technician, pathologist, patient; system: D8 routing, D13 reagents.
**Preconditions:** test in catalog (D4); routing target resolves (in-house section or partner lab relationship).

**Diagram:**
```
lab_order.created (D8) → route: in-house | partner (D17)
  → WF-10 segment: collection scheduled → sample.collected → accessioned
  →      processing (QC gates) → technician result → pathologist sign-off
  → WF-11 segment: clinical.result.ready (D9)
       ├→ ordering clinician (review, action)      ├→ patient (per release policy, with
       ├→ worklist closes · TAT clock stops        │   comprehension layer)
       └→ billing charge (D10)                     └→ trends update (longitudinal, D9)
```

**Lifecycle:** order routes by D8 policy → collection (walk-in draw, home-collection slot on a phlebo route, or ward draw) → `orders.sample.collected` (proposed, §5) with barcode accession → transit → QC-gated processing (a failed daily QC run blocks the test line — an operational fact, not a quiet delay) → technician result → pathologist sign-off → `clinical.result.ready` fans out per APS-018.
**Alternate paths:** partner-lab routing (identical journey; transit + B2B account legs via D17/D12) · radiology variant (WF-12): slot-based acquisition replaces collection, radiologist read replaces processing — the scarce-reader bottleneck (APS-012 §05) makes TAT-watching the workflow's whole personality.
**Exception paths:** **sample rejected** (hemolyzed/insufficient/mislabeled) → `orders.sample.rejected` (proposed) → re-collection sub-journey auto-opened, patient notified with reason, phlebo quality counter incremented — the APS-012 re-collection pain made visible and attributable · **critical value** → `clinical.result.critical` (P0) → acknowledged callback per D14 register · **TAT breach imminent** → `workflow.instance.stalled` → section lead escalation *before* the promise breaks (B2B trust defense) · **result amended post-release** → `clinical.result.amended` (proposed): a new signed fact superseding, never editing (E1), with re-notification of everyone who saw v1.
**Completion criteria:** result signed + delivered to ordering context + charge emitted; or order cancelled pre-collection.
**Domains:** D8, D9, D13, D4, D10, D15, D17 · **Modules:** Diagnostics (worklist, samples, collections, B2B), Billing.
**KPIs:** TAT by test/section vs promise · rejection rate by phlebotomist/site · critical-value acknowledgement time · % results viewed by prescriber (the C6 metric nobody measures today) · B2B on-time rate.
**Automation:** accession-to-worklist flow; TAT clocks and pre-breach escalation; re-collection opening; QC-block propagation. **AI:** result-comprehension layer for patients; flag triage for prescriber inbox ordering; rejection-cause pattern detection.
**Integrations:** partner labs (D17), home-collection routing, ABDM record push on consent. **Audit:** A2 chain from order to sign-off — the NABL evidence trail is this workflow's event log, verbatim (Q5 ruling in practice).

### WF-20 · Insurance Pre-authorization (P3 exemplar — orchestrated: payer SLA clocks)

**Business objective:** C3 — the pre-auth assembled from the record and driven by deadlines, with humans on exceptions only; admission never surprised by coverage (APS-012 §04 patient journey pain).
**Trigger:** insured payer context on a planned admission/procedure/session-block (or day-care batch cycle). **Actors:** TPA desk, payer (external), treating clinician (evidence), engine (SLA clocks).
**Preconditions:** payer empanelment + rate-card mapping (D11/D4); patient coverage identity verified.

**Lifecycle & diagram (compressed):**
```
requirement set derived from procedure + payer rules (D11)
  → dossier auto-assembles from record: notes(D9) estimate(D10) eligibility(D5)
  → gaps become named tasks (owner + deadline)            [engine]
  → submit via NHCX (D17 edge) → claims.preauth.state_changed: submitted
  → payer clock armed [engine] ── query? → task + alert → respond → resubmit
  → approved (amount, validity) | denied (reason → appeal decision point)
  ⇒ approval attached to encounter context; enhancement sub-loop during stay if costs exceed
```
**Alternate/exception paths:** enhancement mid-stay (same machinery, new amount) · payer silent past SLA → `workflow.instance.stalled` → escalation with evidence trail; org policy decides proceed-at-risk (logged owner-grade command) · denial → appeal-or-convert-to-cash decision, both explicit · per-session batch variant (day care): one dossier, n session authorizations, absence-aware (ties to WF-33/OJ4 machinery).
**Completion:** approved/denied/expired terminal state attached to its encounter; correlated claim (WF-21) inherits the dossier.
**Domains:** D11, D9, D10, D5, D17, D15 · **Modules:** Claims & Payers; Encounters (gate chip).
**KPIs:** first-pass approval rate · query cycles per pre-auth · payer response vs SLA (by payer — negotiation ammunition) · % admissions with approval before arrival (the patient-facing promise).
**Automation:** dossier assembly; clock management; batch generation. **AI:** requirement prediction per payer (learned from query history); denial-risk scoring pre-submission; query-response drafting.
**Integrations:** NHCX primary, portal adapters fallback (APS-018 Part 7). **Audit:** A2; the dossier + timeline is the dispute evidence pack, exportable.

### WF-25 · Organization Setup (P4 exemplar — orchestrated: compensation)

**Business objective:** FR-01/G1 made operational — registration to a *running* org by configuration alone; the config-only onboarding rule (APS-016 §11) enforced by workflow, not hope.
**Trigger:** registration flow completes KYC. **Actors:** owner, Auriva Admin workspace (verification), engine.
**Preconditions:** verified identity (D1); org KYC documents.

**Lifecycle:** `organization.created` → engine opens the setup journey: (1) type preset applied → `organization.module.activated` per matrix (APS-014 §3.1); (2) locations/departments/resources (D2) — `organization.department.created`, `organization.location.added` (proposed); (3) catalog + price lists seeded from preset templates (D4), owner edits; (4) people invited → WF-23/24 spawn per invitee, correlated; (5) policies confirmed (scheduling, financial, communication defaults); (6) integrations optional (ABDM registry linkage, payment rail); (7) go-live checklist joins → org state: live.
**Alternate/exception paths:** verification rejected → journey holds at step 1 with named reasons (Admin workspace queue) · abandoned mid-setup → nudge sequence (D15), then `workflow.instance.abandoned` after policy window; **compensation rule:** an org that never goes live retains its data (D2 never deletes) but activates nothing — no partial-live states exist · migration-from-incumbent (import) is an explicit optional step, never a blocker.
**Completion:** go-live checklist joined; first real operational event (a booking, a bill) within N days is the *success* KPI, distinct from completion.
**Domains:** D1, D2, D3, D4, D14 (licenses), D17 · **Modules:** Settings (all), People, Admin workspace.
**KPIs:** registration-to-live time · checklist-step abandonment (where onboarding UX fails) · time-to-first-operational-event · % setups requiring human support (the config-only rule's health metric).
**Automation:** preset application; template seeding; checklist joins. **AI:** setup recommendations from org profile ("clinics like yours enable X"); document verification assist for Admin review.
**Integrations:** ABDM HFR/HPR registration; KYC verification services. **Audit:** A2 on all configuration facts (they are the tenancy's constitution).

### WF-33 · Chronic Care (P5 exemplar — orchestrated loop; the C4 engine at full depth)

**Business objective:** APS-012's cross-cutting finding — follow-up is the provider's job, not the patient's memory — applied to the highest-value population: chronic patients (60–70% of pharmacy revenue, the silent clinic leakage, the recurring day-care roster).
**Trigger:** enrollment — explicit (clinician enrolls patient in a program: diabetes review cycle, dialysis schedule, post-op protocol) or rule-derived (`engagement.patient.inactive`, care-gap detection). **Actors:** patient/family, program owner (doctor/org), D15 engine.
**Preconditions:** consented contact channels (D5); a program definition (cadence, content, escalation rules — org configuration, D15).

**Diagram (the loop):**
```
enroll → next-due computed → reminder.scheduled (T-n)
  → message.sent → patient responds:
       ├─ books → appointment.booked  → visit happens → loop re-arms from visit facts
       ├─ snoozes → re-schedule within policy
       ├─ silent → escalation ladder: channel change → human call task → flag to clinician
       └─ opts out → consent respected, program owner notified, loop closed (fact, not failure)
  clinical facts (result.ready, dispense.completed) continuously re-compute next-due
  ⇒ every completed cycle: workflow.instance.step_completed → recall attribution (D16)
```
**Alternate paths:** WF-34 Vaccination and WF-35 Preventive are this loop with schedule-table programs (immunization calendar, age/risk screening intervals); WF-31 Recall is its single-shot form; WF-32 Campaign is its cohort-broadcast form (one definition, n instances).
**Exception paths:** channel hard-fails (`message.failed`) → alternate channel, then human task · clinically concerning silence (dialysis absence ×2 — APS-012 §07) → escalates as **clinical** alert, not marketing retry · program definition retired → instances complete their cycle then close (no orphan loops).
**Completion criteria:** loops don't complete — they re-arm; instances close on opt-out, program exit, or clinical closure. Cycle-level completion feeds KPIs.
**Domains:** D15, D5, D6, D16, D9 (clinical inputs) · **Modules:** none new — Settings → Communications defines; results appear as ordinary bookings and Insights.
**KPIs:** recall-attributed visits/refills (G3's headline) · response rate by program/channel/timing · silent-patient rate · opt-out rate (the consent health check).
**Automation:** the entire loop is automation. **AI:** timing/channel/message-variant optimization per patient (APS-018 Part 8's fourth example); risk-ranked outreach ordering; care-gap detection from the event stream (`engagement.care_gap.identified`, proposed).
**Integrations:** WhatsApp/SMS channels; ABDM records for gap detection where consented. **Audit:** A1 message trail + A2 consent facts; every outreach provably consented and attributable.

---

## 4. Workflow catalog (standardized entries)

Format per entry — **Objective · Trigger · Path · Exceptions · Events · Domains/Modules · KPIs · Auto/AI · Audit.** Pattern skeleton and governance from §2–3 apply; only what's distinctive is stated. *(proposed)* marks events entering via §5.

**WF-02 · Scheduled Consultation** (P1) — *Objective:* booked care with pre-arrival certainty. *Trigger:* `appointment.booked` (any channel, incl. marketplace). *Path:* book → reminders (WF-30) → check-in → merges into WF-01 from step 3. *Exceptions:* no-show → `scheduling.appointment.no_show` *(proposed)* → rebook nudge + slot released; reschedule → same-truth propagation. *Events:* booked/rescheduled/checked_in + WF-01 chain. *Domains:* D6 spine. *KPIs:* no-show rate by reminder timing · booked-vs-walk-in mix · slot utilization. *Auto/AI:* overbooking policy per no-show history; slot-demand prediction. *Audit:* A1.

**WF-03 · Emergency Visit** (P1) — *Objective:* unbooked, acuity-first care where the queue is triage, not tokens. *Trigger:* arrival at emergency (hospital preset). *Path:* rapid registration (may be anonymous-provisional → D5 reconciliation later) → triage priority queue → `encounter.started` (emergency profile) → stabilize → dispose: discharge / admit (→ WF-05, correlated) / transfer (→ WF-07). *Exceptions:* medico-legal case flag → D14 register; unidentified patient → provisional identity with later merge; death → closure protocol. *Events:* checked_in (triage-flagged), encounter chain. *Domains:* D5–D7, D10 (billing often post-hoc), D14. *KPIs:* door-to-clinician time by triage class · admit conversion · LWBS (left without being seen). *Auto/AI:* triage-assist scoring (decision support only — clinician assigns). *Audit:* A2 + medico-legal register.

**WF-04 · Follow-up Visit** (P1) — *Objective:* the armed follow-up window converts (C4's clinic face). *Trigger:* booking that references a prior encounter within its follow-up window (or recall response, WF-31). *Path:* WF-01/02 with encounter linked to parent (`causationId`), zero-rated or reduced per policy. *Exceptions:* window expired → ordinary visit with polite policy surface. *Events:* standard chain, parent-linked. *KPIs:* follow-up conversion rate · outcome-of-follow-up (closure vs escalation). *Auto/AI:* auto-link suggestion at booking. *Audit:* A1/A2 standard.

**WF-07 · Referral** (P1) — *Objective:* C7's earned referral — context travels, the loop reports back. *Trigger:* clinician refers (internal department or external org). *Path:* `orders.referral.created` *(proposed, D8)* → route internal (worklist) or cross-org (D17, consented record scope per D5) → receiving side accepts → their encounter journey runs → outcome summary flows back (`orders.referral.completed` *(proposed)*) → referrer notified. *Exceptions:* declined/no-capacity → alternative suggestion; patient never presents → expiry with referrer notice (leakage measured — today it's invisible). *Domains:* D8, D17, D5, D9. *KPIs:* referral completion rate · loop-closure time · leakage by destination. *Auto/AI:* destination suggestion by capability + service metrics (the clean-referral marketplace seed). *Audit:* A2 with consent context.

**WF-08 · Teleconsultation** (P1) — *Objective:* WF-01/02 over a remote channel (encounter channel variant, APS-013). *Trigger:* teleconsult booking. *Path:* booked → channel link issued (D15) → virtual check-in → encounter (channel: video) → e-Rx (WF-13-routable) → payment (usually prepaid). *Exceptions:* connection failure → retry window → reschedule-without-penalty policy; prescribing limits per Telemedicine Guidelines 2020 (D14-supplied rule to D8 — schedule restrictions). *Domains:* + channel integration (APS-023). *KPIs:* completion rate · tech-failure rate · conversion to in-person. *Auto/AI:* pre-consult intake summarization. *Audit:* A2 + telemedicine register (guideline compliance evidence).

**WF-10 · Sample Collection** (P2, segment of WF-09) — *Objective:* the brand-defining doorstep/draw moment, on time and right-first-time. *Trigger:* collectible order. *Path:* slot/route assignment → collection → `orders.sample.collected` *(proposed)* → accession → transit → received-at-lab. *Exceptions:* patient unavailable → reslot; `orders.sample.rejected` *(proposed)* → re-collection + quality attribution; cold-chain breach flag → discard + re-collect. *Domains:* D8, D6 (routes/slots), D13. *KPIs:* on-time collection · first-attempt success · rejection rate by collector. *Auto/AI:* route optimization; rejection-risk hints by test type. *Audit:* A2 chain-of-custody.

**WF-11 · Result Review** (P2, segment of WF-09) — *Objective:* C6 — results acted on, not just delivered. *Trigger:* `clinical.result.ready`. *Path:* prescriber inbox (flag-ordered) → review → action: reassure / adjust / order / recall → patient view (release policy: with-review-delay for sensitive classes) → trend update. *Exceptions:* critical (P0 path, acknowledged callback); prescriber silent past threshold → escalation to org policy; patient-initiated query → routed task. *Domains:* D9, D15. *KPIs:* prescriber-view rate · time-to-clinical-action on abnormal · patient-comprehension engagement. *Auto/AI:* plain-language explanation; abnormality triage ordering. *Audit:* A2 including who-viewed-when (access log).

**WF-12 · Radiology** (P2) — *Objective:* WF-09 with slot-based acquisition and the scarce-reader bottleneck managed. *Trigger:* imaging order. *Path:* modality slot (D6) → acquisition → read worklist (in-house or teleradiology via D17) → signed report → WF-11. *Exceptions:* contrast/consent prerequisites unmet → hold with named gap; reader SLA breach → reroute to backup panel; PC-PNDT class procedures → mandatory register (D14) before acquisition. *Domains:* + D6, D17. *KPIs:* acquisition-to-report TAT · reader utilization · reroute rate. *Auto/AI:* AI pre-read triage (flag-first ordering — assistive only, per APS-022 law). *Audit:* A2 + PC-PNDT/AERB registers.

**WF-13 · Prescription Fulfilment** (P2) — *Objective:* C5 closed — Rx as routable order, dispense as recorded fact (OJ3's journey formalized). *Trigger:* `orders.prescription.created` routed to pharmacy (in-house/partner/patient-chosen). *Path:* dispense queue → stock match (batch, earliest-expiry) → substitution decision (recorded, reasoned) → counsel artifact (printed/WhatsApp dosage card — APS-012 §06's missed moment) → `orders.dispense.completed` → charge. *Exceptions:* out-of-stock → partial dispense fact + sourcing task or route-elsewhere offer; interaction/allergy flag (D9-informed) → pharmacist hold → prescriber ping; Schedule H/H1/X gates → D14 rules block-with-reason. *Domains:* D8, D13, D10, D14, D15. *KPIs:* Rx capture rate (in-house) · substitution rate/reasons · counseling-artifact delivery rate. *Auto/AI:* batch suggestion; interaction screening (assistive). *Audit:* A2 + H1 register auto-entry.

**WF-14 · Refill** (P2 + P5 hybrid) — *Objective:* the chronic subscription formalized (APS-012 §06's core finding). *Trigger:* `engagement.patient.inactive`-class refill-due prediction (from dispense history) or patient request. *Path:* refill offer (D15) → confirm → validity check (Rx still valid? else renewal task to prescriber — a teleconsult hook) → WF-13 → loop re-arms. *Exceptions:* Rx expired → renewal sub-journey, never silent dispensing; patient switched pharmacy → loss fact (measured churn). *KPIs:* refill retention · days-late per refill (adherence proxy) · renewal conversion. *Auto/AI:* refill-date prediction per patient; churn-risk flags. *Audit:* A2 dispense chain (validity evidence).

**WF-15 · Inventory Consumption** (P2, background) — *Objective:* stock truth as a byproduct of care, not a stocktake event. *Trigger:* consuming facts — `dispense.completed`, procedure/session kit use, ward indents. *Path:* consumption posts against batch → running stock recalcs → threshold events: `inventory.stock.below_reorder`, `inventory.batch.expiring` *(both proposed)* → WF-28 procurement trigger / expiry-pull worklists. *Exceptions:* variance found at audit → adjustment fact with reason (shrinkage measured, APS-012 §06); negative-stock impossibility → blocking correction task. *Domains:* D13, D8. *KPIs:* stockout minutes on active-demand SKUs · expiry write-off value · shrinkage variance. *Auto/AI:* demand-driven reorder points per location. *Audit:* A2 movement ledger.

**WF-16 · Estimate** (P3) — *Objective:* the anti-billing-surprise instrument (hospital trust metric #1). *Trigger:* planned procedure/admission counseling. *Path:* `billing.estimate.issued` *(proposed)* from catalog + payer split preview → patient acknowledgment → estimate tracks actuals during stay (variance visible live, both sides). *Exceptions:* variance beyond org threshold → proactive family communication task (not a discharge-day surprise). *Domains:* D10, D4, D11. *KPIs:* estimate-vs-final variance · % admissions with acknowledged estimate. *Auto/AI:* estimate accuracy learning per procedure. *Audit:* A2 (the dispute-prevention evidence).

**WF-17 · Invoice** (P3) — *Objective:* charges → honest instrument. *Trigger:* encounter completion / dispense / episode close / running-bill finalization. *Path:* charge assembly → payer split (D11 context) → `billing.invoice.generated` → patient visibility. *Exceptions:* discount-over-authority → approval conversion (APS-015 §8); post-issue correction → credit note fact, never edit (E1). *KPIs:* charge-to-invoice lag · correction rate. *Auto/AI:* missed-charge detection (assembled vs typical for encounter type). *Audit:* A2.

**WF-18 · Payment** (P3) — *Objective:* money truth, once. *Trigger:* invoice/deposit due. *Path:* method → confirmation (pessimistic, gateway callback normalized per APS-018 Part 7) → `billing.payment.received` → receipt (D15). *Exceptions:* gateway failure → retry rails, never double-charge (idempotent by instrument reference); partial payments → balance tracking; B2B credit terms → ageing (WF-22 adjacency). *KPIs:* same-day collection rate · digital-payment share · failure rate by rail. *Audit:* A2.

**WF-19 · Refund** (P3) — *Objective:* reversals as first-class, fast, audited facts. *Trigger:* cancellation policy hit, overpayment, deposit balance at discharge, service failure. *Path:* refund request → authority check (ladder, same as discounts) → `billing.refund.issued` *(proposed)* → rail execution → patient notice. *Exceptions:* rail failure → manual settlement task with deadline; disputes → owner-visible queue. *KPIs:* refund TAT (a loyalty save metric) · refund rate by cause. *Audit:* A2 with reason taxonomy.

**WF-21 · Claims** (P3, orchestrated) — *Objective:* APS-012 §04's receivables defended paper-free. *Trigger:* insured invoice terminal / discharge dossier ready. *Path:* claim assembled (pre-auth dossier inherited, WF-20) → NHCX submit → `claims.claim.state_changed` through payer states → settlement posting or deduction/denial branch → `settlements.attribution.recorded` effects. *Exceptions:* deduction → dispute-or-accept decision with evidence pack; denial → appeal ladder; payer silence → ageing escalation (the ageing report is this workflow's stall view). *KPIs:* first-pass acceptance · deduction % by payer/reason · claim-to-cash days. *Auto/AI:* deduction-pattern learning → pre-submission fixes. *Audit:* A2 end-to-end.

**WF-22 · Settlement** (P3) — *Objective:* C8 — attribution at transaction time, statements continuous. *Trigger:* attribution facts accumulating (from WF-17/18/21). *Path:* per-engagement/B2B-account statement accrues live → cycle close (org policy) → statement issued → payout execution outside platform → confirmation posted. *Exceptions:* disputed line → item-level flag (rest of statement unaffected); terms changed mid-cycle → dated-terms application (D3 facts decide). *KPIs:* dispute rate (target: reconciliation extinct) · statement-to-payout lag. *Audit:* A2 (both-sides-visible is the audit).

**WF-23 · Doctor Onboarding** (P4) — *Objective:* the scarce actor live in hours: one identity, new engagement (Q3). *Trigger:* org invite / marketplace self-serve join. *Path:* identity match-or-create (D1) → credentials verification (HPR-assisted; Admin review where needed) → `workforce.engagement.created` with terms → availability published (D6) → marketplace listing (if public). *Exceptions:* verification failure → named-gap hold; existing platform identity → engagement adds, nothing duplicates. *KPIs:* invite-to-first-consult time · verification TAT. *Auto/AI:* credential document extraction. *Audit:* A2 (credentialing evidence).

**WF-24 · Staff Onboarding** (P4) — WF-23 minus public credentialing: invite → identity → engagement + role grants (`identity.role.granted`) → department/location qualifiers → active. *Exceptions:* over-broad grant requests → owner approval conversion. *KPIs:* invite-to-productive time. *Audit:* A2 grants trail.

**WF-26 · Department Setup** (P4) — *Objective:* structure as configuration (departments are facets, APS-014 §8). *Trigger:* Settings → Structure. *Path:* `organization.department.created` *(proposed)* → resources mapped → staff qualified → module facets appear (queue columns, worklist filters). *Exceptions:* deactivation with live queue → drain-first rule (no orphan work). *KPIs:* n/a beyond adoption. *Audit:* A2 config facts.

**WF-27 · Shift Planning** (P4) — *Objective:* rosters that scheduling can trust (D3→D6 truth). *Trigger:* roster cycle (weekly/monthly) or gap event (absence). *Path:* draft from patterns + engagement terms → conflict check (double-booking, quals, hour rules) → `workforce.roster.published` *(proposed)* → staff notified → D6 capacity updates. *Exceptions:* short-notice absence → gap broadcast → swap/backfill offers → approval; chronic gaps → Insights signal (hiring evidence). *KPIs:* unfilled-shift hours · short-notice change rate · agency-fill dependence (hospital pain, APS-012 §04). *Auto/AI:* demand-shaped roster drafts. *Audit:* A1 (A2 where duty-hour rules are regulated).

**WF-28 · Inventory Procurement** (P4) — *Objective:* the reorder loop closed without WhatsApp. *Trigger:* `inventory.stock.below_reorder` / manual indent / expiry-pull replacement. *Path:* PO draft (supplier terms, D13) → approval ladder → order to supplier → GRN on receipt → `inventory.stock.received` *(proposed)* (batch/expiry captured) → invoice match → payable posting. *Exceptions:* partial/damaged receipt → line-level GRN facts + supplier score; price mismatch → hold task; expiry-return leg → credit tracking (the recovered-margin fight, APS-012 §06). *KPIs:* stockout prevention rate · PO-to-receipt days · supplier fill rate. *Auto/AI:* reorder quantity optimization; supplier suggestion. *Audit:* A2 (purchase trail = pilferage defense).

**WF-29 · Asset Maintenance** (P4) — *Objective:* machine downtime as managed workflow (day-care's revenue-critical pain; APS-018 review-Q3 candidate). *Trigger:* `assets.maintenance.due` *(proposed)* (AMC schedule) or `assets.machine.down` *(proposed — P0 candidate where sessions depend on it)*. *Path:* ticket → capacity impact posted to D6 (affected slots re-planned *automatically*, patients re-slotted via D15) → service visit → `assets.maintenance.completed` *(proposed)* → capacity restored → logs feed D14 registers. *Exceptions:* AMC vendor SLA breach → escalation with downtime cost attached; recurrent failure → replacement recommendation (Insights). *KPIs:* downtime hours × revenue impact · AMC SLA adherence · preventive-vs-breakdown ratio. *Auto/AI:* failure prediction from usage/QC drift. *Audit:* A2 machine logs (inspection-grade, per APS-012 §07).

**WF-30 · Reminder** (P5, single-shot) — *Objective:* the right nudge before every scheduled thing. *Trigger:* any future commitment (appointment, collection slot, session, payment due). *Path:* `communication.reminder.scheduled` at policy offsets → send → delivery receipt → response handling (confirm/reschedule links). *Exceptions:* channel failure → fallback ladder; quiet-hours and frequency caps enforced globally (D15 policy — no module may spam past them). *KPIs:* no-show delta vs reminder pattern · confirm-response rate. *Auto/AI:* send-time optimization. *Audit:* A1.

**WF-31 · Recall** (P5, single-shot form of WF-33) — *Objective:* one due-thing, one outreach, measured. *Trigger:* follow-up window closing, post-discharge day-N, result-driven review-due, `engagement.patient.inactive`. *Path:* recall task → outreach → booked (attributed!) / declined / silent-escalation. *KPIs:* recall conversion (G3's atom). *Audit:* A1 + consent.

**WF-32 · Health Campaign** (P5, cohort) — *Objective:* WF-33's loop, broadcast: a defined cohort, one program, full consent discipline. *Trigger:* org launches (season flu drive, screening camp, dormant-patient winback) → `communication.campaign.launched` *(proposed)*. *Path:* cohort resolved (consented, criteria from D16 read models) → staggered sends → responses become ordinary bookings → campaign report (cost per recovered patient). *Exceptions:* opt-out spikes → auto-pause + owner alert (reputation guard). *KPIs:* conversion per campaign · opt-out rate · revenue attribution. *Auto/AI:* cohort suggestion; variant testing. *Audit:* A1 + consent evidence per send.

**WF-34 · Vaccination** (P5) — WF-33 with the immunization schedule as the program: enrollment at first pediatric visit → due-date ladder from the national schedule → reminders → visit → dose recorded (D9, feeds the schedule's next arm) → certificate artifact. *Exceptions:* missed dose → catch-up rules (schedule-aware, not naive +30 days); stock linkage (vaccine cold-chain, WF-15). *KPIs:* schedule adherence · drop-off by dose. *Audit:* A2 (immunization records are legal documents).

**WF-35 · Preventive Care** (P5) — WF-33 with age/risk screening tables as the program (the diagnostic wellness engine, APS-012 §05): risk profile → due screenings → outreach → package booking → results feed trends → next interval computed. *KPIs:* screening uptake · early-detection instances (the marketing gold, methodology-visible per APS-012 §07). *Audit:* A1/A2 standard.

---

## 5. Event registry proposals (per APS-018 Part 9 process)

New events this document requires, submitted to the registry with owning publishers — APS-018's catalog v1 remains intact; these are additive:

| Proposed event | Publisher | Pri | Audit | Needed by |
|---|---|---|---|---|
| `scheduling.appointment.no_show` | D6 | P1 | A1 | WF-02 (booked-appointment counterpart of `session.no_show`) |
| `orders.sample.collected` / `.rejected` | D8 | P1 | A2 | WF-09/10 |
| `clinical.result.amended` | D9 | P1 | A2 | WF-09/11 (E1-compliant correction) |
| `orders.referral.created` / `.accepted` / `.completed` | D8 | P2 | A2 | WF-07 |
| `billing.estimate.issued` | D10 | P2 | A2 | WF-16 |
| `billing.refund.issued` | D10 | P1 | A2 | WF-19 |
| `inventory.stock.below_reorder` / `.received` / `inventory.batch.expiring` | D13 | P2 | A1/A2 | WF-15/28 |
| `assets.maintenance.due` / `.completed` / `assets.machine.down` | D13 | P2 / **P0 candidate** | A2 | WF-29 (answers APS-018 review Q3: machine-down joins P0 where live sessions depend on the asset) |
| `workforce.roster.published` | D3 | P2 | A1 | WF-27 |
| `organization.department.created` / `organization.location.added` | D2 | P2 | A2 | WF-25/26 |
| `communication.campaign.launched` / `.completed` | D15 | P2 | A1 | WF-32 |
| `engagement.care_gap.identified` | D16 (derived) | P3 | A1 | WF-33/34/35 |
| `workflow.instance.*` family (§1) | Engine | per table | A1 | all |

## 6. Cross-workflow dependencies

```
WF-25 Org Setup ─ spawns → WF-23/24 Onboarding ─ enables → WF-27 Shifts ─ feeds → all P1 capacity
P1 encounters ─ emit orders → P2 fulfillment (WF-09..14) ─ consume stock → WF-15 → WF-28 procurement
P1/P2 facts ─ charge → WF-16→17→18/19 revenue pipeline ─ payer branch → WF-20→21→22
WF-05 Admission ─ requires → WF-20 (insured) · contains → P2 instances · exits via → WF-06 Discharge
WF-06 ─ arms → WF-31 post-discharge recall;  P1/P2 completions ─ re-arm → WF-33/34/35 loops
WF-33..35 responses ─ create → WF-02 bookings  (the flywheel: care → engagement → care)
WF-29 machine down ─ constrains → D6 capacity → forces re-slotting in P1/P5 recurring rosters
```
Reading: **P4 builds the stage, P1 performs, P2 fulfills, P3 monetizes, P5 brings the audience back.** Dependencies are all event-mediated — no workflow calls another; spawning = emitting the trigger fact with shared correlation.

## 7. Workflow governance principles

| # | Principle |
|---|---|
| W1 | **Choreography by default; orchestration only for deadlines, joins, timer loops, or compensation** (§1). Each orchestrated workflow names which criterion admits it. |
| W2 | **The engine is an actor** — grants, commands, `workflow.*` events only; never another domain's publisher; its absence never blocks care. |
| W3 | **Workflow definitions are versioned configuration** (org-level policy knobs on platform-level skeletons); instances complete on the version they started; migrations are explicit. |
| W4 | **Every instance is correlated** — one `correlationId` per journey, propagated by causation; a journey with unlinked events is a defect. |
| W5 | **Stalls are events, silence is forbidden** — every step with a deadline has an owner and an escalation; `workflow.instance.stalled` is the platform's single stuck-work vocabulary (worklists, ageing, TAT breaches are all its projections). |
| W6 | **Exceptions are named paths, not error states** — LAMA, sample rejection, denial, opt-out are modeled facts with owners; if operations can reach a state the workflow can't name, the definition is incomplete. |
| W7 | **Compensation over rollback** — journeys never un-happen; they close via compensating facts (credit note, re-collection, abandonment-with-reason) per E1. |
| W8 | **KPIs are properties of workflows, not screens** — each definition names its metrics; D16 computes them from the instance stream; a workflow without KPIs doesn't ship. |
| W9 | **Human agency is never orchestrated away** — engines assemble, remind, escalate; clinical and financial decisions remain authorized human commands (APS-018 Part 8 law extends to automation generally). |
| W10 | **New workflows enter by definition, not by code fork** — trigger + steps + deadlines + KPIs registered like events; if a proposed workflow needs a new domain, that's an APS-013 amendment first. |

## 8. Future extensibility & alignment

- **New org types / service lines** compose existing patterns (home-care visit = P1 with travel leg; camp = WF-32 + mobile WF-10). A genuinely new *pattern* (e.g., population-health contracts) is a Phase-3 architecture event, not a quiet addition.
- **Plugins (APS-021)** will attach at three sanctioned points: subscribe to workflow events, contribute steps to org-configurable segments, and register new P5 programs — never modify platform skeletons.
- **AI (APS-022)** inherits every *AI opportunity* named above as a subscriber/proposer per APS-018 Part 8; workflow instances give AI its unit of context (the journey, not the isolated event).
- **Cross-org workflows (D17):** WF-07 referral and WF-09 partner-routing are the templates — the workflow spans orgs while each org's events stay in its own tenancy, joined by correlation; the network (R6) inherits this without new machinery.
- **Alignment:** every workflow above maps to APS-012 operations (§02–07 evidence), APS-013 ownership (no workflow writes across a domain boundary), APS-014 modules (worklists are workflow projections), APS-015 journeys (OJ1–OJ6 are these workflows seen from a role's chair), APS-016 FRs (FR-04→WF-01/02, FR-10→WF-20/21, FR-13→WF-30–35…), APS-018 events (all sequences drawn from the catalog + §5 proposals).

**Review questions:** (1) `assets.machine.down` as P0 where live sessions depend on the asset — confirm (closes APS-018 Q3). (2) WF-16 estimate-variance proactive-communication threshold — platform default or org-only policy? (3) WF-03 emergency's provisional-identity flow — acceptable DPDP posture pending APS-023's data ruling? (4) Should WF-32 campaigns require owner-grade approval always, or delegate by grant?

