# Auriva — Product Constitution

> **Status:** The supreme reference document for Auriva. Not a roadmap, not a PRD, not an implementation plan — the fixed set of beliefs, principles, and guardrails that every roadmap item, onboarding flow, website page, pricing decision, and future feature (built by a human or an AI coding assistant) should be checked against before it's built.
> **Date:** 2026-07-05.
> **Precedence:** This document is the long-form expression of the vision and rules already stated in `AGENTS.md` (which remains the permanent, always-loaded quick-reference every session must read first). Where this document adds detail, it does not contradict `AGENTS.md` — if a future edit to either creates a conflict, `AGENTS.md`'s six pillars and red-flag list win, and this document should be corrected to match. Every other strategy document (`docs/auriva-customer-strategy.md`, `docs/product-requirements.md`, and anything that follows) operates *under* this one.
> **Why this document exists:** as Auriva grows past a handful of founder-driven decisions into a platform touched by many hands — including, deliberately, many different AI models across many sessions — the risk isn't a bad single decision. It's **strategic drift**: a hundred individually-reasonable choices that, added together, turn a Healthcare Operating System into a generic ERP with a stethoscope icon. This document exists to make that drift visible and stoppable, one decision at a time.

---

## 1. Why Auriva Exists (Mission)

Healthcare professionals entered medicine to care for people — not to spend their days re-typing the same patient history into three systems, chasing a paper register for a queue number, or reconciling a settlement by hand because two portals don't talk to each other. Every hour lost to disconnected software is an hour not spent on a patient, and every organization that has to hire a full-time "systems person" just to keep its software running has been failed by that software, not helped by it.

**Auriva exists to remove operational friction from healthcare delivery — so that a single clinic, a diagnostic lab, a pharmacy chain, or a hospital network can run on one coherent system instead of five disconnected ones, and so the people inside those organizations spend more of their day on care and less of it on software.**

This is a mission about *removing friction*, not about *adding features*. Every principle below exists to protect that distinction.

## 2. Vision

**Auriva is the Healthcare Operating System — one platform, six configurations, zero forks.**

Concretely: Independent Clinic, Multi-specialty Clinic, Hospital, Diagnostic Center, Pharmacy Chain, and Day Care Center are not six products. They are six **presets** — different activations of the same underlying modules and the same nine operational primitives (identity/registration, scheduling/queueing, clinical encounter, orders/fulfillment, cash-side money, payer-side money, inventory, people/payouts, compliance) — running on one codebase. This is the "Shopify for healthcare" thesis: one kernel that adapts by configuration, never by forking.

The long-range version of this vision (5–10 years, not the current roadmap): Auriva becomes the connective layer a patient's care journey passes through even when that journey crosses organizations Auriva doesn't operate — the moat isn't a longer feature list, it's a network. (See §8, Long-Term Platform Evolution, and `docs/auriva-customer-strategy.md` Addendum A for the fuller articulation.)

## 3. Product Principles

Every feature, big or small, should be checked against these before it's built. If a feature fails more than one of these, it needs an explicit, written justification for why it's an exception — not a silent override.

