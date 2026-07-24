# APS-016 — Auriva Organization Platform · Product Requirements Documentation

**Phase 1 · Session 5 — Product Documentation** · 03 Jul 2026 · Status: For executive review
Synthesizes: APS-012 (business), APS-013 (domains), APS-014 (IA), APS-015 (UX), APS-001–011 (design track), `technical-debt.md` (engineering foundation).
This document is the executive contract: what Auriva is, for whom, in what order, and under what constraints. Detail lives in the referenced documents; nothing here overrides them.

---

## 1. Product Vision

**Auriva is India's Healthcare Operating System — one platform on which any healthcare organization runs its entire operation, and across which a patient's care travels intact.**

Today the median Indian provider runs on paper registers, WhatsApp, Excel and a billing tool; the patient's story fragments across every organization that touches them; and two structural shifts — ABDM's identity/record rails (~90 crore ABHA accounts) and NHCX's standardized claims — have made the connective tissue nationally legal and technically standard for the first time (APS-012 §01).

Auriva's answer is a Shopify-class platform, not another per-segment product: **one kernel, activatable modules, org type as configuration** (APS-013). A solo clinic, a diagnostic chain and a 300-bed hospital run the same platform with different modules on — and because they share rails, the referral, the prescription, the report and the claim finally flow *between* them (APS-012 §08, the network insight).

**Vision statement:** every healthcare organization in India, from a one-doctor clinic to a hospital network, operating on one platform where time is transparent, records are longitudinal, money is honest, and care follows the patient.

## 2. Product Principles

| # | Principle | Source |
|---|---|---|
| P1 | **One platform, many configurations.** Org type is a preset, never a fork. A capability ships when it works as configuration. | APS-013 §1, §6 |
| P2 | **Fix the workflow, don't embalm it.** The eight challenged workflows (C1–C8: waiting-room buffer, discharge-as-paperwork, human API gateways, memory-based follow-up, paper Rx, unexplained reports, commission referrals, monthly-dispute settlements) are defects; Auriva ships their replacements, never their digital twins. | APS-012 §08 |
| P3 | **The record outlives the org; the patient is known once.** Patient-scoped existence, org-scoped access, ABHA-linked portability. | APS-013 D5/D9 |
| P4 | **Events up, dependencies down.** Care never depends on money; money never depends on analytics; compliance is a byproduct of operating, never a second workflow. | APS-013 §1, D14 |
| P5 | **Truth on every surface.** Live boards over stale reports; every number links to the view that proves it; estimates and bills visible continuously. | APS-015 §3 |
| P6 | **Software pays for itself in visible money or time.** Every module must name its rupees-or-minutes claim; customers are revenue-anxious owner-operators. | APS-012 §01 |
| P7 | **Roles see their job, nothing else.** Navigation, search and actions are grant-shaped; a receptionist's platform is four calm items. | APS-014 §7 |
| P8 | **No invented business rules.** Every product behavior traces to evidenced operations (APS-012) or explicit configuration. | Architecture constraint (standing) |

## 3. Business Goals

| # | Goal | Measure (validate targets with design partners before committing numbers externally) |
|---|---|---|
| G1 | Prove the platform thesis: six org types on one codebase via configuration | Each archetype onboarded as configuration only — zero forked code (the APS-013 §6 test, held in production) |
| G2 | Win daily-use primacy in the clinic segment against free-EMR incumbents | Front-desk daily active usage; walk-in-to-token time ≤ 60s; queue transparency adopted by patients (APS-012 §02) |
| G3 | Convert the industry's silent losses into attributed platform value | Measured recall-recovered visits, capture-rate lift, discharge-TAT reduction, claim-denial reduction — per org, on their Insights |
| G4 | Be the ABDM/NHCX-native choice as rails mature | Share of orgs with ABHA-linked records and NHCX-submitted claims through Auriva |
| G5 | Establish the cross-org network as the moat | Orders/records/claims crossing org boundaries on-platform (the metric that no per-segment competitor can copy) |

## 4. User Personas

Primary personas (org workspace); doctor-clinical and patient personas are owned by the delivered APS-009/010 tracks.

