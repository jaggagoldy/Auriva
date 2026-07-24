# 02 — Product Constitution

← [01 Vision & Strategy](./01-vision-and-strategy.md) · [Index](./00-README.md) · Next: [03 Personas](./03-personas.md)

These are Auriva's immutable, quotable principles. Every one is drawn verbatim or near-verbatim from `AGENTS.md`, `PRODUCT_BASELINE.md`, `docs/PRODUCT-HANDBOOK.md`, and the frozen UXS-043 prototype packages. Treat each as a rule a new screen or feature must satisfy before shipping — not aspirational language.

## The numbered principles

1. **Reuse existing architecture.** Never invent a parallel mechanism for something that already has one (a second empty-state pattern, a second session model, a second event bus). Extend what exists.

2. **Centralized authorization — no `role === "..."` literals outside `src/domain/authorization.ts`.** Every role/permission/capability check in the codebase must go through that one module, so when the access model changes, it changes in exactly one file.

3. **No invented business rules.** Do not add lifecycle states, permission checks, or workflow branches beyond what the frozen specs (PKG-1→6, APS-044/045, the C2 permission matrix) actually define. When a PKG screen implies a new rule, that is Category C (see principle 8) — stop and ask.

4. **No fake UI.** Never render data, counts, or affordances that aren't backed by a real capability or a real record. An honest "Soon" badge (see the admin nav's disabled Clinics/Plan items) is correct; a fabricated number or a clickable button that does nothing is not.

5. **Challenge assumptions against the six pillars before implementing.** Every requested feature is evaluated: does it solve a real healthcare workflow? Would a clinic owner pay for it? Does it strengthen a pillar? Could another mature SaaS product already do it better? Does it add unnecessary complexity? Could integration replace building it? (Full checklist in [01](./01-vision-and-strategy.md).)

6. **"Every screen answers one question."** This is the master UX heuristic behind all six PKG packages: Login → "who are you?"; Today (Doctor) → "who's next, and what do they need?"; Front desk board → "what's the room doing?"; each Patient tab → one of five explicit questions. A screen that tries to answer two questions at once is a design smell.

7. **Reassurance-first patient, efficiency-first staff.** The patient app deliberately reads warmer and calmer ("You're free today," "You're all caught up") than the staff surfaces, which read efficient and information-dense. This is not inconsistency — it is the brand's deliberate emotional contrast, formalized as **Intentional Variances** (see below) that must never be "corrected" toward uniformity.

8. **Classify every difference from a frozen PKG screen (Implementation Rule #2):**
   - **Category A — Presentation** (spacing, copy, typography, icons, navigation labels, hierarchy) → implement immediately.
   - **Category B — Existing functionality presented differently** (moved buttons, different card layout, alerts) → realign to the PKG.
   - **Category C — Entirely new functionality** (new APIs, workflows, permissions, backend logic) → **STOP and ask Product Office.** Never silently add new capability.

9. **Experience First (Implementation Rule #3), when a PKG introduces a new concept:** can it be built from existing data + workflows? → build it. Does it require new business logic? → pause and ask. Does it introduce a new workflow/lifecycle behaviour? → defer unless explicitly approved.

10. **Preserve Intent, not just pixels (Implementation Rule #4).** Alignment validates both *visual fidelity* (does it match the approved PKG?) and *experience fidelity* (does it create the same workflow emphasis — e.g. the Consult Workbench must stay minimal and consultation-first, not become a documentation-heavy form).

11. **Empty ≠ error.** An empty list is very often *good news* (clear waiting room, free day) and must say so warmly with one next action — never render "No data" or a bare table.

12. **Capabilities are absent, not greyed.** If a role cannot do something, the UI does not show a disabled button with a tooltip explaining why — the capability simply is not rendered. Where a permission wall is unavoidable (e.g. a genuinely wrong URL), `PermissionState` explains in plain language and offers a path — never a raw 403.

13. **PKG-1→6 is the single, frozen source of truth for UX.** `Experience 2.0` (`design/experience-v2/`), earlier mockups (`design/aps-*`, `design/mockups/*`), and any hifi/blueprint concept are explicitly **not** the approved product and must never be merged from, even partially.

14. **The Experience Behaviour Matrix is the contract for any new screen.** Loading, Empty, Offline, Error, Permission, Slow network, Destructive, Success, and Long-running each have one mandated treatment (see [09](./09-ui-components.md) and [06](./06-feature-catalog.md)); a new screen must satisfy every relevant row before shipping.

15. **Every implementation task begins with "Which PKG screen am I implementing?" and ends with "Does this now match the approved PKG?"** — Implementation Rule #1, the engineering contract. No task starts without naming its screen; none is done until verified against it.

16. **Do not invent, simplify, or redesign layouts.** Implement the approved design faithfully. If anything is unclear — wording, spacing, hierarchy, interaction — **stop and ask the Product Office.** Do not assume.

17. **One canonical component name → one implementation → one QA vocabulary.** (`WorkspaceSwitcher`, `Toast`, `Banner`, `InlineMessage`, `Callout`, `EmptyState`, `Skeleton`, `OfflineBanner`, `ErrorState`, `PermissionState`.) Naming drift across docs/engineering/QA was an identified defect (Phase-1 finding F8) and is now governed — see [09](./09-ui-components.md).

18. **Document intentional variances rather than "fixing" them.** Staff = pine primary / patient = honey primary. Staff = left rail / patient = bottom-tab. UI label "Owner" while the stored role is `super_admin`. These are deliberate and permanent — see the table below.

19. **Any change to the frozen baseline requires explicit Product Office approval** (`PRODUCT_BASELINE.md` Rule 6). This applies to the baseline document itself and to any of the six PKG packages once frozen.

## Intentional Variances (do not "fix")

| Variance | Rule | Why |
|---|---|---|
| Primary colour: staff = **pine** (`#0E7466`), patient = **honey** (`#E8A24C`) | Never unify | Efficiency vs warmth — the brand's core emotional contrast |
| Navigation: staff = left **rail**, patient = **bottom-tab** | Never unify | Desktop-first operator vs mobile-first consumer |
| Role label: UI says **"Owner"**, DB stores `super_admin` | Display label only | `super_admin` is a historical/technical name meaning "owns a customer Organization" — never surfaced to users |
| Two header conventions: compact tool bars vs content-page heroes | Both valid, used contextually | Documented convention (Experience Consistency Matrix), not a defect |

## Governance workflow for adding any new screen (from the Product Handbook §9)

1. Which PKG does it belong to? Reference the frozen prototype before building.
2. Reuse the vocabulary in [09-ui-components.md](./09-ui-components.md) — never hand-roll empty/error/loading/permission blocks.
3. Satisfy the Experience Behaviour Matrix ([06](./06-feature-catalog.md)) for every state the screen can be in.
4. Use the display language from the glossary ([04](./04-information-architecture.md)); build against the domain model ([11](./11-database-concepts.md)).
5. Honour the Intentional Variances table above.
6. New functionality (Category C) — stop and get Product Office direction; log deferrals in `docs/RELEASE-CANDIDATE.md` (and cross-reference [18](./18-deferred-features.md) here).

## Act as architect *and* product guardian

`AGENTS.md` is explicit that any AI working on this codebase must act as **both an architect and a product guardian**, not only a software engineer — meaning the burden of proof is on *justifying* a new feature against the six pillars, not on finding a reason to refuse it. When in doubt, the constitution's default answer is: **stop and ask**, never assume.
