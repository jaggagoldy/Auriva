# 10 — Design System

← [09 UI Components](./09-ui-components.md) · [Index](./00-README.md) · Next: [11 Database Concepts](./11-database-concepts.md)

Source of truth: `src/app/globals.css` ("Auriva Design System v1.0"), which is the **same token set the PKG-1→6 prototypes were built from** — implement against these tokens; never introduce a parallel set (`PRODUCT_BASELINE.md` rule).

## Typography

- **Body/UI font:** `font-sans` → Inter (`--font-inter`).
- **Heading font:** `font-heading` → `ui-rounded, "SF Pro Rounded", "Nunito", var(--font-sans)` — a deliberately **rounded** heading face, distinct from body text, giving headings a warmer, less clinical feel consistent with the brand.
- **Mono:** `--font-mono` → Geist Mono (used sparingly — reference numbers, health_id, etc.).

## Radius scale

Base `--radius: 0.85rem`, derived: `sm = 0.6×`, `md = 0.8×`, `lg = 1×`, `xl = 1.4×`, `2xl = 1.8×`, `3xl = 2.2×`, `4xl = 2.6×`. Consistently rounded — cards, buttons, inputs, dialogs all read as one soft, warm geometric language, never sharp/corporate rectangles.

## Color tokens — full list (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FBF8F4` (warm cream) | `#14100D` | page background |
| `--foreground` | `#241F1A` | `#F5EFE7` | body text |
| `--card` | `#FFFFFF` | `#201A15` | card surfaces |
| `--card-foreground` | `#241F1A` | `#F5EFE7` | text on cards |
| `--popover` / `--popover-foreground` | `#FFFFFF` / `#241F1A` | `#201A15` / `#F5EFE7` | dropdowns/dialogs |
| `--primary` | `#0E7466` (**pine**) | `#3BAF9E` | staff primary actions |
| `--primary-foreground` | `#FFFFFF` | `#08201C` | text on primary |
| `--secondary` | `#F4EEE6` | `#2A231D` | secondary surfaces |
| `--muted` / `--muted-foreground` | `#F4EEE6` / `#8C8477` | `#2A231D` / `#B3A99C` | de-emphasized content |
| `--accent` / `--accent-foreground` | `#E4EFEC` / `#083F37` | `#0E5A4F` / `#CFE3DC` | highlighted/hover surfaces |
| `--honey` | `#E8A24C` (**honey**) | `#E8A24C` (unchanged) | patient primary, highlights, provider money |
| `--honey-soft` | `#F7E4C6` | `#3B2E18` | honey background tint |
| `--honey-deep` | `#7A4E12` | `#F3D9A8` | honey text/deep accent |
| `--honey-tint` | `#FBF0DF` | `#241C10` | lightest honey wash |
| `--destructive` | `#C9584E` | `#E06A5E` | destructive actions |
| `--warning` | `#C77D24` | `#E8A24C` | warning semantics (queue aging "orange" tier, etc.) |
| `--success` | `#3F9D5A` | `#4FB06A` | success semantics ("Collected ✓," paid) |
| `--info` | `#2A7DA3` | `#57A9CE` | informational semantics |
| `--border` | `#ECE3D6` | `rgba(255,255,255,0.1)` | borders |
| `--input` | `#E2D7C7` | `rgba(255,255,255,0.15)` | input borders |
| `--ring` | `#0E7466` | `#3BAF9E` | focus ring |
| `--chart-1..5` | pine/honey/destructive/deep-teal/muted | teal/honey/rose/light-teal/muted | data-viz series (future) |
| `--sidebar*` | mirrors card/primary/accent/border/ring in the pine family | mirrors dark equivalents | staff rail nav chrome |

**Semantic status colors are constant across light and dark** — `--warning`, `--success`, `--destructive`, `--info` deliberately do not shift hue at night, because a red or amber that reads differently after dark is treated as a **clinical-safety risk**, not a theming nicety.

## The Honey accent and Pine primary — the brand's core contrast

- **Pine** (`--primary`, `#0E7466` light / `#3BAF9E` dark) is the **staff** primary — efficiency, "Let's work."
- **Honey** (`--honey`, `#E8A24C`, unchanged between themes) is the **patient** primary — warmth, "You're being taken care of."
- This is documented as an **Intentional Variance** (see [02](./02-product-constitution.md)) — never unify the two palettes. Honey also does double duty as the universal "money/highlight" accent even on staff surfaces (e.g. role chips, occupancy-bar-at-≥75%-load, queue-aging tiers), while pine stays the staff *action* colour.
- Clinical safety colors (e.g. an allergy alert = rose/destructive-family) are held constant across light/dark for the same clinical-safety reason as the semantic tokens above.

## Spacing, cards, buttons, forms — conventions (not enumerated as separate tokens)