1. **Healthcare-first, never ERP-first.** Auriva solves healthcare workflows. If a request's justification would be equally true for a dentist's back office, a retail chain, or a law firm, it probably doesn't belong here natively — it belongs as an integration (§7).
2. **Configuration over customization.** A new org type, a new archetype's needs, a new region's requirements — the answer is a new preset or a new setting, never a parallel code path, a forked screen, or a "special version for this customer."
3. **One platform, many care settings.** The nine shared primitives are the ceiling of what Auriva natively models. A request that needs a tenth kind of primitive is a signal to stop and re-examine, not to quietly add an exception.
4. **Invite-based workforce management, always.** Every clinical or operational role is invite-only, permanently — self-registration into a role that touches clinical data or money is a credentialing and liability risk, not a growth lever. (See `docs/auriva-customer-strategy.md` Part 1/5 for the full reasoning — this rule has no planned exceptions.)
5. **Progressive disclosure.** Complexity should be revealed only when the org's own archetype and scale actually require it — a solo clinic should never see a hospital's admission workflow, and a hospital should never be flattened into a solo clinic's simplicity. Depth scales with real complexity; it is never hidden as false simplicity, and never exposed as premature complexity.
6. **Software pays for itself in visible money or time.** Every module must be able to name its own rupees-or-minutes claim (this principle already exists in `docs/product-requirements.md` P6 — restated here as constitutional, not optional). A feature that can't name what it saves or earns for a revenue-anxious owner-operator hasn't yet justified its own existence.
7. **AI assists professionals; it does not replace clinical judgment.** Any AI-driven feature (insight generation, triage suggestions, documentation assistance) is a subscriber that surfaces information to a human decision-maker — never an autonomous clinical actor. This mirrors the existing event-architecture rule that AI is "a pure subscriber, human-in-the-loop" (`docs/event-architecture.md`) and elevates it to a product-wide principle, not just an events-platform detail.
8. **Integrate before rebuilding a mature commodity system.** Accounting, payroll, government health-ID rails, SMS/email delivery infrastructure — where a mature, trusted external system already solves a problem well, Auriva should connect to it, not rebuild it. Rebuilding it natively is usually the first symptom of scope creep, not a sign of platform completeness.
9. **Mobile-first for the people receiving care; desktop-first for the people running operations.** A Doctor's consult workbench and a Receptionist's queue board are built for a desk. A person checking their own health record, booking an appointment, or managing a family member's care is very often on a phone — that surface should never be a shrunken version of the desktop experience.
10. **Build once, scale for years — don't build fast and re-litigate.** A decision like the invite-role model (§9's flagged four-role gap) should be solved properly, once, rather than patched role-by-role three separate times. Where this constitution or a strategy document flags a known structural gap, treat fixing it properly as cheaper in the long run than three quick patches.

## 4. Design Principles

- **Trust before features.** In healthcare specifically, a buyer's or a family's first question is rarely "what does it do" — it's "can I trust it with this." Every surface (marketing, onboarding, in-product) should answer the trust question before or alongside the feature question, never after. (See `docs/auriva-customer-strategy.md` Addendum B for the concrete trust-question list.)
- **Accessibility is a floor, not a feature.** WCAG-level accessibility, keyboard navigation, and screen-reader support apply to every surface a person interacts with — including, and especially, the consumer-facing side, where the population using it skews older and more varied than a typical B2B SaaS user base.
- **The person's name outranks any persona label.** Wherever a screen can say "Goldy" instead of "Patient," "Member," or any other noun, it should. This is now a standing design rule, not a one-off copy choice — see `docs/auriva-customer-strategy.md` Part 2 for the full reasoning and its own correction history.
- **Register-appropriate language, one entity, many voices.** The same underlying entity (a person receiving care, an appointment, an encounter) can be described differently depending on who's looking at it — a doctor sees "encounter," the person themselves sees "your visit." This is a *display* difference, never a *data-model* difference, and it's already a stated rule in `docs/enterprise-ux-standards.md` §5 — restated here as a permanent design principle, not a one-time UX decision.
- **Empty states and first-run moments are real product surface, not an afterthought.** A screen with no data yet is often a new user's very first impression of a whole module — it deserves the same design care as a screen full of data.

## 5. Platform Philosophy

Restating the already-decided architecture thesis (`docs/domain-architecture.md`, `docs/product-requirements.md`) as constitutional law, not just documentation:

- **One kernel.** There is no "Hospital Auriva" or "Pharmacy Auriva" — there is Auriva, configured.
- **Org type is a preset, never a fork.** A preset determines which modules pre-activate and which settings default to what. It never determines which codebase runs.
- **Presets are starting points, not tiers.** Any module can be activated for any org without commercial re-platforming. Pricing may meter modules; it must never fork the product. (This rule already exists in `docs/product-requirements.md` §7 — restated here because it is one of the most load-bearing rules in the entire platform, and the one most likely to be violated by a well-intentioned "just this once, a special build for this customer" exception.)
- **Nine shared primitives are the ceiling.** Identity/registration, scheduling/queueing, clinical encounter, orders/fulfillment, cash-side money, payer-side money, inventory, people/payouts, compliance. A new org archetype or a new feature request should be describable in terms of these nine — if it genuinely can't be, that's a signal to escalate the conversation, not to quietly add a tenth primitive.
- **Dependencies point down, events flow up.** The layered architecture (`app/api` → `services`/`repositories` → `domain` → `shared`) and the event-platform convention (services publish, subscribers react, no service reaches sideways into another's internals) are permanent, not stylistic preferences up for reinterpretation each session.

## 6. Customer Philosophy

Auriva has **five distinct customer types**, and no product, pricing, or messaging decision should collapse them into one undifferentiated "user":

1. **Economic Buyer** — pays, signs, owns the churn decision.
2. **Decision Maker / Champion** — runs the evaluation, picks the preset, owns renewal operationally (may be the same person as the buyer at small scale, and increasingly not, at larger scale).
3. **Daily Users** — the actual retention engine. A product survives because the front desk can't run without it, not because an owner likes a dashboard.
4. **Rare / Periodic Users** — logs in occasionally, dashboards more than workflow, but their pain (e.g., a Visiting Consultant working across several orgs) is often an early signal of a much larger future problem.
5. **Consumers** — the people receiving care. Never priced, messaged, or onboarded like a B2B daily user. Closer to a consumer-app user embedded inside a B2B system than to a SaaS "end user."

**The hard rule that follows from this:** every clinical or operational role is invite-only, permanently, with no self-service exception — ever. Org Owners and Consumers self-register, by design, because org creation is a sales-qualified acquisition event and consumer self-service is core to the product's promise, not because "self-registration is generally good UX." These are different reasons for different populations, and the reasoning matters more than the rule itself when a new role or workflow needs a decision made about it later.

## 7. Product Language Guide

- **The domain model and the screen are allowed to disagree, on purpose.** The database says `PatientProfile`. A doctor's discharge summary says "Patient." A consumer-facing screen defaults to the person's actual name, and falls back to a tested descriptive phrase (never a locked persona-noun) only where a label is structurally unavoidable. All three of these can be true simultaneously without contradiction — see `docs/auriva-customer-strategy.md` Part 2 for the full, revised reasoning (including its own correction: an earlier draft of that document tried to lock in a single new noun, "Member," before user testing, and was correctly walked back during review).
- **Do not coin a second name for an already-mapped concept.** This rule already exists (`docs/domain-architecture.md` §7) and is elevated here to a constitutional guardrail: any new synonym for staff, org, appointment, encounter, or any other canonical term needs the same explicit, written justification the Patient-vs-consumer-language exception got — not a quiet rename three screens deep.
- **"Marketplace" is reserved.** It names a specific, not-yet-built future workspace tied to cross-org discovery and the network vision (§8) — it should not be reused for an unrelated concept (e.g., a pricing page) just because the word is available.
- **Clinical documentation is never euphemised.** Wherever legal, clinical, or insurance accuracy is on the line, prefer the exact, professionally expected term over a softer consumer-facing one. Softening clinical language is a liability risk dressed up as a branding choice.

## 8. Decision-Making Framework

Before building *anything*, ask, in order:

1. **Does this solve a real healthcare workflow?** Not "could this be useful in general" — a specific, nameable workflow inside one of the six pillars (`AGENTS.md`).
2. **Would a clinic owner pay for this capability specifically?** If the honest answer is "they'd expect it bundled in for free" or "they'd never notice it," that's a signal, not a disqualifier — but it should change how the feature is prioritized and marketed.
3. **Does this strengthen one of the six pillars?** (Clinical Excellence, Practice Operations, Financial Operations, Patient Engagement, Organization Intelligence, Platform Foundation — `AGENTS.md`.) If it doesn't touch any of the six, stop and ask why it's being considered at all.
4. **Can a mature SaaS product already solve this better?** If yes, the answer is very likely an integration (§3, principle 8), not a native build.
5. **Does this create unnecessary complexity — for this org's actual preset, not for the platform in the abstract?** A feature can be right for a Hospital preset and wrong for an Independent Clinic preset; that's fine, that's what presets are for. It should never be right for one *codebase fork* and wrong for another.
6. **Can this be achieved by configuration, not new code?** Before writing a new module, check whether an existing one, reconfigured, already gets there.

**If the answer trends toward any of the red flags below at any point in this sequence — stop, and raise it explicitly rather than continuing.**

## 9. Guardrails — What Auriva Will Not Become

Restated from `AGENTS.md`, with the reasoning made explicit so a future decision-maker understands *why*, not just *that*:

| Will not become | Why | What to do instead |
|---|---|---|
| An HRMS (payroll, attendance, recruitment, performance reviews) | These are horizontal workforce-management problems, not healthcare problems — solving them natively dilutes focus on the six pillars for a market that already has mature, trusted HRMS vendors | Integrate (e.g., existing HR/payroll platforms) |
| A generic ERP or accounting system | Auriva's nine primitives include cash-side/payer-side money and people/payouts — they explicitly stop short of general ledger, tax filing, and full accounting | Integrate (Tally, QuickBooks, Zoho Books, or local equivalents) |
| Asset management | Not one of the nine primitives; a hospital's biomedical-equipment tracking is a distinct, mature vertical | Integrate or defer indefinitely |
| A generic CRM | Auriva's customer relationships are healthcare-specific (patient/member relationships, referral networks) — a general-purpose sales CRM is a different product for a different buyer | Integrate where a genuine B2B sales-pipeline need exists (e.g., the org's own sales team, not patient relationships) |
| A general-purpose RBAC/permissions engine, built ahead of need | Enterprise-grade custom role builders, SCIM provisioning, and audit-log-export tooling are legitimate needs *eventually*, but building them speculatively (before a named enterprise design partner asks) is scope creep dressed as platform maturity | Gate every enterprise-IAM feature behind an actual named-partner request |

