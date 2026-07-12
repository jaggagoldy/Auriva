# APS-013 — Auriva Domain Architecture (Domain Map)

**Phase 1 · Session 2 — Domain Architecture** · 03 Jul 2026
Feeds on: [APS-012 Business Blueprint](../design/aps-012-business-architecture.html) (six org archetypes, nine shared primitives, challenges C1–C8, open questions Q1–Q5)
Feeds into: Session 3 (Information Architecture — already partially delivered as APS-003) and the platform roadmap.

**Scope discipline:** no code, no APIs, no database design. This document models the healthcare organization from first principles and produces the complete Domain Map — what the domains are, what each owns, and how they relate. Every domain is grounded in operations evidenced in APS-012; none invents business rules.

---

## 1. Platform thesis: think Shopify, not HIMS

Every incumbent healthcare vendor builds a *product per organization type* (a clinic app, a hospital HIMS, a LIS, a pharmacy POS) and thereby reproduces the industry's silos. APS-012 §08 showed why that's wrong: all six org archetypes run the **same nine operational primitives** in different costumes.

Shopify's insight was identical: a bookstore and a furniture chain are not two products — they are two *configurations* of one commerce kernel (catalog, cart, order, payment, fulfillment) plus optional modules. Salesforce's insight was the same for CRM (one object model, per-industry configuration, an extension platform).

Auriva's equivalent:

- **One kernel** — the domains every healthcare organization needs no matter what it is.
- **Domain modules** — capabilities an organization switches on based on what it does (claims desk, inventory, recurring therapy scheduling).
- **Configuration, not forks** — an org *type* (clinic, hospital, lab, pharmacy, day care) is a preset of module activations and settings, never a separate codebase.
- **A network layer** — because the patient's episode crosses organizations (APS-012 §08 network insight), the platform is organization-plural by design, with ABDM/NHCX as the public rails.

### Layering

```
┌────────────────────────────────────────────────────────────┐
│  L4  NETWORK        Inter-org exchange, referrals, ABDM     │
├────────────────────────────────────────────────────────────┤
│  L3  INTELLIGENCE   Analytics · Communication & Recall      │
│      & CROSS-CUT    Compliance & Quality                    │
├────────────────────────────────────────────────────────────┤
│  L2  COMMERCE       Billing · Payers & Claims               │
│                     Settlements & Attribution · Inventory   │
├────────────────────────────────────────────────────────────┤
│  L1  CARE OPS       Patient · Scheduling · Encounter        │
│                     Orders & Fulfillment · Clinical Record  │
├────────────────────────────────────────────────────────────┤
│  L0  KERNEL         Identity & Access · Organization        │
│                     Workforce · Catalog & Pricing           │
└────────────────────────────────────────────────────────────┘
```

Rules of the layering:

1. **Dependencies point downward only.** L1 may depend on L0; L2 on L1/L0; never the reverse. The kernel knows nothing about care, care knows nothing about money, money knows nothing about analytics.
2. **Upward communication is by events.** An Encounter doesn't call Billing; it emits `encounter.completed`, and Billing reacts. This is what keeps modules optional — if an org has no Billing module active, the event simply has no subscriber.
3. **Analytics and Communication subscribe to everything, own nothing operational.**

### Mapping the Session 2 brief's example list

The brief's example chain maps into this domain map as follows — nothing is dropped, several items are grouped where they share an owner:

| Brief item | Lives in domain |
|---|---|
| Organization, Locations, Departments | **D2 Organization & Structure** |
| Resources | **D2** (structural registry) + **D6 Scheduling** (bookable capacity) |
| People, Doctors (as staff) | **D3 Workforce & Engagement** |
| Patients | **D5 Patient** |
| Appointments, Queue | **D6 Scheduling & Access** |
| Consultation | **D7 Encounter** |
| Prescription, Diagnostics (as orders) | **D8 Orders & Fulfillment** |
| Diagnostics (as results/records) | **D9 Clinical Record** |
| Billing | **D10 Billing & Payments** |
| Finance | **D10** (cash) + **D11 Payers & Claims** + **D12 Settlements & Attribution** — APS-012 §08 showed "finance" is really *two ledgers plus attribution*, so it is modeled as three domains |
| Inventory | **D13 Inventory & Supply** |
| Analytics | **D16 Analytics & Insights** |