- Cards: white/`--card` surface, `--border` outline, generous rounded corners (`--radius`), dashed border specifically reserved for `EmptyState`.
- Buttons: primary (filled, pine or honey depending on surface), secondary/outline, destructive (uses `--destructive`), icon-only (always carries `aria-label`).
- Forms: labelled inputs, inline validation messaging (never toast-only for field errors), `--input` border tone distinct from `--border`.
- Dialogs: centered modal, backdrop fade (~180ms), focus-trapped, Escape to cancel.
- Navigation: staff **left rail** (desktop-first operator), patient **bottom-tab bar** (mobile-first consumer) — see Intentional Variances.

## Two header conventions (deliberate, not a defect)

Documented in the Experience Consistency Matrix: **compact sticky tool-bar titles** (`text-sm`, dense tool surfaces like the Doctor Workbench or Reception board) vs **content-page heroes** (`text-lg/xl`, e.g. Command Center's "Practice Health" greeting, Patient Home's "Good morning"). Both are valid, used contextually, and explicitly not something to unify.

## Motion principles

| Motion | Duration | Notes |
|---|---|---|
| Page/view transition | ≈200ms | gentle rise + fade, `cubic-bezier(.2,.8,.2,1)` |
| Card hover | ≈120ms | subtle lift; pointer only |
| Modal open | ≈180ms | pop + backdrop fade |
| Toast | ≈250ms | slide-in, auto-dismiss ~2.5s |
| Skeleton shimmer | ≈1.2s loop | the *only* continuous animation in the system |
| **Reduced motion** | **0ms** | **no movement — instant state changes** |

`prefers-reduced-motion: reduce` is honoured **globally** in `globals.css` (`@layer base`): every animation/transition duration collapses to `0.01ms` and iteration count to 1 platform-wide — not an opt-in per component, a baseline guarantee.

## Dark mode — "not an inversion"

Verified checklist (PKG-6 §9), all ✅ across every package:
- Contrast ≥ 4.5:1 (text), ≥ 3:1 (UI) in both themes.
- Semantic status colours constant light/dark (clinical-safety reasoning above).
- Queue aging (yellow/orange/red) legible on dark.
- Hero/night-gradient sections hold (already dark-anchored, e.g. the login brand panel's flat `#0B4A41`).
- Disabled buttons read as disabled via opacity, never colour alone.
- Toasts, focus rings, and chips are all re-tuned via tokens, never hard-coded hex values.
- (Future) charts/sparklines are specified to use tokened series (`--chart-1..5`), not ad-hoc colours.

## Icons

**Lucide** (`lucide-react`) throughout — confirmed via every component import reviewed (`Activity`, `Building2`, `Users`, `Stethoscope`, `ClipboardList`, `CalendarDays`, `ReceiptText`, `FlaskConical`, `Home`, `FileText`, `AlertTriangle`, `CheckCircle2`, `Inbox`, `Loader2`, `RefreshCw`, `ShieldAlert`, etc.). No second icon library is used anywhere in the reviewed component set.

## Accessibility baseline (WCAG 2.1 AA target)

- Every action keyboard-reachable; logical tab order; Enter confirms, Escape cancels; ⌘K command palette on staff surfaces.
- Visible focus ring: 2.5px, `--ring`/pine-family colour, never removed.
- Touch targets ≥ 44×44px for primary controls.
- Icon-only buttons always carry `aria-label`; live regions (`aria-live`) for toasts and queue updates.
- Status is never conveyed by colour alone — always paired with an icon and/or a text label (this is why every `STATUS_META` entry in `src/shared/queue.ts` carries both a `label` and a `dot`/`badge` colour, never colour alone).

## The state system (recap, full detail in [09-ui-components.md](./09-ui-components.md))

`EmptyState`, `ErrorState` (3 tiers), `PermissionState`, `SuccessState`, `LoadingState`, `Skeleton`, `OfflineBanner` — one shared implementation each, adopted platform-wide, replacing what had been ~20 hand-rolled empty blocks and ~47 ad-hoc spinners before Batch E.

## Responsive rules

| Breakpoint | Navigation | Cards | Tables / Board |
|---|---|---|---|
| Phone (<640) | Patient bottom-tab; staff rail collapses to top/hidden | 1-col stack | Board lanes stack; tables → list rows |
| Tablet (640–1024) | Rail → top tabs; two-pane → list→detail | 2-col | Board 1–2 lanes visible; tables scroll in their own container |
| Laptop (1024–1440) | Full rail + content (+ context rail where applicable) | 3–4 col | Full board/table |
| Desktop (>1440) | Rail + content; extra width can host density/context | capped max-width | Full; line length never stretches |

**Rule:** wide content (tables, board, calendar, timeline) scrolls **inside its own container** — the page body itself never scrolls sideways.

## Densest screens flagged for manual review

Doctor Workbench, Reception Queue, and Owner Dashboard are explicitly flagged 🟡 in the Experience Consistency Matrix for a manual responsive spot-check at tablet width — not a defect, a noted follow-up item for the beta acceptance pass.