**A live example of this guardrail working correctly:** OPS-002 (Leave & Holiday Management) is explicitly on hold, "ready for development, not approved for development," precisely because it is classic HRMS territory and no named design partner has yet proven it's blocking adoption. It should stay on hold on that basis — not be quietly reopened because "we're already building staff-related features anyway."

## 10. Long-Term Platform Evolution

- **R1 (current) → R6**, each release onboarding one new org archetype in order of increasing operational complexity: Independent/Multi-specialty Clinic → Diagnostics & Pharmacy → Day Care & Claims → Hospital → **Network**.
- **R6 and beyond is the network vision**, not a longer feature list: cross-org identity and context continuity for a patient whose episode crosses clinic → lab → pharmacy → hospital boundaries, extending eventually (directionally, not committed) to insurance/TPA networks, telemedicine, home healthcare, connected devices, and AI-assisted monitoring — as an integration and identity layer, not as Auriva building all of those categories itself. Full reasoning in `docs/auriva-customer-strategy.md` Addendum A.
- **The role model will not survive contact with R2 unchanged.** The current four roles (patient, super_admin, doctor, receptionist) are known, named, constitutional debt — not a surprise to be discovered later. Any session that touches authentication, invitations, or permissions should read `docs/auriva-customer-strategy.md` Part 7/10 before assuming the four-role model is permanent.
- **Every release gates on real evidence, not internal confidence.** The design-partner GA model (3–5 named partners per archetype, held through a full billing cycle before GA) is itself a constitutional discipline: Auriva does not declare a release "done" based on the team's own judgment alone.

---

## How to Use This Document

- **Before starting any new feature, workflow, or strategy document:** read this constitution first, the same way `AGENTS.md` is read first for any coding session.
- **When a request seems to fit but something feels slightly off:** re-run it through §8's decision framework explicitly, in writing, rather than proceeding on instinct.
- **When this document and a lower-level strategy document (customer strategy, PRD, a sprint plan) seem to disagree:** this document wins. Flag the conflict and propose a correction to the lower-level document — never quietly follow the lower-level document instead.
- **When this document itself seems wrong or outdated:** that's a real, legitimate outcome — a constitution is not meant to be unchangeable, only hard to change accidentally. Raise it explicitly with the product owner rather than working around it silently.