| Persona | Reality | Wants from Auriva | Success looks like |
|---|---|---|---|
| **Dr. Owner** — solo clinic GP/specialist, clinician + CEO + CFO | Revenue capped by their hours; reception is a single point of failure; follow-up leakage invisible (APS-012 §02) | Full clinic visibility without becoming an operator; more earned revisits | Opens Insights twice a week; recall engine measurably refills the calendar |
| **Riya, Receptionist** — the floor's operating system | Queue chaos, phone pressure, panel paperwork evenings | Speed and calm: token in a minute, honest ETAs she isn't blamed for | Lives in Operate; angry-waiting-room moments drop |
| **Center Manager** — multi-specialty ops head | Consultant delays cascade onto her reputation; payout disputes; leakage unmeasured (§03) | Schedule truth, transparent settlements, capture-rate levers | Consultant retention up; monthly payout disputes → zero |
| **Visiting Consultant** — the scarce actor, engaged at 2–3 orgs | Opaque payouts, no unified view of their engagements | Their statement, continuously visible; frictionless multi-org identity | Chooses to admit/consult where the platform runs |
| **Hospital MS / Owner** — 50–300 beds | Discharge TAT, receivables ageing, consultant loyalty, nursing churn (§04) | Bed/OT truth, claims automation, family-communication cover | Discharge hours recovered; denial rate down; beds turn faster |
| **TPA Desk Lead** — revenue-cycle operator | Swivel-chair portals, query ping-pong, blamed for denials | Claims assembled from the record; a worklist of exceptions only | Re-typing eliminated; ageing visible before it rots |
| **Lab Director** — hub + collection network | TAT trust, NABL paperwork, commission-taxed margins (§05) | TAT visibility B2B clients trust; compliance as byproduct; trend data as product | B2B churn down; audit prep from days to hours |
| **Pharmacy Ops Head** — 20-store chain | Dead-stock/stockout paradox, refill leakage, pharmacist compliance (§06) | Refill engine, e-Rx rails, store-level demand truth | Chronic refill retention measurably up |
| **Therapy Coordinator** — dialysis/day-care floor | Standing-slot roster in Excel; no-shows unrecoverable; per-session pre-auth grind (§07) | The grid as software: absence prediction, one-tap backfill, batch pre-auths | Utilization points gained; clerical evenings gone |

## 5. Organization Types

The six archetypes (full operating models in APS-012 §02–07; activation presets in APS-014 §3.1):

| Type | Capacity economics | Platform preset emphasis |
|---|---|---|
| Independent Clinic | Doctor-hours | Front Desk, Appointments, Patients, Billing, recall (D15) |
| Multi-specialty Clinic | Consultant slots × capture rate | + Encounters, Settlements, Claims, capture Insights |
| Hospital | Bed-days & OT-hours | + Admissions (Encounter containers), full Claims, Inventory at depth |
| Diagnostic Center | Analyzer throughput & TAT | Diagnostics module, B2B accounts, reagent Inventory, compliance registers |
| Pharmacy Chain | Footfall × basket × refill retention | Pharmacy/POS mode, SKU Inventory, refill recall, multi-location |
| Day Care Center | Slots filled | Therapy Floor, Recurring Rosters, per-session Claims, kit Inventory |

## 6. Module Overview

Sixteen workspace modules over seventeen domains — the complete catalog is APS-014 §4 (modules → submodules → owning domains) and APS-013 §2 (domain definitions). Executive summary:

- **Operate** (the floor): Front Desk · Appointments · Patients · Encounters · Diagnostics · Pharmacy · Therapy Floor
- **Manage** (people, services, money): People · Services & Pricing · Billing · Claims & Payers · Settlements · Inventory
- **Understand:** Insights (read-only, every number links to evidence)
- **Configure:** Settings (policy; locations, departments, roles, module activation, integrations, audit)

Platform-shared (all workspaces): identity & roles, global search, notifications & recall engine, consent & audit — per APS-003 shared-module contract.

## 7. Capability Matrix

Canonical matrix: **APS-014 §3.1** (module × org type, ●/○/—). It is simultaneously the packaging skeleton (what each preset includes), the sales capability sheet, and the engineering activation spec — one table, three uses, kept in one place by design. This PRD adds the packaging rule: **presets are starting points, not tiers** — any ○ module can be activated for any org without commercial re-platforming; pricing (open question, §13-A6) may meter modules but must never fork the product.