---

## 2. The Domain Map

Seventeen domains. Each is defined by the six mandated lenses: **Purpose · Responsibilities · Relationships · Ownership · Dependencies · Extensibility.**

"Ownership" below means *source-of-truth ownership*: which domain is the only writer of a concept. Other domains may hold references (IDs) and subscribe to its events, never write its data. This is the Salesforce-style discipline that keeps modules composable.

---

### L0 — Kernel (every organization, always on)

#### D1 · Identity & Access

- **Purpose:** Who is acting, and what are they allowed to do — one answer, platform-wide.
- **Responsibilities:** Accounts, authentication, sessions; the authorization decision point (already centralized in `src/domain/authorization.ts` — this domain is its permanent home); linking one human to multiple contexts (a person can be a doctor at two orgs *and* a patient at a third — one identity, several hats).
- **Relationships:** Every domain consults D1 for authorization; D3 (Workforce) and D5 (Patient) attach role-specific profiles to D1 identities.
- **Ownership:** Users, sessions, credentials, permission decisions. *Not* roles' meaning (D3 owns what a "doctor" is; D1 only enforces).
- **Dependencies:** None. The bottom of the stack.
- **Extensibility:** New actor types (lab technician, pharmacist, counselor — APS-012 actor catalog) are new role grants, not new auth systems. ABHA-linked patient login and HPR-verified professional identity plug in as additional identity providers without touching consumers.

#### D2 · Organization & Structure

- **Purpose:** The org itself and its physical/logical shape — the tenancy root of everything.
- **Responsibilities:** Organization record and its **type-as-configuration** (clinic / multi-specialty / hospital / diagnostic / pharmacy / day-care = preset of module activations, per §1); Locations (branches, collection centers, stores — the hub-and-spoke shapes in APS-012 §05–06); Departments/Units (OPD, OT, ICU, lab sections, dialysis floor); the structural Resource registry (rooms, chairs, machines, beds — what exists, where).
- **Relationships:** Every domain scopes its data to an Organization. D6 (Scheduling) turns D2's resources into bookable capacity. D14 (Compliance) attaches licenses/registrations to locations.
- **Ownership:** Org identity, org type & module activation, locations, departments, resource existence. *Not* resource availability (D6) or resource maintenance state (D13 for machines under AMC).
- **Dependencies:** D1 only.
- **Extensibility:** This is the **Q1 answer's foundation** (see §4): a future org-group (a chain, a hospital + its day-care satellites) is a relationship *between* organizations, not a bigger organization. Today's code maps Organization onto Clinic (`src/domain/organization.ts`) exactly so this domain can grow without consumer changes.

#### D3 · Workforce & Engagement

- **Purpose:** The people who deliver and run care — and the *terms* on which they do, because APS-012 found the scarcest actor in every archetype is external (visiting consultant, sessional anesthetist, part-time pathologist).
- **Responsibilities:** Staff profiles and roles (today: owner/doctor/receptionist via `memberRoleFromSpecialty`; tomorrow: the full actor catalog); **Engagements** — the relationship between a person and an org: employed, visiting, sessional, fee-share terms, working schedules; rosters and shifts (hospital nursing, lab sign-off duty, day-care tech shifts).
- **Relationships:** D6 consumes working schedules as capacity; D12 consumes engagement terms for payout attribution; D1 consumes membership for authorization.
- **Ownership:** Membership, roles, engagement terms, rosters. *Not* what a doctor did clinically (D7/D9) or what they're owed (D12 computes it from D3's terms).
- **Dependencies:** D1, D2.
- **Extensibility:** **Answers Q3** (see §4): a person is one platform identity with *n* engagements across *n* organizations. A consultant's Tuesday clinic and Thursday hospital list are two engagements of one person — which is precisely what makes cross-org schedule truth (APS-012 §03 pain) possible later.

