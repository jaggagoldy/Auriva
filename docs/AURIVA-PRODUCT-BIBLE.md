# The Auriva Product Bible

*The DNA of Auriva. Read this in 20 minutes and you will understand not what we built, but **why** — and how to decide what to build next.*

*This is not a spec. Specs describe features; this describes the beliefs that produce them. When a feature and this document disagree, this document wins.*

---

## 1. Why Auriva exists

Healthcare is delivered in small rooms by people under pressure. A doctor with twenty patients waiting. A receptionist answering three phones while a walk-in stands at the desk. An owner who trained to heal people, now drowning in operations. Software was supposed to help them. Mostly it made them data-entry clerks for systems designed by people who had never run a clinic.

**Auriva exists to give that room back to the people in it.** To let a clinic deliver better care *and* run a profitable, calm practice — without hiring an IT team, without an insurance-billing degree, without a training manual. We are not digitizing paperwork. We are removing the friction between a patient walking in and a patient being cared for and the clinic getting paid for it.

If we do our job, the software disappears. The doctor sees the patient. The room keeps moving. The money doesn't leak. And it *feels* like being taken care of.

---

## 2. The problem we solve

Three problems, in one sentence each:

1. **The room stops moving.** Patients wait, nobody knows who's next, the doctor is behind, the receptionist is overwhelmed. → Auriva makes "what's next" answerable at a glance, one action per stage.
2. **The money leaks.** A visit ends, the patient walks out, the bill is never raised. Multiply by thousands of visits a year. → In Auriva, the invoice drafts itself the moment the consultation completes, and the patient can't leave the desk without it surfacing.
3. **The practice feels like software, not care.** Cold, enterprise, anxiety-inducing screens — for staff *and* patients. → Auriva is warm where the patient touches it and efficient where the staff work, deliberately.

We are not solving "healthcare" in the abstract. We are solving **the operational reality of an independent clinic**, starting in India, one room at a time.

---

## 3. Why customers switch to us

They don't switch because we have more features. They switch because:

- **It fits how they actually work** — the walk-in, the waiting room, the UPI payment, the family sharing one phone number. Tools built for Western allied-health practices don't model the Indian OPD. We do.
- **A new receptionist is productive in minutes.** The board *is* the training manual — every state is visible, every next action obvious.
- **They stop losing money on the last step.** The cash cycle is closed, not an afterthought.
- **Their patients like it.** A warm phone app that answers five questions, remembers the family, and never shows a cold administrative page. That earns reviews and referrals — the only marketing an independent clinic can afford.

Switching cost in healthcare is brutal. People only switch when the new thing is *obviously, daily* better at the thing they do most. So we win the thing they do most — running the room — before anything else.

---

## 4. Why competitors fail (for our customer)

- **The Western practice-management tools** (Cliniko, Jane, SimplePractice) are beautiful and mature — but built around appointments, charting, and insurance claims for a different market. They don't model the walking-in, cash-paying, family-sharing reality. Their strengths are aimed elsewhere.
- **The Indian incumbents** (Practo Ray, HealthPlix) understand the market but bundle the clinic into a *marketplace* or lead with *AI-EMR productivity* — the clinic becomes a node in someone else's demand engine, or the doctor becomes faster at data entry, but the *room* and the *money* aren't the center.
- **The do-everything hospital suites** try to be HRMS + ERP + billing + EMR and end up mediocre at all of it, requiring consultants to deploy.

They fail our customer not because they're bad, but because **they're not built for the room.** We refuse to be everything so we can be undeniable at the one thing that matters.

---

## 5. Product philosophy

> **Every screen answers exactly one question.**

That's the whole philosophy in one line. The doctor's Today answers "who's next?" Reception's board answers "what's the room doing?" The patient's Home answers "what do I need to do today?" A screen that answers two questions answers neither.

From that, everything else follows:

