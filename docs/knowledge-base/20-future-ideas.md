# 20 — Future Ideas

← [19 Competitive Analysis](./19-competitive-analysis.md) · [Index](./00-README.md)

**These are ideas, not commitments.** Every item below is either explicitly named as a future direction in the source documents (marked *stated*) or a reasonable extrapolation consistent with the six product pillars (marked **[SPECULATIVE]**). None of this is an approved roadmap — anything here still needs to pass the Feature Evaluation Checklist in [01-vision-and-strategy.md](./01-vision-and-strategy.md) and, if it's genuinely new functionality, a Category-C Product Office review (see [02-product-constitution.md](./02-product-constitution.md)) before a single line of code is written.

## Pillar 1 — Clinical Excellence

- **Clinical-intelligence release for AI-assisted documentation** *(stated)* — the deferred "Suggested protocol" one-tap fill (chief complaint → auto-filled notes/diagnosis/prescription) is explicitly named as belonging to *"a future clinical-intelligence release,"* deliberately held back this release for regulatory-risk reasons, not a lack of technical readiness. Any future work here should preserve the existing pattern of factual, structured-data-only safety alerts and treat generative suggestion as an entirely separate, carefully-gated capability.
- **"After the Visit" moment** *(stated)* — a post-checkout screen ("Take medicine 5 days · follow-up in 7 · need help? call clinic") explicitly flagged as *"one of the most memorable moments to add later."*
- **Voice dictation, keyboard-first shortcuts, favourite prescriptions, specialty-specific templates, multi-monitor support, clinical macros, ambient documentation** *(stated, named as "UX-Advanced Clinical Productivity")* — an entire future epic explicitly kept out of this release's MVP to preserve the current Workbench's calm, minimal feel; named as having "a clear evolution path."
- **[SPECULATIVE]** Structured vitals/allergy/condition taxonomies (replacing today's deliberate free-text fields) — the schema comments themselves flag this as "a future clinical-data-model decision, not an MVP concern," implying it is a recognized, bounded future investment rather than an open question.

## Pillar 2 — Practice Operations

- **Front Desk Intelligence** *(stated, named as a future epic)* — auto queue-balancing, wait-time prediction, patient SMS while waiting, overbooking warnings, suggested reassignment, reception KPIs, a queue heat map, no-show prediction, auto room allocation. Kept out deliberately to preserve today's operational simplicity.
- **[SPECULATIVE]** Room/equipment scheduling as a genuine Practice Operations feature (distinct from any HRMS-adjacent "asset management," which remains a red flag) — e.g. if a clinic has multiple consultation rooms, a room-assignment layer alongside doctor scheduling could strengthen pillar 2 without drifting toward the excluded HR/asset-management territory. Would need explicit Product Office scoping to stay on the right side of that line.

## Pillar 3 — Financial Operations

- **Insurance** *(stated, deferred)* — claims processing / payer integration; a substantial scope addition that would need its own dedicated design pass given regulatory and reconciliation complexity.
- **Online / patient-initiated payments** *(stated, deferred)* — pay-before-visit or pay-from-the-app, complementing (not replacing) the reception Desk's cash cycle.
- **[SPECULATIVE]** Packages/bundled-pricing (e.g. a multi-session physiotherapy package, a maternity care bundle) — mentioned as an example under the Financial Operations pillar in `AGENTS.md` but not elaborated or scheduled anywhere in the reviewed documents; would need its own invoice-model extension (today's `Invoice.items_json` is flat line items, not multi-visit packages).

## Pillar 4 — Patient Engagement

- **Teleconsultation** *(stated as an example pillar activity in `AGENTS.md`; not built, not scheduled)* — a natural extension of the existing Appointment/consultation model, but would require real video infrastructure, a different clinical-documentation flow for a remote visit, and its own regulatory considerations; a genuinely large addition, not a small UI feature.
- **Digital forms** *(named as a pillar example in `AGENTS.md`, not elaborated elsewhere)* — pre-visit intake forms a patient fills before arriving, feeding directly into the doctor's pre-filled chief-complaint pattern that already exists for booking reasons.
- **Emergency Contact surfaced in the patient's You screen** *(stated, "noted, not applied")* — a small, already-considered addition awaiting an explicit Product Office decision, not a speculative idea.
- **[SPECULATIVE]** Deeper patient communication (e.g. a two-way message thread with the clinic) — consistent with pillar 4's "Communication" example, but would need to be carefully scoped against the "no generic CRM" boundary and the "in-app only, no SMS/email" current notification reality (see [13-events.md](./13-events.md)) before any commitment.

## Pillar 5 — Organization Intelligence

- **[SPECULATIVE]** Deeper Command Center analytics — doctor productivity trends, clinic performance over time, revenue trend charts (the design system already reserves `--chart-1..5` tokens for exactly this, currently unused for real charting). A natural extension of the existing "Practice at a glance" tiles into genuine time-series reporting.
- **[SPECULATIVE]** Cross-clinic comparison views, once the multi-clinic-group growth path (already supported structurally by Organization→Clinic) has real multi-branch customers to report on.

## Pillar 6 — Platform Foundation

- **A real outbound notification channel (SMS/email/push)** *(stated as a known limitation, not yet a committed roadmap item)* — the architectural placeholder (the `Notification` model, projected from the Event Platform) already exists; what's missing is an actual delivery provider integration. This is the single most concretely "ready to build next" item on this list, since the internal plumbing is already shaped for it.
- **Multi-instance rate limiting** *(stated, scale-readiness)* — needed before any horizontal-scaling deployment.
- **[SPECULATIVE]** A genuine notifications/preferences platform (per-user channel preferences, digest vs real-time, opt-out management) — `AGENTS.md` explicitly notes this platform "does not exist" today; building it properly (not just adding an SMS send call) would be a real Platform Foundation investment, not a quick feature.
- **[SPECULATIVE]** Extending the Event Platform's catalog (`docs/event-architecture.md` describes ~30+ cataloged events across identity/scheduling/clinical/financial domains) from its currently-verified subset toward full coverage, enabling future subscribers (analytics, third-party integrations, ABDM/NHCX-style health-data exchange) without ever touching existing publishers — this is explicitly named in the architecture document as the entire point of the event-driven design, i.e. a foundation intentionally built to make later ideas cheaper, not itself a scheduled feature.

## A closing caution for whoever reads this next

Every idea above should be re-run through the Feature Evaluation Checklist before being treated as more than a conversation starter:

1. Does this solve a real healthcare workflow?
2. Would a clinic owner pay for it?
3. Does it strengthen one of the six pillars?
4. Could another mature SaaS product already solve it better (i.e. should Auriva integrate instead of build)?
5. Does it add unnecessary complexity?
6. Could integration with an external system achieve the same outcome?

And if any of these ideas start drifting toward HRMS/payroll/attendance/recruitment/asset-management/performance-reviews/generic-accounting/generic-CRM territory, that is not a "future idea" at all — it is a Red Flag requiring an Architecture Review stop (see [01-vision-and-strategy.md](./01-vision-and-strategy.md)).