#### D4 · Catalog & Pricing

- **Purpose:** What the organization offers and at what price — the Shopify "products" of healthcare.
- **Responsibilities:** Service catalog (consult types, tests, procedures, packages, sessions); price lists and **rate cards per payer context** (cash price, panel rate, PM-JAY package, B2B trade rate — the multi-price reality in every APS-012 archetype); package composition (a cataract package = OT + lens + consult + review); validity and versioning of rates (the "rate card from three revisions ago" dispute, APS-012 §05).
- **Relationships:** D6 books against catalog items; D8 orders them; D10 prices bills from them; D11 maps them to payer packages; D12 attributes shares from them.
- **Ownership:** Service definitions, prices, packages, rate-card versions.
- **Dependencies:** D1, D2.
- **Extensibility:** New service lines (genomics panels, home-collection fees, teleconsults) are catalog entries, not features. A pharmacy's 20,000 SKUs and a hospital's OT packages are the same domain at different cardinalities — the SKU-heavy variants lean on D13 for stock identity while D4 owns sellability and price.

---

### L1 — Care Operations

#### D5 · Patient

- **Purpose:** The person receiving care, known longitudinally — not per-visit, not per-org (the anti-"fourth UHID this year" domain, APS-012 §03).
- **Responsibilities:** Demographics, contact, ABHA linkage; family/household relationships (already real in the built patient workspace — Family page); patient-org relationships (a patient "belongs" to no org but *relates* to many); consent records for data sharing (the D17 gateway's legal basis).
- **Relationships:** Everything clinical and financial references the patient. D17 exchanges patient context across orgs under consent.
- **Ownership:** Patient identity and demographics, family graph, consents. *Not* clinical content (D9), *not* money (D10/D11).
- **Dependencies:** D1 (a patient may have a login identity), D2 (org relationships).
- **Extensibility:** ABHA as the federating identity makes the platform's patient record *portable by rail, not by lock-in*. Caregiver/guardian acting-on-behalf (already implicit in the Family feature) generalizes to elder-care and pediatric proxies without remodeling.

#### D6 · Scheduling & Access

- **Purpose:** Match demand for care to supply of capacity — and kill the waiting-room-as-buffer (C1), the platform's single most visible promise.
- **Responsibilities:** All four scheduling shapes APS-012 evidenced, as one domain: (a) **walk-in queues** with live position and honest ETA (clinic §02 — already built: queue service, tokens, AppointmentEvent trail); (b) **slotted appointments** (lab home-collection, radiology, OPD bookings); (c) **resource-bound lists** (OT lists, bed allotment — capacity is the room/table/bed, not the person); (d) **standing recurring slots** (dialysis MWF/TTS grids, chemo cycles — a first-class object with absence handling and waitlist backfill, per §07 challenge). Converts D2 resources + D3 working schedules into bookable capacity; owns no-show/cancellation/reschedule lifecycle.
- **Relationships:** Booking references D4 (what) + D5 (who) + D3/D2 (with whom/where). A fulfilled booking opens a D7 Encounter. Emits the events D15 (Communication) turns into reminders and delay notifications.
- **Ownership:** Appointments, queues, slots, recurring rosters, capacity calendars.
- **Dependencies:** D2, D3, D4, D5.
- **Extensibility:** New scheduling shapes (home-visit routes for phlebotomists §05, delivery batching §06) are new capacity types under the same booking lifecycle. Predictive ETA (per-token time prediction, C1) layers on top of the event history without changing the model.

#### D7 · Encounter

- **Purpose:** The unit of care actually happening — the clinical spine every other record hangs off.
- **Responsibilities:** Encounter lifecycle and status machine (the platform already centralizes appointment status transitions — this generalizes it); the **encounter type spectrum** answering Q2 (see §4): consult (minutes), therapy session (hours, protocol-driven), admission (days, contains nested encounters like OT events and rounds); participants (patient + engaged staff); linkage of everything generated during it (orders, notes, charges) to one encounter ID.
- **Relationships:** Opened from D6 bookings (or directly — emergency walk-ins); D8 orders and D9 records are born inside encounters; D10 accumulates charges against encounters (the hospital running bill).
- **Ownership:** Encounter existence, state, participants, timeline.
- **Dependencies:** D5, D6, D3.
- **Extensibility:** The admission-as-container variant is *designed now, built when hospitals onboard* — the contained encounters (rounds, OT session, nursing shift-events) reuse the same primitive. Teleconsults are an encounter channel, not a new domain.

#### D8 · Orders & Fulfillment

- **Purpose:** Clinical intent made executable and *trackable across organizational boundaries* — the anti-black-hole domain (C5), and the structural exit from referral-by-commission (C7): referral earned by service means the order, result and context flow back to the prescriber.
- **Responsibilities:** Order types: prescription (medication), diagnostic order (tests/imaging), procedure/therapy order (including the standing order behind a dialysis roster — the clinical authority D6 schedules against); order lifecycle: placed → routed (in-house dept, or external org via D17) → fulfilled / partially fulfilled / substituted (pharmacy generic substitution §06 is a first-class fulfillment outcome, not a hack) → resulted/closed; fulfillment visibility back to the ordering clinician.
- **Relationships:** Born in D7 encounters; route in-house to D2 departments or cross-org via D17; fulfillment consumes D13 stock (pharmacy dispense, procedure kits); results filed into D9; charges signaled to D10.
- **Ownership:** Orders, routing, fulfillment status, substitution records.
- **Dependencies:** D7, D5, D4; D13 and D17 at fulfillment time.
- **Extensibility:** This is the platform's **network seam**: the same order object serves an in-house lab order (multi-specialty §03), a B2B lab-to-lab referral (§05), and a clinic→pharmacy e-Rx (§06) — only the routing differs. ABDM e-prescription rails plug into routing, not into the model.

#### D9 · Clinical Record

- **Purpose:** The longitudinal truth of the patient's health — the asset APS-012 §05 showed the industry throws away at PDF-delivery time.
- **Responsibilities:** Clinical notes (built for the 6-minute consult — templates/voice/assist, per §02 opportunity); structured results (lab values with trend lines across years — the "longitudinal results as product" opportunity); documents (reports, summaries, images by reference); session/protocol records (dialysis vitals per session §07); discharge summaries (assembled *during* the stay, not after — feeding C2's discharge pipeline); the patient-facing Health Summary (already built).
- **Relationships:** Written inside D7 encounters and by D8 fulfillments (a lab result is a fulfillment writing into the record); read by clinicians (D1-authorized) and by the patient; exchanged across orgs by D17 under D5 consent.
- **Ownership:** All clinical content. *The patient's record outlives any single organization's tenancy* — org-scoped access, patient-scoped existence. This is the domain where that distinction is enforced.
- **Dependencies:** D5, D7, D8.
- **Extensibility:** FHIR-shaped structured data aligns with ABDM exchange without dictating internal storage. Report-comprehension features (§05 opportunity: plain-language explanation, flag triage) are views over D9, not new domains.

---

### L2 — Commerce

#### D10 · Billing & Payments (the cash ledger)

- **Purpose:** Money from patients — priced honestly, visible continuously (the anti-billing-surprise domain, APS-012 §04 pain).
- **Responsibilities:** Invoices/bills from D4 prices; the **running bill** (hospital estimate-vs-actual visibility — C-class grievance killer); deposits and advances; POS-style retail billing (pharmacy §06); payments (cash/UPI/card), refunds, credit notes; discount policy with authority levels and an audit trail (the front-desk discount leakage, §03 pain); end-of-day reconciliation as a byproduct instead of a 9 PM manual ritual.
- **Relationships:** Consumes D7 encounter charges and D8 fulfillment charges; splits payer-covered portions out to D11; hands attribution facts to D12; feeds D16.
- **Ownership:** Bills, payments, discounts, the cash ledger.
- **Dependencies:** D4, D5, D7/D8 (charge sources).
- **Extensibility:** Payment rails (UPI intents, links, gateways) are adapters. Package billing, cycle billing (IVF §07), and B2B credit accounts share the invoice primitive with different terms.

#### D11 · Payers & Claims

- **Purpose:** Money from institutions — the second ledger APS-012 found running parallel in every archetype, and the C3 fix: humans on exceptions, software on paperwork.
- **Responsibilities:** Payer registry (TPAs, insurers, PM-JAY, corporate panels) and empanelment terms; eligibility checks; **pre-authorization lifecycle** (request → query ping-pong → approval/enhancement — including day-care's per-session variant, §07); claim assembly *from the operational record* (D7/D8/D9/D10 — not re-typed); submission via NHCX as the standard interface, portal adapters as legacy fallbacks; denial/deduction management and receivable ageing (the 30–90+ day working-capital pain, §04).
- **Relationships:** Takes coverage splits from D10; reads D9 for clinical justification (minimum-necessary, consent-scoped); D16 reports deduction analytics.
- **Ownership:** Payer contracts, pre-auths, claims, claim states, receivables.
- **Dependencies:** D10, D9, D4 (rate cards per payer).
- **Extensibility:** NHCX-first design means a new payer is a registry entry + rate card, not an integration project. OPD insurance (nascent, §03 trend) activates the same lifecycle at clinic scale.

#### D12 · Settlements & Attribution

- **Purpose:** Money *between* the org and its people/partners — the C8 fix: attribution at transaction time, reconciliation as a concept deleted.
- **Responsibilities:** Attribution capture at billing time (which consultant's patient, which referring B2B lab, which store's franchise P&L); computation of dues from D3 engagement terms (fee-share %) and D4 trade rates; settlement statements both sides can see continuously (the anti-monthly-dispute mechanism, §03 pain #2); B2B account statements (lab-to-lab §05, pharmacy institutional credit §06).
- **Relationships:** Facts in from D10/D11; terms from D3/D4; payout execution is finance-ops outside the platform boundary (exported, not owned).
- **Ownership:** Attribution records, computed dues, settlement statements.
- **Dependencies:** D10, D3, D4.
- **Extensibility:** Franchise models (§06), doctor-referral *service* metrics (the clean C7 world), and future marketplace commissions are all attribution rules over the same fact stream.

#### D13 · Inventory & Supply

- **Purpose:** Physical stock and the machines care runs on — where APS-012 found expiry losses, dead-stock/stockout paradoxes, and inspection-grade logs kept by hand.
- **Responsibilities:** Stock items with **batch/lot/expiry identity** (pharmacy SKUs §06, lab reagents §05, ward consumables §04); procedure/session kits (dialyzer+lines, phaco packs §07); stock movements (purchase receipt, dispense, ward indent, inter-store transfer, expiry pull, return-to-distributor); shrinkage visibility (variance between movements and audits); equipment/asset state (AMC schedules, maintenance and water-quality logs §07 — feeding D14's inspectable registers).
- **Relationships:** Decremented by D8 fulfillments; purchased against suppliers (supplier registry lives here); expiry and stockout signals to D15 (alerts) and D16 (demand planning).
- **Ownership:** Stock truth, batches, movements, suppliers, asset maintenance state.
- **Dependencies:** D2 (locations/stores), D4 (item identity is shared with catalog: D4 owns sellability/price, D13 owns physical stock).
- **Extensibility:** Demand-driven replenishment (§06 opportunity) is intelligence over movement history. Cold-chain telemetry attaches to the same asset/stock primitives.

---

### L3 — Cross-cutting

#### D14 · Compliance & Quality

- **Purpose:** Make the regulatory paperwork mountain (APS-012 §01) a *byproduct of operating*, not a parallel paper universe — answering Q5 (see §4).
- **Responsibilities:** License/registration registry per org/location (CEA, drug licenses, PC-PNDT, AERB); register generation from operational events (Schedule H1 register from D8 dispense events; QC logs from lab workflow; machine logs from D13); audit-trail custody (every domain emits, D14 preserves inspection-grade trails); accreditation artifact assembly (NABH/NABL evidence from live data); incident/adverse-event records (day-care transfer events §07).
- **Relationships:** Subscribes to everything; blocks nothing except where law requires (e.g., a Schedule X dispense without required data fails in D8 *by D14-supplied rule*, keeping the rule in one place).
- **Ownership:** Licenses, registers, audit archives, incident records. *Not* the operational events themselves.
- **Dependencies:** Event streams from all domains; D2 for scope.
- **Extensibility:** New regulation = new register/rule definitions, not new plumbing. DPDP-mandated data-handling evidence comes from the same audit custody.

#### D15 · Communication & Engagement

- **Purpose:** The C4 fix — recall as the provider's systematic job — plus every proactive message the blueprint demanded (queue ETA honesty C1, family status updates §04, report-ready alerts §05, refill nudges §06).
- **Responsibilities:** The **recall engine**: follow-up windows, chronic-care recalls, refill predictions, recurring-session absence follow-ups — one mechanism, four costumes (C4); transactional notifications from domain events (booking confirmed, consultant delayed, report ready, discharge countdown); channel management (WhatsApp/SMS/app/print) with per-patient preferences and consent; message audit (what was told to whom, when).
- **Relationships:** Subscribes to D6/D7/D8/D9/D10/D13 events; writes nothing into them; recall outcomes (patient rebooked) flow back as ordinary D6 bookings — attribution measurable in D16.
- **Ownership:** Message templates, schedules, delivery records, recall definitions.
- **Dependencies:** Event streams; D5 (contact, preferences, consent).
- **Extensibility:** New channels are adapters. Care-program journeys (post-discharge §04, IVF cycle counseling touchpoints §07) are recall-engine compositions, not new modules.

#### D16 · Analytics & Insights

- **Purpose:** The questions APS-012 found nobody could answer: capture rate (§03), follow-up leakage (§02), slot utilization (§07), deduction patterns (§04), dead-stock risk (§06).
- **Responsibilities:** Read models over the event streams of all domains; the metric definitions themselves (one canonical "capture rate," not per-screen arithmetic); operational dashboards' data layer; outcome/quality measures with visible methodology (§07 outcome-transparency opportunity).
- **Relationships:** Consumes everything, is consumed by workspace UIs and reports. Strictly read-only — an analytics need never adds a write path to an operational domain.
- **Ownership:** Metric definitions, aggregates, report artifacts.
- **Dependencies:** All event streams.
- **Extensibility:** Benchmarking across orgs (chain HQ views, and eventually anonymized network benchmarks) is a permissioning layer over the same reads.

---

### L4 — Network (designed now, built later — Q1's answer)

#### D17 · Network Exchange

- **Purpose:** The connective tissue APS-012 §08 identified as the deepest opportunity: patient context, orders, results and claims flowing *between* organizations — what "Healthcare Operating System" actually means.
- **Responsibilities:** Org-to-org relationships (clinic ↔ preferred lab, day-care ↔ backup hospital §07, hospital ↔ satellite centers); **consent-managed record exchange** on ABDM rails (D5 consents, D9 content, FHIR at the boundary); cross-org order routing for D8 (e-Rx to pharmacy, test order to B2B hub, transfer-with-data §07 challenge); registry alignment (HFR facility identity, HPR professional identity); NHCX claim transport for D11.
- **Relationships:** A gateway domain: it moves other domains' objects across boundaries; it owns the *relationships and the exchange contracts*, never the content.
- **Ownership:** Inter-org agreements, exchange logs, consent-execution records, external registry mappings.
- **Dependencies:** D5 (consent), D8/D9/D11 (payloads), D2 (org identity).
- **Extensibility:** Marketplace dynamics (a clinic choosing labs on service metrics — the earned-referral world of C7) build on exchange logs + D16, with zero change to care domains.

---

## 3. Relationship map

```
                         ┌─────────── D16 Analytics ◄─── events from all
                         │
D1 Identity ◄─ everyone  │            D15 Communication ◄─ events from all
D2 Organization ◄─ everyone (tenancy) │        │ reminders/recalls
                                      │        ▼
D3 Workforce ──working schedules──► D6 Scheduling ──opens──► D7 Encounter
D4 Catalog ────what's bookable────►      ▲                      │
D5 Patient ────who──────────────────────┘         ┌─────────────┼──────────┐
                                                  ▼             ▼          ▼
                                            D8 Orders ────► D9 Clinical  charges
                                              │  ▲            Record       │
                                     stock    │  │ results       │         ▼
                              D13 ◄──decrement┘  └───────────────┘   D10 Billing
                              Inventory                                │      │
                                                       payer portion   │      │ facts
                                                            ▼          │      ▼
D17 Network Exchange ◄─── cross-org routing (D8),      D11 Claims      │  D12 Settlements
     ABDM/NHCX rails       record exchange (D9),           ▲───────────┘   (D3/D4 terms)
                           claim transport (D11)
D14 Compliance ◄─── audit events from all; supplies rules where law requires
```

Reading it: the **care spine** is D5→D6→D7→D8→D9 (who → when → what happened → what was ordered → what's known). The **money spine** is D10→D11→D12 hanging off the care spine's events. Kernel (D1–D4) scopes everything; L3 observes everything; D17 carries spine objects across org boundaries.

---

## 4. Answers to APS-012's open questions (Q1–Q5)

**Q1 — Multi-org network: Phase-1 domain or later seam?**
*Modeled now, built later.* D17 exists in the domain map from day one, and three design consequences apply immediately even while single-org: (a) patient records are patient-scoped with org-scoped access (D9), (b) orders carry routing (D8) even when every route is "in-house," (c) org relationships are relationships between organizations, not fields on one. Cost now: near zero. Cost of retrofitting later: the entire industry's current predicament.

**Q2 — One Encounter from 6-minute consult to 5-day admission?**
*One primitive, three profiles, containment for admissions.* Consult, session and admission share identity, state machine, participants and the charge/order/record linkage — that's the interface everything else programs against. An admission is additionally a *container* of encounters (rounds, OT event, nursing events). We do not force a consult to carry admission complexity, and we do not invent a separate "session" object that D10/D9/D16 would each have to special-case.

**Q3 — Where does the visiting consultant live?**
*One person (D1 identity), n engagements (D3), per-engagement terms.* Fee-share, working schedule and role are properties of the engagement, not the person. This makes consultant payout transparency (C8) and eventually cross-org schedule truth natural instead of heroic.

**Q4 — One inventory context or a family?**
*One domain, one movement/batch model; the variation is in policy, not shape.* Pharmacy retail, ward stores, reagents and kits all reduce to items-with-batch-and-expiry moving between locations with reasons. What differs — reorder policy, kit composition, regulatory registers — lives in configuration (D4/D13 settings) and in D14 rules. Splitting the domain would duplicate the movement model four times to encode policy differences that config handles.

**Q5 — Compliance: in-domain or separate context?**
*Events in the core domains, custody and rules in D14.* Operational domains emit what happened (a dispense, a QC run, a machine check); D14 turns those into registers, retains audit-grade trails, and supplies the few legally-blocking rules back to the domains as data. No workflow is performed twice — once for work, once for inspectors — which was exactly the paper-universe defect (§04, §05).

---

## 5. Grounding in today's codebase

The map is not greenfield fantasy — Sprint 1/2 code already sits inside it:

| Exists today | Domain |
|---|---|
| `src/domain/authorization.ts` (centralized authz) | D1 |
| `User`, `Session` models | D1 |
| `src/domain/organization.ts` — Organization mapped onto Clinic, `OrganizationMember`, role heuristic | D2 / D3 |
| `StaffProfile` | D3 |
| `PatientProfile`, family/health-summary features, patient workspace | D5 (+ D9 seedlings: health summary) |
| `Appointment`, `AppointmentEvent`, queue/walk-in/appointment services, `src/domain/appointment-status.ts` | D6 (+ the status machine D7 will generalize) |
| Repositories/service layering, standardized API responses | The architecture discipline all domains inherit |

Nothing built so far contradicts the map; the near-term implication is that **D7 (Encounter) is the next domain the code will need** the moment consultations produce records — currently the appointment (D6) is standing in for the encounter (D7), which is fine at clinic scale and must not survive into diagnostics/day-care modules.

---

## 6. Extensibility playbook (the Shopify test)

The map passes or fails on these scenarios — each must be configuration + module activation, never a fork:

| Scenario | What activates | What changes in existing domains |
|---|---|---|
| Onboard a solo clinic (today) | D1–D10, D15 minimal | Nothing — this is the current product |
| Clinic adds a lab counter | D8 in-house routing, D13 reagents, D4 test catalog | Zero model change |
| Multi-specialty center | D12 (consultant fee-share), capture-rate metrics in D16 | Zero |
| Diagnostic hub with B2B | D8 external orders, D12 B2B accounts, D17 org relationships | Zero |
| Pharmacy chain | D13 at SKU scale, D15 refill recall, multi-location D2 | Zero |
| Dialysis center | D6 standing slots, D7 session profile, D11 per-session pre-auth, D14 machine registers | Zero |
| 150-bed hospital | D7 admission container, D6 resource-bound lists, D11 full claims desk, D2 departments at depth | Zero *if* Q2's containment is honored now |
| Chain HQ over 30 stores | D2 org-group relationships, D16 cross-org reads | The one place D2 grows a concept (org groups) — flagged as designed-for, like Organization-on-Clinic was |

**Module boundary rule for all future work:** a capability belongs in an existing domain if it changes what that domain *owns*; it is a new domain only if it has its own source-of-truth data, its own lifecycle, and could be switched off without breaking a lower layer. (Test: D15 off → care still works, messages stop. D6 off → nothing works. D6 is kernel-adjacent; D15 is a module. Correct.)

---

## 7. Handoff

- **Session 3 (Information Architecture):** APS-003 already structures the workspaces; it should be re-validated against this map — in particular, workspace ≠ domain (a doctor's workspace composes D6+D7+D8+D9 views; an admin workspace composes D2+D3+D4+D10). Any IA group that cannot name its owning domains signals a gap on one side or the other.
- **Session 4 (UX):** The C1–C8 challenges plus this map's event-driven posture define what screens must *show* (live truth, running bills, settlement transparency) — much is already delivered (APS-009/011 doctor, APS-010 patient).
- **Session 5 (Product Documentation):** The domain lenses above are the canonical vocabulary; product docs should not coin second names for mapped concepts.
- **Engineering (ongoing):** No schema or API in this document by design. When code needs a new concept, the sequence is: locate its owning domain here → check §5 grounding → extend the repository/service layer within that boundary. The technical-debt register's roadmap items should be tagged with domain IDs (D1–D17) so debt and architecture converge on one vocabulary.
