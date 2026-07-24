# Auriva — Product Baseline

> **Read this before implementing, redesigning, or reviewing any screen.**
> This file is the single, permanent source of truth for what Auriva's product *is*.

## The baseline

| | |
|---|---|
| **Approved UX baseline** | **PKG-1 → PKG-6** (`docs/prototype/pkg-{1..6}-*.html` + `PKG-{1..6}-*.md`) — the UXS-043 frozen prototype packages |
| **Approved product scope** | **Auriva Professional Edition** |
| **Status** | 🔒 **FROZEN** |
| **Authority** | Product Office defines the product · PKG-1→6 define the UX · Engineering implements exactly that |

## The six packages (acceptance criteria for every screen)

| Package | Surface | Screens |
|---|---|---|
| **PKG-1 — Identity** | Auth / workspace entry | Login (two-panel) · Workspace Selector · Staff Shell · Mandatory Password Change |
| **PKG-2 — Owner** | `/clinic` (solo) · `/admin` | Solo "Today" · Grow transition · Command Center · Team |
| **PKG-3 — Doctor** (frozen v1.0, 9.7/10) | `/doctor` | Today · Workbench · Patients · Schedule · Practice · Profile |
| **PKG-4 — Reception** | `/staff` | Board (Today's flow) · Calendar · Desk (Collect & close) · Walk-in · Checkout |
| **PKG-5 — Patient** | `/patient` | Home · Book · Records · Family · You |
| **PKG-6 — Resilience** | cross-cutting | Empty · Loading (skeletons, not spinners) · Offline · Error (3 tiers) · Success · Permission · Notifications · Responsive · Dark mode · A11y |

## Implementation Rule #1 (the engineering contract)

> **Every implementation task must reference the corresponding PKG screen *before* coding begins,
> and must verify alignment against that same PKG screen *before* it can be considered complete.**

No task starts without naming its PKG screen; no task is done until it matches that PKG screen.

## Implementation Rule #2 — classify every difference

When aligning to a PKG, every difference is exactly one of:

- **Category A — Presentation** (spacing, copy, typography, cards, hierarchy, icons, navigation, headers) → **implement immediately.**
- **Category B — Existing functionality presented differently** (move buttons, different card layout, hero, alerts, information hierarchy) → **realign to the PKG.**
- **Category C — Entirely new functionality** (new APIs, workflows, permissions, backend logic) → **STOP and ask Product Office.** Never silently add new capability.

## Implementation Rule #3 — Experience First

When a PKG introduces a new concept:
1. **Can it be built from existing data + workflows?** → **build it.**
2. **Does it require new business logic?** → **pause and ask Product Office.**
3. **Does it introduce a new workflow or lifecycle behavior?** → **defer** unless explicitly approved.

## Implementation Rule #4 — Preserve Intent

Alignment validates **both**:
1. **Visual fidelity** — does the screen match the approved PKG?
2. **Experience fidelity** — does it create the same user experience and workflow emphasis the PKG intended (e.g. the Consultation Workbench must stay minimal, consultation-first, with clear patient context and obvious primary actions)?

Presentation & hierarchy refinements that preserve the intended experience are encouraged. Anything requiring new workflows, business logic, permissions, persistence, or backend still pauses for Product Office approval.

## Rules

1. **PKG-1→6 are the implementation contract.** They take precedence over every other UX concept, mockup, or prototype.
2. **Do NOT use** — Experience 2.0 (`design/experience-v2/`), premium/experimental concepts, earlier mockups (`design/aps-*`, `design/mockups/*`, hifi/blueprint mockups), or alternative navigation. They are **not** the approved product. Do not merge ideas from them.
3. **Every implementation task begins with** "Which PKG screen am I implementing?" **and ends with** "Does this now match the approved PKG?"
4. **Do not invent, simplify, or redesign** layouts. Implement the approved design faithfully.
5. **If anything is unclear** — a screen, interaction, wording, hierarchy, spacing, or behavior — **stop and ask the Product Office.** Do not assume.
6. **Any change to this baseline requires explicit Product Office approval.**

## Design tokens
The live design system is `src/app/globals.css` (Auriva Design System v1.0) — the same tokens the PKG prototypes were built from. Implement against these tokens; do not introduce a parallel token set.

## Document classification
See the Documentation Audit (Product Office-approved) for which repo documents are **Active** (support PKG-1→6), **Archived** (historical), or **Obsolete** (conflicting — e.g. Experience 2.0). Archived/obsolete material must never be used as an implementation reference.