## 8. Functional Requirements

Executive-level requirements; FR-IDs are traceable to domains (D-refs, APS-013) and journeys (OJ-refs, APS-015). Acceptance detail belongs to feature PRDs cut from this table.

| ID | Requirement | Trace |
|---|---|---|
| FR-01 | Register and configure an organization: type preset, locations, departments, resources, module activation — with every activation live on all four surfaces (nav, search, notifications, settings) | D2 · APS-014 §3.1 |
| FR-02 | Grant-shaped access: roles from the actor catalog plus custom roles with location/department qualifiers; sidebar and actions derive from grants; every denial names its missing grant | D1/D3 · APS-014 §7, APS-015 §8 |
| FR-03 | One patient identity org-wide with ABHA linking, duplicate merge, family relationships; registry never per-location | D5 · APS-014 §8 |
| FR-04 | All four scheduling shapes: walk-in queues with live position/ETA, slotted appointments, resource-bound lists, standing recurring rosters with absence handling and waitlist backfill | D6 · OJ1/OJ4 |
| FR-05 | Walk-in registration to token in ≤ 60 seconds; check-in optimistic with live board patch | D5/D6 · OJ1 |
| FR-06 | Encounter lifecycle for consult, session and admission profiles; admission as container; active-encounters board with discharge countdown | D7 · APS-013 Q2 |
| FR-07 | Orders as first-class objects: prescription, diagnostic, procedure; routing in-house or to partner orgs; fulfillment status visible to the orderer; substitution recorded with reason | D8 · OJ3 |
| FR-08 | Clinical results filed as structured data with longitudinal trends; critical values alert the prescriber; reports carry patient-comprehension layer | D9 · APS-012 §05 |
| FR-09 | Cash ledger: invoices from catalog prices, running bills, deposits, discounts with authority ladder (over-authority converts to approval request), day close as a report | D10 · OJ6, APS-015 §8 |
| FR-10 | Payer ledger: empanelments and rate cards; pre-auth lifecycle incl. per-session batches; claims assembled from the operational record and submitted via NHCX; denials/deductions worklist; receivables ageing | D11 · OJ2 |
| FR-11 | Settlements: attribution at transaction time; continuously visible statements for providers, B2B accounts, franchise/referral contexts — no month-end reconciliation event exists | D12 · C8 |
| FR-12 | Inventory: batch/expiry stock, kits, transfers, supplier purchases, expiry/returns worklists, asset maintenance logs | D13 · APS-012 §06 |
| FR-13 | Recall engine: follow-up windows, chronic recalls, refill predictions, standing-slot absence outreach — outcomes measurable as attributed bookings | D15 · C4, G3 |
| FR-14 | Notifications in three classes (alerts to role-on-duty with escalation, approvals inbox, digests); every notification deep-links to canonical location | D15 · APS-014 §6-N |
| FR-15 | Global search (⌘K): role-filtered results across active modules, entity prefixes, actions-as-commands | D1 + all · APS-014 §5 |
| FR-16 | Compliance registers (H1, QC, machine logs, audit trails) generated from operational events; exportable for inspection; org-wide audit log | D14 · APS-013 Q5 |
| FR-17 | Insights: canonical metric definitions (capture rate, leakage, TAT, utilization, ageing) with drill-to-evidence; location comparison for granted roles | D16 · G3 |
| FR-18 | Multi-location scoping: explicit scope switcher, grouped operational summaries (never merged live boards), location-fixed stock and stations | D2/D6/D13 · APS-014 §8, OJ5 |
| FR-19 | Multi-org identity: one person, n engagements; org switcher with full context reset; per-org role composition | D1/D3 · APS-013 Q3 |
| FR-20 | Consent-managed record exchange and cross-org order routing on ABDM rails; partner-org relationships (backup hospital, preferred lab) as configuration | D17/D5 · APS-013 Q1 |

