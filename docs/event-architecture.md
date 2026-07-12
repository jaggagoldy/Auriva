# APS-018 — Auriva Event Architecture

**Phase 2 · Platform Architecture** · 03 Jul 2026 · Status: For review
Builds on (approved, not redesigned): APS-012 business · APS-013 domains · APS-014 IA · APS-015 UX · APS-016 PRD · APS-017 standards.
Feeds: APS-019 Workflow · APS-020 Capability · APS-021 Extension · APS-022 AI · APS-023 Integration & Data.
**Not in this document by design:** APIs, schemas, broker/technology selection, code. This is the communication constitution of the platform; implementation choices obey it later.

**Anchor:** APS-013 already legislated the two structural rules — *dependencies point downward only* and *upward communication is by events*. This document makes those rules operable: what an event is, which events exist, who may publish and subscribe, and how the backbone is governed. The built codebase already contains the embryo (`AppointmentEvent` — an append-only fact trail on appointments); APS-018 generalizes that instinct platform-wide.

---

## Part 1 — Why event-driven, honestly argued

**Stage 1 · Traditional monolith.** Modules call each other's internals. Booking an appointment updates the queue table, inserts a notification row, and touches billing in one transaction. Fast to build, and correct — until the sixth module arrives. Then every change ripples: pharmacy can't ship without retesting billing; a notification bug can roll back a booking. This is precisely how incumbent HIMS products calcified (APS-012 §04: clinical modules "bought, abandoned" — they couldn't evolve independently).

**Stage 2 · Direct service calls.** Modules become services but still *command* each other: Scheduling calls Notifications, calls Analytics, calls Billing. Coupling survives as a call graph: Scheduling must know every interested party, be online when they are, and absorb their failures. Adding a subscriber (say, AI) means editing the publisher — the opposite of a platform. Availability multiplies downward: the queue board stalls because the analytics service is slow.

**Stage 3 · Event-driven platform.** Modules publish **facts** ("AppointmentBooked") to a shared backbone; interested modules subscribe. The publisher knows nothing about consumers. Auriva's specific reasons this is the right center of gravity:

1. **Module activation is the product** (APS-013 P1, APS-014 §3.1). A clinic without Billing must simply mean "billing events have no subscriber" — that is only cheap if communication is events. Direct calls would need conditional wiring per preset: a fork by another name.
2. **The subscriber list is open-ended by strategy** (this brief's own list): workspaces, notifications, analytics, AI, automation, third-party plugins, ABDM/NHCX. Every one of these is a future subscriber that must not require touching publishers (FR-13/14/17, APS-022's entire premise).
3. **Compliance is a byproduct** (APS-013 Q5): D14 builds registers *from events*. No event backbone → double bookkeeping returns.
4. **Cross-org context flows** (D17) are messages between organizations by nature; a platform already fluent in events extends to the network without a second paradigm.
5. **Healthcare's rhythm is asynchronous:** results arrive hours later, claims respond in days, recalls fire in weeks. The domain itself is a stream of facts over time.

**Trade-offs accepted (and their disciplines):**

| Cost | Discipline that pays it |
|---|---|
| Eventual consistency between modules | UX already legislates it: optimistic writes with live patches (APS-008); boards converge in seconds, ledgers reconcile by event, never by nightly batch |
| Harder debugging across async hops | Correlation + causation IDs in every envelope (Part 5); the event log *is* the trace |
| Duplicate delivery is inevitable | At-least-once delivery + idempotent consumers as law (E7/E8) |
| Ordering is not global | Ordering guaranteed per entity stream only; consumers needing sequence key on the subject, not the clock |
| Schema drift across many consumers | Registry + additive versioning (Part 9) |

**What stays synchronous — events are not a religion.** Commands and queries remain direct calls: authorization checks (D1 — never eventual), slot availability at booking time, payment confirmation, Rx signing (APS-008's pessimistic writes are synchronous *commands*; the resulting fact is then published as an event). Rule of thumb: **the actor's own transaction is synchronous; everyone else finds out by event.** Reads compose via APIs (APS-023's territory). Events carry *what happened*, never *do this* (E3).

---

## Part 2 — Platform Event Catalog (v1)

**Naming convention (governance-owned):** `<domain>.<entity>.<fact>` — lowercase, dot-separated, past-tense fact, suffixed with schema version on the wire (`scheduling.appointment.booked.v1`). The publishing domain (APS-013 D-ref) is the **only** legal publisher of its events (E12).

**Priority classes:** **P0** clinical-safety (delivery + acknowledgement monitored, seconds) · **P1** operational-realtime (live boards, seconds) · **P2** standard business (minutes) · **P3** analytical/batch (hours acceptable).
**Audit classes:** **A2** full (immutable, register-feeding, retention per D14 policy — all clinical, financial and access facts) · **A1** standard (operational trail) · **A0** telemetry (aggregatable, prunable).

The user-mandated 22 events plus the platform-required completions, by publishing domain. *Subscribers listed are the standing v1 set; D14 (compliance custody) and D16 (analytics) subscribe to every A1/A2 event and are not repeated per row. Workspace read-models (Part 6) subscribe wherever the entity is visible.*

### Identity, Organization & Workforce (D1/D2/D3)

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `identity.user.created` | Account created (signup, invite accepted) | D1 | D15 (welcome), D3/D5 (profile attach) | One Auriva ID per human across roles | P2 | A2 |
| `identity.role.granted` / `.revoked` | Grant change applied | D1 | Workspaces (nav re-derivation, APS-015 §8), D15 | RoleChanged: access truth propagates live | P1 | A2 |
| `organization.created` | Org registration completes KYC flow | D2 | D4 (preset catalog seed), D15 (onboarding), Admin workspace | New tenant exists; module preset applied | P2 | A2 |
| `organization.module.activated` / `.deactivated` | Owner toggles a module (FR-01) | D2 | All workspaces (nav/search/notif/settings — the four surfaces) | Configuration-as-product made real | P1 | A2 |
| `workforce.engagement.created` | Provider/staff joins an org (DoctorJoinedOrganization) | D3 | D6 (capacity), D12 (payout terms), D1 (grants), Marketplace (listing) | The person↔org relationship with terms begins | P2 | A2 |
| `workforce.engagement.changed` / `.ended` | Terms, schedule or membership change (MembershipChanged) | D3 | D6, D12, D1, Marketplace | Capacity and settlement stay true to terms | P2 | A2 |

### Patient (D5)

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `patient.created` | Registration (walk-in, booking, marketplace signup) | D5 | Patient workspace, D15 (preferences init) | One patient, known once (org-wide registry) | P2 | A2 |
| `patient.updated` | Demographics/contact/consent-relevant change | D5 | Workspaces, D15 (channel refresh), D11 (payer identity) | Downstream copies never drift from source | P2 | A2 |
| `patient.abha.linked` | ABHA verification completes | D5 | D17 (exchange eligibility), D9, workspaces | Portability rail attached | P2 | A2 |
| `patient.consent.granted` / `.revoked` | Consent decision recorded | D5 | D17 (exchange gate), D9 (access scope), D15 | Legal basis for every PHI flow; revocation propagates immediately | P1 | A2 |

### Scheduling & Access (D6)

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `scheduling.appointment.booked` | Slot confirmed (any channel) | D6 | D15 (confirm + reminders), queue projections, patient/doctor timelines, D10 (billable context), D16 | The care spine begins | P1 | A1 |
| `scheduling.appointment.rescheduled` | Reschedule confirmed | D6 | D15, timelines, queue | Truth moves once, everywhere | P1 | A1 |
| `scheduling.appointment.cancelled` | Cancel confirmed (either side) | D6 | D15, D6-waitlist (backfill offer), D10 (fee policy), timelines | Slot inventory recovered; C1 honesty | P1 | A1 |
| `scheduling.appointment.checked_in` | Front-desk/self check-in | D6 | Queue boards + token display, doctor Today view, D7 (encounter pre-open) | The floor knows within a second | P1 | A1 |
| `scheduling.queue.position_changed` | Call/skip/reorder on a live queue | D6 | Token display, patient live view ("you are #7"), boards | Waiting-room transparency (C1) | P1 | A0 |
| `scheduling.session.no_show` | Grace timer expires on a standing slot | D6 | D15 (outreach), D6-waitlist (backfill, OJ4), D16 (utilization) | A no-show is an event, not a shrug | P1 | A1 |

### Clinical (D7/D8/D9)

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `encounter.started` | Consult/session/admission opens (ConsultationStarted) | D7 | Queue (state flip), timelines, D10 (charge context opens) | The unit of care is live | P1 | A2 |
| `encounter.completed` | Clinician closes the encounter (ConsultationCompleted) | D7 | D10 (charge assembly), D15 (follow-up window → recall), timelines, D11 (claimable fact) | Everything downstream of care hangs off this | P1 | A2 |
| `encounter.admission.discharge_ready` | All discharge preconditions met (C2 pipeline) | D7 | Org Encounters board (countdown), D10 (final bill), D11 (final approval), D15 (family notice) | The 6-hour wait dies by parallelism | P1 | A2 |
| `orders.prescription.created` | Rx signed (pessimistic command completes) | D8 | Pharmacy dispense queue (in-house or partner via D17), patient Records, D15 (refill horizon) | PrescriptionCreated: the Rx becomes a routable order (C5) | P1 | A2 |
| `orders.prescription.updated` | Amendment/cancellation signed | D8 | Same as created; supersedes prior | Corrections are new signed facts, never edits (E1) | P1 | A2 |
| `orders.lab_order.created` | Test(s) ordered in encounter or front desk | D8 | Diagnostics worklist (or partner org), patient Care view, D13 (kit/reagent demand) | LabOrderCreated: fulfillment routing begins | P1 | A2 |
| `orders.dispense.completed` | Pharmacist completes dispense (substitution recorded) | D8 | D13 (stock decrement posted), D10 (charge), patient Records, D15 (adherence clock starts) | MedicineDispensed: fulfillment fact + refill baseline | P1 | A2 |
| `clinical.result.ready` | Result signed off and filed | D9 | Ordering clinician (doctor workspace), patient Records (per release policy), org worklist closure, D15 ("report ready") | LabResultReady: the loop back to the prescriber (C6/C7) | P1 | A2 |
| `clinical.result.critical` | Value crosses critical threshold at sign-off | D9 | On-duty clinician role (alert, escalating), D14 (critical-callback register) | Clinical safety; APS-012 §05 callback workflow, systematized | **P0** | A2 |

### Financial (D10/D11/D12)

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `billing.invoice.generated` | Invoice finalized from charges | D10 | Patient (bill visibility), D11 (coverage split), D12 (attribution facts), D16 (revenue) | InvoiceGenerated: the cash ledger speaks | P2 | A2 |
| `billing.payment.received` | Payment confirmed (gateway callback or counter) | D10 | Patient (receipt), D12 (settlement basis), day-close projection | PaymentReceived: money truth, once | P1 | A2 |
| `billing.discount.requested` / `.approved` | Authority-ladder conversion (APS-015 §8) | D10 | Approvals tray (Δ-2), requester surface | Escalation as workflow, fully audited | P1 | A2 |
| `claims.preauth.state_changed` | draft→submitted→query→approved/denied (incl. NHCX inbound) | D11 | TPA worklists, encounter board (admission gate), D15 (query alert) | The payer clock is visible everywhere it matters | P1 | A2 |
| `claims.claim.state_changed` | Submission through settlement/denial | D11 | Receivables ageing, D12, D16 (deduction analytics) | Working-capital truth (APS-012 §04) | P2 | A2 |
| `settlements.attribution.recorded` | Attribution captured at billing time | D12 | Provider statements (continuous visibility, C8), B2B accounts | Reconciliation-as-concept deleted | P2 | A2 |

### Communication (D15) & derived engagement

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `communication.reminder.scheduled` | Recall/reminder rule instantiates a future send | D15 | Patient prefs surface, D16 (recall attribution) | ReminderScheduled: the C4 engine is inspectable, not magic | P2 | A1 |
| `communication.message.sent` / `.delivered` / `.failed` | Dispatch + channel receipt (SMS/WhatsApp/push) | D15 | Sending context (chip on entity), escalation rules on `.failed` | NotificationSent: what was told to whom, when — provable | P2 | A1 |
| `engagement.patient.inactive` | Derived: no visit/refill in N days (per org recall policy) | D16 (derived-event publisher) | D15 (recall campaign candidate), owner Insights | PatientInactive90Days-class facts; N is configuration, never hardcoded | P3 | A1 |

### AI, Workflow & System

| Event | Trigger | Publisher | Key subscribers | Business purpose | Pri | Audit |
|---|---|---|---|---|---|---|
| `ai.insight.generated` | An AI consumer produces a proposal/summary/insight | AI subsystem (APS-022) | The one surface the insight targets (as *draft/suggestion*), D16 | AIInsightGenerated: AI output is itself an audited fact with provenance | P2 | A2 |
| `workflow.completed` (family: `.started`, `.step_completed`, `.stalled`) | A defined multi-module journey reaches its end | Workflow engine (APS-019 — reserved here, defined there) | Journey owners, D16 (journey analytics) | WorkflowCompleted: journeys become measurable objects | P2 | A1 |
| `system.subscription.dead_lettered` | A consumer exhausts retries on an event | Backbone | Platform Admin workspace, publisher's owner team | Failures are events too; silence is forbidden | P1 | A1 |
| `system.integration.state_changed` | External adapter up/down/degraded (ABDM, NHCX, gateway, channels) | D17/adapters | Admin workspace, affected org Settings (integration health) | Operational honesty about the rails | P1 | A1 |

*Catalog note:* v1 deliberately excludes speculative events. New events enter by the Part 9 process; the registry, not this markdown table, becomes the living source of truth once implemented.

---

## Part 3 — Event Maps (action → domain → event → subscribers → outcomes)

**M1 · Book appointment** (the brief's example, completed with outcomes):

```
Patient books (any channel)
  → D6 Scheduling ── scheduling.appointment.booked
      ├─ D15 Communication → confirmation now; reminders T-24h/T-2h  → fewer no-shows
      ├─ Queue/board projections → tomorrow's floor is already true  → front-desk zero surprise
      ├─ Patient timeline + Doctor Today (workspace read models)     → both sides see one truth
      ├─ D10 Billing → billable context opens                        → nothing to re-enter at visit
      ├─ D16 Analytics → booking funnel, channel mix                 → owner sees acquisition truth
      └─ (AI, silently) → reminder-timing recommendation             → Part 8
```

**M2 · The clinic spine, end to end** (walk-in → consult → Rx → dispense → recall):

```
walk-in registered → patient.created + scheduling.appointment.checked_in
   → queue + token display update (P1, seconds)
doctor calls next → scheduling.queue.position_changed → patient's phone: "you're next"
consult opens/closes → encounter.started / encounter.completed
   → D10 assembles charges → billing.invoice.generated → billing.payment.received
   → D15 opens the follow-up window                     (C4 armed)
Rx signed → orders.prescription.created → pharmacy dispense queue
dispensed → orders.dispense.completed → stock posts, adherence clock starts
90 days quiet → engagement.patient.inactive → D15 recall → new booking
   → recall-attributed revenue visible in Insights       (G3 measured)
```

**M3 · Claims lifecycle (hospital):** `encounter.started` (planned admission) → `claims.preauth.state_changed` (submitted) → NHCX inbound query → same event (query) → TPA alert → response → (approved) → surgery → `encounter.admission.discharge_ready` fans to bill/claim/family in parallel → `claims.claim.state_changed` through settlement — every hop feeding ageing and deduction analytics without a single direct call between D7, D11, D10 and D15.

**M4 · No-show on a standing slot (day care):** `scheduling.session.no_show` → D15 outreach to the absent patient **and** D6 waitlist offer in parallel → acceptance books the slot (ordinary `…booked`) → utilization stat updates → clinical flag if second consecutive miss (D16 derived → nephrologist worklist). One event, four outcomes, zero coupling.

---

## Part 4 — Event Categories

The twelve mandated categories, mapped to publishing domains (a category is a *catalog view*; ownership stays with domains):

| Category | Events (Part 2) | Publishing domains |
|---|---|---|
| Identity | user.created, role.granted/revoked | D1 |
| Organization | organization.created, module.activated, engagement.* | D2, D3 |
| Patient | patient.*, consent.* | D5 |
| Doctor | engagement.* (professional facts), availability changes (D6 capacity) | D3, D6 |
| Clinical | encounter.*, orders.*, clinical.result.* | D7, D8, D9 |
| Operations | appointment.*, queue.*, session.*, dispense/worklist ops | D6, D8 |
| Financial | invoice.*, payment.*, discount.*, preauth/claim.*, attribution.* | D10, D11, D12 |
| Communication | reminder.*, message.* | D15 |
| Analytics | derived events (engagement.patient.inactive et al.) | D16 (derived-publisher) |
| Compliance | none published — D14 is the universal subscriber; registers are *outputs* | D14 (consumer) |
| AI | ai.insight.generated | AI subsystem (APS-022) |
| System | subscription.dead_lettered, integration.state_changed, workflow.* | Backbone, D17, workflow engine |

Two deliberate rulings: **Compliance publishes nothing** (a register entry is a projection, not a fact of care — publishing it would double-count reality), and **Doctor is not a publishing domain** (doctors act *within* D3/D6/D7/D8 facts; a separate doctor event stream would fork the truth).

---

## Part 5 — Event Principles (platform law)

| # | Principle |
|---|---|
| E1 | **Events are immutable.** Corrections are new events (`.updated`, `.superseded`) carrying `causationId` to what they correct. Nothing is edited, ever — this is what makes D14 custody and replay possible. |
| E2 | **Events describe facts, past tense.** `appointment.booked`, never `book_appointment`. If it can fail, it isn't an event yet. |
| E3 | **Events never command.** No subscriber is *instructed*; each applies its own policy to the fact. The moment a publisher needs a specific consumer to act, that's a synchronous command (Part 1) — design it as one. |
| E4 | **The envelope is mandatory and uniform:** `eventId` (UUID) · `name.version` · `occurredAt` / `recordedAt` (org-timezone rules per APS-017 §3 apply at display, storage is UTC) · `actor` (user/system/ai + role + engagement) · `organizationId` · `locationId` (where applicable) · `workspaceOrigin` · `subject` (entity type + id) · `correlationId` (journey) · `causationId` (parent event) · `consentContext` (where PHI-adjacent) · payload. |
| E5 | **Events are PHI-thin.** Payloads carry identifiers, states and non-clinical business facts; clinical *content* stays in D9 and is fetched by authorized reads (notify-then-fetch). Exception: P0 clinical alerts may carry the minimum value needed to act, flagged for A2 handling. This keeps the backbone DPDP-clean and consent enforcement in one place (D1/D5), not in every consumer. |
| E6 | **One publisher per event.** Only the owning domain (APS-013 ownership column) may emit its facts. An event in the registry names exactly one publishing domain. |
| E7 | **Delivery is at-least-once; consumers are idempotent.** Every consumer must tolerate replays and duplicates keyed on `eventId`. No consumer may rely on exactly-once. |
| E8 | **Ordering per subject stream only.** Events about one entity (one appointment, one claim) arrive in order; no global ordering exists. Consumers needing cross-entity sequence use `occurredAt` + explicit reconciliation. |
| E9 | **Every event is auditable and attributable.** No anonymous events; system actors are named actors. A2 events are retention-bound to D14 policy and legally producible. |
| E10 | **Subscribing is grant-shaped.** A consumer (internal module, workspace projection, AI, external webhook) subscribes under an identity with explicit event-scope grants (D1) — the same authorization law as UI navigation (APS-014 §7), applied to the backbone. |
| E11 | **Schemas evolve additively.** New optional fields are free; anything else is a new version published side-by-side (Part 9). Consumers must ignore unknown fields. |
| E12 | **Absence of a subscriber is normal.** Publishing into silence is correct behavior (module not activated). No publisher may fail or branch on subscriber presence. |

---

## Part 6 — Cross-workspace propagation (without duplication)

APS-003 settled the shape: **workspaces are role-scoped projections of shared entities.** Event architecture inherits it directly:

- **One fact, one event, n projections.** `scheduling.appointment.booked` is published once. The patient timeline, doctor Today view, org board and (availability only) marketplace inventory are separate **read models**, each maintained by its own subscriber applying its own projection ("my visit" vs "calendar entry" vs "operational row" — the APS-003 §04 table, now with a mechanism).
- **No workspace-to-workspace events exist.** Workspaces never publish to each other; they publish *commands to domains* (book, sign, check in), domains emit facts, projections update. The doctor's queue and the org's queue board are two projections of the same D6 stream (X5 made mechanical).
- **Deduplication is structural:** each projection is keyed on (`eventId`, projection name) — a replayed event updates idempotently (E7); the same fact can never render twice inside one projection, and "duplication" across workspaces is intentional projection, not copying.
- **Per-workspace *notification* fan-out is D15's policy, not the event's:** one `clinical.result.ready` may notify the patient (push, plain language), the doctor (in-app, clinical), and nobody at the org (worklist just closes). The event doesn't know; D15's routing rules (Settings → Communications) decide.
- **Admin workspace** (APS-017 §5) subscribes only to System-category and org-lifecycle events plus aggregated health — it holds **no PHI projections**; platform operations never requires clinical content.
- **Grant changes flow live:** `identity.role.granted/.revoked` reaches workspace shells → nav re-derivation (APS-015 §8's live-degradation, now with its trigger).

---

## Part 7 — Integration events (external systems)

All external traffic passes through the **integration edge** (D17 + adapters). Internals never call external systems directly, and external systems never touch the backbone directly.

**Outbound (Auriva → world):**
- External consumers subscribe via **signed webhooks or polled feeds** against the same grant-shaped subscription model (E10): a subscription names the org, the event scopes, and the consent basis. PHI-thin discipline (E5) means webhooks are naturally safe; a consented record exchange is a D17 *flow* triggered by an event, never a payload in one.
- Delivery: at-least-once, retries with backoff, dead-letter to `system.subscription.dead_lettered` (Admin + org Settings visibility), replay on request within retention.
- Examples: payment reconciliation feeds to accounting tools; a partner hospital notified of `encounter.admission.discharge_ready` for step-down transfer; future plugin subscriptions (APS-021's substrate).

**Inbound (world → Auriva): normalize at the edge.** External callbacks become *platform events published by the owning domain*, never raw pass-throughs:

| External source | Arrives as | Normalized into |
|---|---|---|
| NHCX (claims responses, queries) | claim/pre-auth status callback | `claims.preauth.state_changed` / `claims.claim.state_changed` (publisher D11) |
| ABDM (consent grants/revocations, record requests) | consent-manager callbacks | `patient.consent.granted/.revoked` (D5); exchange execution logged by D17 |
| Payment gateway | payment success/failure webhook | `billing.payment.received` / `.failed` (D10) |
| SMS / WhatsApp / Email channels | delivery receipts (DLR) | `communication.message.delivered` / `.failed` (D15) |
| Future APIs / partners | adapter-specific | Always the owning domain's vocabulary — external naming never leaks inward |

This is the anti-corruption line: if NHCX renames a field, one adapter changes; forty consumers don't.

---

## Part 8 — AI integration (AI is a subscriber, full stop)

The constitutional rule, per the brief: **no module knows AI exists.** Mechanically:

- AI consumers subscribe through the standard contract (E10) under **named AI actors** with explicit event-scope and consent-scope grants — an AI reading `encounter.completed` events holds a grant that says so, auditable like any staff grant.
- **AI never writes domain state.** Its only output channel is `ai.insight.generated` — a fact *about a proposal*, carrying provenance (model, version, input event refs via `causationId`, confidence). Whatever surface consumes it renders a **draft/suggestion requiring human action**; acceptance is an ordinary authorized command by a human actor, which then produces ordinary domain events. (Clinical actions are never optimistic — APS-008; AI inherits that law with zero exemptions. APS-022 may define narrow, org-configured auto-apply for non-clinical suggestions; the default is human-in-the-loop.)
- **PHI-thin still applies (E5):** AI needing clinical content performs consented, logged reads via D9 — the event is the trigger, not the data feed.

The brief's four examples, mapped:

| Listens to | Produces (`ai.insight.generated` targeting…) | Human action that follows |
|---|---|---|
| `scheduling.appointment.booked` (+ no-show history) | Reminder-timing/channel recommendation → D15 rule tuning | Org accepts tuned reminder policy |
| `encounter.completed` | Draft clinical summary → doctor workspace, marked AI-draft | Doctor edits/signs (signing emits the real fact) |
| `billing.invoice.generated` stream | Revenue insight (pricing outliers, capture leakage) → owner Insights | Owner acts via Settings/catalog |
| `engagement.patient.inactive` | Recall-campaign candidate list + message variant → D15 | Org approves campaign; D15 sends |

Removing every AI subscriber tomorrow changes nothing in any module — that is the test, and it is the same test as module deactivation (E12). The full agent architecture is APS-022's scope; it plugs into these sockets.

---

## Part 9 — Governance

- **Registry:** every event has a registry entry — name, version, owning domain, schema, priority, audit class, PII/PHI classification, subscribers of record, example payload. An event not in the registry does not exist; the registry is generated documentation (never hand-maintained twice).
- **Naming:** Part 2 convention enforced at registration; facts past-tense; no workspace, vendor or UI terms in event names (events outlive screens).
- **Ownership:** the publishing domain owns schema, semantics and lifecycle; the platform architecture group owns the envelope, categories and this document. Subscriber teams own their idempotency and lag.
- **Versioning & deprecation:** additive changes in-place (E11); breaking changes ship `vN+1` side-by-side; publisher dual-writes both versions for a stated window; deprecation requires registry notice + zero remaining subscribers of record + one release of grace. Nothing is removed silently.
- **Monitoring (the backbone is a product):** per-event delivery lag against priority-class SLOs (P0 alerting in seconds), consumer lag per subscription, DLQ depth, publish-failure rate — surfaced in the Admin workspace; org-visible integration health in Settings (APS-014 tree).
- **Replay:** consumers may replay their own subscription within retention (rebuilding projections is routine, not exceptional — E7 makes it safe). Replay of A2 streams requires a named reason, logged by D14. Replay never re-triggers external side effects (D15 sends and D17 webhooks are guarded by send-log idempotency).
- **Audit & retention:** A2 events retained per D14 policy (legal/clinical horizons, org-configurable floor, never below statute); A1 operational horizon; A0 aggregated-then-pruned. The event log is the audit substrate — D14 custody, tamper-evident, exportable for inspection (NFR auditability: registers reproducible from events at any past date).
- **Security:** encrypted in transit and at rest; subscription = identity + grants (E10) enforced at the backbone; consent context evaluated at delivery for PHI-adjacent scopes; PHI-thin payloads (E5) as the structural safety net; external deliveries signed, replay-window-bound.

---

## Alignment check (per the brief's closing requirement)

- **APS-013:** every publisher above is the owning domain of its facts; "events up, dependencies down" is now operable; Q5's compliance-as-byproduct is Part 4's ruling.
- **APS-014/015:** notification classes, approvals tray, live boards, badge truth and grant-shaped navigation all bind to named events here; nothing new was invented for UX.
- **APS-016:** FR-13/14/16/17 acquire their mechanism; NFR auditability and the C1–C8 fixes each trace to specific events (C2→`discharge_ready`, C4→recall chain, C5→`prescription.created`, C8→`attribution.recorded`).
- **APS-017:** Admin workspace's no-PHI ruling honored (Part 6); timezone display rules deferred to display layer per §3.
- **Reserved seams:** `workflow.*` → APS-019 · capability tracing hooks → APS-020 · plugin subscriptions → APS-021 · AI actors → APS-022 · adapters/data → APS-023.

**Review questions for approval** (the ones worth your judgment, not rubber stamps): (1) PHI-thin with notify-then-fetch (E5) trades a second read for consent centralization — accepted? (2) Compliance-publishes-nothing ruling — accepted? (3) The P0 class currently contains only `clinical.result.critical` — should machine-down (day care) or discharge-blocking payer events join it? (4) Derived events published by D16 (`patient.inactive`) — comfortable with Analytics as a publisher of derived facts, or should D15 own them?