- **Healthcare workflows first.** If a feature doesn't improve one of the six pillars — Clinical Excellence, Practice Operations, Financial Operations, Patient Engagement, Organization Intelligence, Platform Foundation — we challenge it before we build it.
- **Reassurance before information** (patient) · **efficiency before decoration** (staff). Same product, two tones, on purpose.
- **The status machine is the truth.** A patient's journey is one appointment flowing through states; every surface reads and writes the same states. That's why the seams line up — booking, check-in, consult, checkout, records — with no gaps and no double-owners.
- **Empty is often good news.** "You're free today," "Waiting room is clear," "Nothing to collect" — we say it warmly. Empty ≠ error.
- **We build production-ready vertical slices**, not half-features across ten screens.

---

## 6. UX philosophy

> **The staff UI says "Let's work." The patient UI says "You're being taken care of."**

- **One question per screen; one obvious primary action.** The honey "Book," the "Send in," the "Collect ₹500." You never hunt for what to do.
- **One action per stage.** Moving a patient forward is a single tap: Check in → Send in → Done → Collect. Complexity is the enemy of a busy room.
- **The patient never sees the machine.** Queues, invoices, the cash desk — confined to staff surfaces. The patient's arc never drops into an administrative page. Trust holds or rises at every step.
- **Reassuring copy is a feature.** "You're all caught up" is not filler — it's the anxiety-reduction that makes healthcare software feel human.
- **Resilience is respect.** Every state — loading, empty, offline, error, permission — offers a way forward. We never show a dead end, a 403 wall, or a raw error. India's connectivity is real; we sync when we can and never scare.

---

## 7. Design philosophy

> **Warmth is the moat. Restraint is the method.**

- **Two anchors:** **Pine** (a calm clinical teal) for staff efficiency; **Honey** (a warm amber) for patient CTAs and warmth. The contrast between the two *is* the brand. Never unify them "for consistency" — that's the point.
- **A warm paper ground**, rounded cards, generous space. It should feel like a well-run clinic, not a database.
- **Tokens, not hard-codes.** One design system, both light and dark, semantic status colors constant across themes (a red that shifts at night is a clinical-safety risk).
- **Motion with meaning**, and *no* motion when the OS asks for none. Accessibility (WCAG 2.1 AA) is a baseline, not a phase.
- **Status is never color alone** — always an icon or label too. In a clinic, being misread is dangerous.

---

## 8. Engineering philosophy

> **Reuse the architecture. Preserve the layers. Never invent a business rule.**

- **Centralized authority.** Every status change goes through one state machine. Every permission decision through one authorization module. Every mutation writes an audit event in the same transaction. There is one way to do each important thing.
- **Capabilities, not roles, gate surfaces.** Surfaces are workflow containers; who enters is decided by capability, so a solo owner-doctor and a six-person team use the *same* code.
- **Backward-compatible, additive change.** Relax a constraint, add a nullable column, promote in place. We don't tear down what works to add what's new.
- **Honesty over polish.** If a test fails, we say so. If a feature is deferred, it's in the register, not hidden. If something is inferred, it's labeled. Debt is tracked, never buried.
- **No fake UI.** We don't ship screens backed by mock data pretending to be real. If it's not wired to truth, it's marked "Soon."

---

## 9. The decision framework

Before building **anything**, run it through this gate:

```
1. Does this solve a real healthcare workflow?
2. Would a clinic owner PAY for this capability?
3. Does it strengthen one of the six product pillars?
4. Can a mature SaaS already do this better?   → if yes, INTEGRATE, don't build.
5. Does it add unnecessary complexity?
6. Which single screen/question does it belong to?
```

And classify the change:
- **Presentation** (looks different, same capability) → build it.
- **Existing capability, presented differently** → realign, keep the function.
- **New capability / new workflow / new clinical guidance** → **STOP.** This is a product decision, not an engineering one. It goes to the Product Office, and if deferred, into the register — never silently built.

When unclear: **ask.** We do not invent, simplify, or redesign around ambiguity.

---

## 10. What we never build

These are not "not yet." These are **not us**. If a feature drifts toward any of them, stop and raise an architecture review:

- **HRMS** — payroll, attendance, leave-as-HR, performance reviews, recruitment.
- **Generic ERP / accounting** — we do clinic billing and the cash cycle, not a general ledger.
- **A hospital suite that does everything** badly.
- **Asset management, generic CRM.**
- **A marketplace that turns the clinic into a lead-gen node** for someone else's demand.
- **Detection-evasion, dark-pattern, or data-exploitation features** — healthcare data is a trust, not an asset to mine.

Auriva is Practice Operations for *care*, explicitly **excluding** payroll, attendance, and HR. Saying no to these is what lets us be undeniable at what we do.

**Two deliberate non-goals worth naming:**
- **No insurance/claims (for now).** India is cash- and UPI-first. We built the cash cycle that matters here, not a claims engine that doesn't. We revisit only for a market that genuinely needs it.
- **No AI diagnosis or clinical guidance (yet).** We deferred the "Suggested protocol" AI card on purpose. AI that advises on care is a clinical-decision-support capability with real regulatory and safety weight. It earns its place *last* — on top of structured data and earned trust — never as a headline feature. What we *did* build is factual, read-only safety surfacing (allergies, conditions, abnormal vitals) with **zero inference**.
- **No self-service password reset (yet)** — an assisted reset is retained; the token/email flow is a new workflow we chose not to open at pilot scale.

---

## 11. How to evaluate every future feature

A worked example of the framework in action:

| Proposed feature | Run the gate | Verdict |
|---|---|---|
| "Add SMS appointment reminders" | Real workflow ✅ · Owner pays ✅ · Pillar 4 ✅ · Better elsewhere? (integrate a provider) · Complexity: low | **Build** (integrate an SMS provider) — this is a *known gap*, high value |
| "Add an AI that suggests diagnoses" | Real workflow ✅ · but: new clinical-guidance capability, regulatory weight, needs data + trust first | **Defer** to a clinical-intelligence release, with guardrails |
| "Add staff payroll" | Pillar? ✗ — this is HRMS | **Never.** Raise architecture review. |
| "Add a fifth column to the reception board" | Which one question does it serve? If it dilutes "what's the room doing?" | **Challenge** — protect the one-question rule |
| "Add insurance claims" | Owner pays? *In India, mostly not.* Pillar 3 ✅ but market-mismatched | **Defer** unless a target market needs it |

The framework's job is not to say yes. It's to make **saying no** disciplined and **saying yes** deliberate.

---

## 12. The Product North Star

> **A clinic runs its entire day on Auriva — the room keeps moving, no visit goes unbilled, and both the staff and the patients feel it was a good experience — with zero training and zero friction.**

Every metric ladders up to this: time-to-first-value under ten minutes, a receptionist productive on day one, no revenue leaking on the last step, patients who return and refer. If a change doesn't move the practice toward *that day*, it's not our priority.

---

## 13. The 5-year vision

We earn each stage by nailing the one before it:

```
Trust  →  Data  →  Intelligence
```

1. **Now:** one clinic, the encounter-to-cash core, production-grade.
2. **Professional:** the clinic runs *entirely* on Auriva — notifications reach patients, telehealth, deeper insight.
3. **Clinic Network:** grow from one room to a group in the same tool, effortlessly.
4. **Healthcare OS:** the six pillars filled to depth — the system of record *and* of intelligence for a practice.
5. **Platform → Marketplace → AI:** open the OS via APIs; connect labs, pharmacy, and services; and only then, on top of structured data and earned trust, let intelligence help *run* the practice — clinical decision *support* with guardrails, operational autopilot for the room.

**AI comes last, on purpose.** Not because it isn't powerful, but because in healthcare, intelligence without trust and data is a liability. We build the trust and the data first. Then the intelligence is something a clinic can actually rely on.

---

*That's the DNA. If you're deciding something and this document doesn't obviously answer it — you've found the edge of our thinking, and that's exactly where the Product Office conversation should start.*