## 9. Non-functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | APS-008 budgets are contractual: input acknowledged < 100ms; content or skeleton < 1s; long work named and async > 10s. Live boards patch in place; no full refreshes. |
| **Availability & resilience** | The floor must run through connectivity blips: Operate surfaces degrade to read + queue-local actions with reconciliation on reconnect; token display self-recovers. Explicit SLO setting deferred to first paying cohort — but *design for* 99.9 on operate paths. |
| **Security & privacy** | DPDP-compliant consent and purpose limitation; role- and scope-checked authorization on every read (result-level search filtering); clinical writes pessimistic and signed; full audit custody (D14). PHI never in logs, exports watermarked with scope. |
| **Interoperability** | ABHA/HFR/HPR registries, ABDM consent-manager exchange (FHIR at the boundary), NHCX claims as the standard payer interface; portal adapters are legacy fallbacks, not the architecture. |
| **Scalability** | One org = 1 doctor to 300 beds; one deployment = thousands of orgs; module activation without redeploy; the org-group seam (chains) pre-designed (APS-013 D2). |
| **Usability & access** | Compact-density desktop for org roles (min 1280); WCAG-grade contrast and focus visibility (APS-002 P5); keyboard-first operate flows; English-first with the vocabulary layer ready for Indic localization (assumption A5). |
| **Data** | Patient-scoped record persistence independent of org lifecycle; org offboarding exports complete, readable data (no hostage records — trust is a feature); retention per D14 policy settings. |
| **Auditability** | Every state transition carries actor + timestamp (already platform law, APS-008 §09); registers reproducible from events at any past date. |

## 10. Product Roadmap

Two tracks run in parallel: **Foundation** (engineering debt M1–M5 from `technical-debt.md`: real auth → organization schema → tenancy enforcement → contract hygiene → time/concurrency correctness) and **Releases** (below). Foundation M1–M3 gates R1 GA; nothing in R2+ starts on unhardened tenancy.

| Release | Theme | Activates (new) | Exit test |
|---|---|---|---|
| **R1 — Clinic, complete** | Harden and finish the built slice: queue transparency, recall engine, day close, panel-claims-lite | D15 recall · Billing depth · Insights v1 | A solo clinic runs its whole day on Auriva; G2 metrics live; M1–M3 done |
| **R2 — Multi-specialty** | The capture-and-settlement release | D7 encounters · D12 settlements · capture Insights · discount ladders | A polyclinic's consultant payouts have zero month-end disputes; capture rate on Insights |
| **R3 — Diagnostics & Pharmacy** | The orders release: two fulfillment archetypes prove D8 | Diagnostics module (worklist→results, TAT) · Pharmacy module (dispense/POS) · Inventory core · cross-org e-Rx/order pilot (D17 seam, partner pairs) | A lab and a pharmacy run standalone; a clinic order crosses to both on-platform |
| **R4 — Day Care & Claims** | Recurring care + the payer ledger at full depth | Therapy Floor · Recurring Rosters · D11 full claims via NHCX · per-session pre-auth batches | A dialysis center runs its grid on Auriva; claims submitted NHCX-native |
| **R5 — Hospital** | Admissions: encounter containers, beds/OT, discharge pipeline | Admission profile · bed/OT resource lists · discharge countdown (C2) · running bills at IPD depth | A 50–150 bed hospital's discharge TAT measurably drops |
| **R6 — Network** | The moat: exchange as product | D17 general availability: referrals-with-data, record exchange, partner directories, network Insights | G5 metric nonzero and growing without hand-holding |

Sequencing logic: each release onboards **one new archetype** while deepening shared domains, so the P1 configuration thesis is re-proven at every step (G1); the riskiest integration (NHCX) lands one release before the archetype that depends on it hardest (hospital); the network ships last but its seams ship first (R3 pilot).

## 11. Release Strategy

- **Design-partner model:** each release is built with 3–5 named partner orgs of that archetype (mix of tier-1/tier-2), live from alpha; GA requires the exit test holding at partners for a full billing cycle.
- **Config-only onboarding:** onboarding an org may never require engineering work — presets + Settings must suffice (G1 enforced commercially, not just architecturally).
- **No big-bang migrations:** modules activate on live orgs; data model changes ship expand-then-contract; a release never forces workflow retraining of roles it doesn't touch (a receptionist's four items survive every release).
- **Trust artifacts per release:** each GA publishes its rupees-or-minutes evidence from partners (P6) — the sales asset *is* the Insights screenshot.
- **Doctor/patient surfaces:** already-live consumer and doctor workspaces evolve continuously and independently (X5 boundary); org releases must not gate them.

## 12. Risks

| # | Risk | Mitigation |
|---|---|---|
| RK1 | **Free-EMR land grab** (HealthPlix/Eka-class) commoditizes the clinic wedge before R2 differentiators land | R1 leads with what free tools structurally lack: queue transparency + attributed recall revenue (P6 evidence, G2) |
| RK2 | **Behavior change at the front desk fails** — software slower than the register on day one | The ≤ 60s walk-in budget is a hard requirement (FR-05); Operate designed keyboard-first; partner receptionists co-design (OJ1 timing demo in Figma before code) |
| RK3 | **Breadth trap:** six archetypes dilute execution | One archetype per release (roadmap discipline); the activation matrix is the scope fence — no ad-hoc modules (Session 4 rule holds product-wide) |
| RK4 | **NHCX/ABDM pace or policy shifts** | Rails are interfaces behind D11/D17; portal adapters remain as fallback; never bet a release's exit test on a regulator's date (R4 exit test is NHCX-native but R4 value stands on Therapy Floor alone) |
| RK5 | **Commission-economy resistance** — earned-referral positioning threatens entrenched interests (APS-012 C7) | Don't moralize; ship the convenient clean path (service-based referral value) and let economics migrate; no platform feature may automate kickbacks |
| RK6 | **DPDP/consent misstep** destroys trust disproportionately in healthcare | NFR security row is non-negotiable scope in R1, not hardening-later; D14 audit custody ships before scale |
| RK7 | **Engineering debt outruns product** (technical-debt.md register) | M1–M3 gate R1 GA (roadmap); debt register reviewed each release cut |
| RK8 | **Vocabulary drift across five sessions' documents** | Session 5 owns the canon (§14 note); one known collision already exists — technical-debt.md's risk IDs D1–D13 vs APS-013 domain IDs D1–D17 — **action: re-prefix debt risks to TD-1…TD-13 at next register update** |

## 13. Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A1 | Private, fragmented provider market persists as the customer base (APS-012 §01) | Segment priorities reorder; platform thesis unaffected |
| A2 | ABDM/NHCX adoption continues on its current trajectory | RK4 fallbacks carry more load, longer |
| A3 | Owner-operators pay for demonstrated money/time value even where software habits are weak | P6 evidence model is the test; pricing model (A6) adjusts |
| A4 | One codebase serves all six archetypes via configuration at production depth (proven architecturally in APS-013 §6; unproven at scale) | G1 exit tests exist to catch this early — a fork request is a five-alarm signal |
| A5 | English-first UI is acceptable for org-workspace roles at launch; patient surfaces already assume multilingual need | Localization pulls forward in roadmap |
| A6 | *Open:* pricing/packaging model (per-module metering vs per-seat vs volume) — deliberately unresolved; the capability matrix is built so any of the three fits without product change | Commercial decision post-R1 partner data |

## 14. Future Expansion

Directions the architecture already accommodates (each traces to a designed seam — none requires re-architecture):

- **The care network as marketplace:** earned-referral directories, partner discovery, network-level quality signals (D17 + D16 — the post-R6 product).
- **Intelligence on the event stream:** ambient scribing for the 6-minute consult, no-show and demand prediction, report interpretation, deduction-pattern learning (D15/D16 consumers; the event backbone is the moat data).
- **Financial services on platform truth:** receivables-backed working capital, settlement rails for B2B/payouts — the ledgers (D10–D12) are the underwriting data (APS-012 §04 receivables pain).
- **Care-at-home:** home collection is R3-native; home dialysis/chemo supervision extends Therapy Floor's model (APS-012 §07 trend).
- **Government & public-sector variants:** the same presets serve public dispensaries/scheme programs if pursued — configuration, not fork.
- **International:** the kernel is geography-neutral; ABDM/NHCX sit behind D17/D11 interfaces by design — a second country is a rails swap plus catalog/compliance packs.

---

**Vocabulary note (canon):** module and domain names in this PRD are the APS-013/014 canonical terms; future documents must not coin synonyms. This PRD, with its referenced stack (APS-012 → 015), constitutes the complete Product Requirement Documentation for the Auriva Organization Platform. **Phase 1 (Sessions 1–5) is complete.**
