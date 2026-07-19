# Prototype Package 6 — Experience Resilience System

**Series:** UXS-043 Interactive Prototype · Package 6 of 6 · **the design-system finale**
**Covers:** Empty · Loading (skeleton) · Offline & Connectivity · Errors · Permissions · Notifications · Responsive · Dark Mode · Accessibility — **+ the Experience Behavior Matrix**
**Status:** ✅ **APPROVED & FROZEN — v1.0** (Product Office, 2026-07-15, scored 9.95/10) after two additive completions: **Success** and **Long-running Operations** rows added to the Behavior Matrix (§1), Success-states shown live, and a **Motion Principles** section (§10a). The Experience Behavior Matrix and Design Resilience Standards are now **governed artifacts**.
**This freezes the entire UXS-043 series** (Packages 1–6). Next: whole-of-UXS-043 end-to-end review → cross-package consistency audit → external (Gemini) review → **PRS-043**.

Prototype file: [pkg-6-resilience.html](./pkg-6-resilience.html) — a **living reference gallery** (every state, both themes, interactive).

> Packages 1–5 define **what Auriva does.** Package 6 defines **how it behaves when reality isn't
> perfect** — and that is what makes it feel production-ready. This is the *Experience Resilience
> System* for the whole platform, not a set of empty screens. Every rule here applies across Doctor,
> Reception, Patient, and Owner surfaces.

---

## 1. The Experience Behavior Matrix (the keystone deliverable)

| Situation | Doctor | Reception | Patient | Owner | **Rule (all surfaces)** |
|---|---|---|---|---|---|
| **Loading** | Patient-card skeleton | Queue/lane skeleton | Hero + timeline skeleton | Tile/stat skeleton | **Skeletons that match final layout — never spinner-only**; perceived-instant < 400ms |
| **Empty** | "No appointments — open your calendar" | "Waiting room is clear — you're all caught up" | "You're free today — enjoy your day" | "No team yet — invite your first member" | **Always a reason + one next action (CTA)**; never "No data" |
| **Offline** | Queue clinical edits locally | Queue check-ins locally | Read records from last sync | Read dashboards from last sync | **Non-blocking banner + auto-sync; show Queued → Syncing → Synced**; never scare |
| **Error** | "Couldn't load appointments — Retry" | "Payment couldn't be recorded — Try again" | Friendly explanation + Retry | "Couldn't load reports — Retry" | **Icon + plain cause + recovery action; never a raw/technical message** |
| **Permission** | Finance → "Owners see revenue — ask your owner" | Clinical notes → "Only clinicians edit notes — request access" | Staff surface → not shown at all | Unavailable feature → "Coming to your plan" | **Explain in plain language + offer a recovery path; never a 403 wall** |
| **Slow network** | Inline "Saving…" then "Saved" | Inline "Saving…" then "Saved" | Inline "Saving…" then "Saved" | Inline "Saving…" then "Saved" | **Micro-state feedback; optimistic where reversible** |
| **Destructive action** | Confirm dialog | Confirm dialog (suspend/archive) | Confirm (cancel visit) | Confirm (archive member) | **Modal + explicit consequence; separated from primary** |
| **Success** | "Signed ✓" toast | "Collected ✓" toast | "You're booked" screen | "Invite sent ✓" | **Confirmation + optional next action; never interrupt the workflow** (toast for most; a screen only for booking/checkout) |
| **Long-running** | — | CSV import | Report export | Bulk invite · restore | **Show progress · run in background · notify on completion · never freeze the UI** |

This matrix is the contract: any new screen in Auriva must satisfy the relevant row before it ships.

---

## 2. Empty States (reassurance / next-action, per persona)

| Surface | Empty copy | Next action |
|---|---|---|
| Doctor · Today | "No appointments today. Start by opening your calendar." | Open schedule |
| Reception · Queue | "Waiting room is clear. You're all caught up." | Register walk-in |
| Patient · Home | "You're free today. Enjoy your day." | Book a visit |
| Records | "Your first visit will appear here." | — (reassuring) |
| Calendar | "Nothing booked yet." | Book |
| Payments / Desk | "Nothing to collect today." | — (reassuring) |
| Team | "No team yet — invite your first member." | Invite staff |

**Rule:** empty ≠ error. Empty is often *good news* (clear room, free day) — say so warmly.

---

## 3. Loading — skeletons, not spinners

Skeleton shapes mirror the final content (card, row, lane, hero, timeline). Shimmer animation respects
`prefers-reduced-motion` (static tint when reduced). Button-scoped actions use an inline spinner; content
regions never do.

---

## 4. Offline & Connectivity (critical for India)

- **Offline banner** (non-blocking, calm): *"You're offline. We'll sync automatically when you're back online."*
- **Connectivity micro-states:** `Saving…` → `Saved` · `Syncing…` → `Synced` · `Queued` · `Failed — Retry`.
- Reads stay visible from last sync; writes queue locally and reconcile. **Never** a blocking "no connection" wall.

---

## 5. Error States (three tiers)

| Tier | Example | Treatment | Recovery |
|---|---|---|---|
| **Recoverable** | Couldn't load appointments | Inline, calm | **Retry** |
| **Action failed** | Payment couldn't be recorded | Toast/inline, amber | **Try again** |
| **Critical** | Clinic unavailable | Full card, red | **Contact support** |

Every error: **icon + plain explanation + recovery action.** No stack traces, no codes, no "Something went wrong" alone.

---

## 6. Permission States (graceful degradation)

Not 403 walls — explanations with a path:
- Reception → Clinical Notes: *"Only clinicians can edit consultation notes."* → Request access.
- Doctor → Finance: *"Revenue is visible to owners."* → Ask your owner.
- Patient → Staff surface: **never shown** (capability-absent, not disabled).
- Owner → unavailable feature: *"Coming to your plan."* → See plans.

(Consistent with SAD-043 §7: capabilities absent, not greyed; APS-045 X1.)

---

## 7. Notifications — when to use which

| Pattern | Use for | Duration |
|---|---|---|
| **Toast** | Transient confirmation (saved, sent, collected) | auto-dismiss ~2.5s |
| **Banner** | Persistent context (offline, plan expiring) | until resolved |
| **Inline** | Field/section validation & recoverable errors | until fixed |
| **Modal** | Blocking decisions / destructive confirmation | until actioned |

---

## 8. Responsive Behaviour (rules, no redesign)

| Breakpoint | Navigation | Cards | Tables / Board |
|---|---|---|---|
| **Phone (<640)** | Patient bottom-tab; staff rail → top/hidden | 1-col stack | Board lanes stack; tables → list rows |
| **Tablet (640–1024)** | Rail → top tabs; two-pane → list→detail | 2-col | Board 1–2 lanes; tables scroll in container |
| **Laptop (1024–1440)** | Full rail + content (+context rail) | 3–4 col | Full board / table |
| **Desktop (>1440)** | Rail + content; extra width → context/density | capped max-width | Full; no stretched line length |

Rule: wide content (tables, board, calendar, timeline) scrolls **inside its own container** — the page body never scrolls sideways.

---

## 9. Dark Mode Audit (not an inversion)

Checklist — every item verified across all packages:
- ✅ Contrast ≥ 4.5:1 (text), ≥ 3:1 (UI) in both themes
- ✅ **Semantic status colours constant** light/dark (a red/amber that shifts at night is a clinical-safety risk)
- ✅ Queue aging (yellow/orange/red) legible on dark
- ✅ Hero/night gradients hold (already dark-anchored)
- ✅ Disabled buttons read as disabled (opacity, not colour alone)
- ✅ Toasts, focus rings, chips all re-tuned via tokens (not hard-coded)
- ✅ Charts/sparklines (future) use tokened series

---

## 10. Accessibility Baseline (the platform standard)

- **Keyboard:** every action reachable; logical tab order; Enter confirms, Esc cancels; ⌘K palette (staff).
- **Visible focus:** 2.5px ring (`--ring`/`--pine`), never removed.
- **Reduced motion:** `prefers-reduced-motion` → no shimmer/slide; instant state changes.
- **Touch targets:** ≥ 44×44px for primary controls.
- **Screen-reader labels:** icon-only buttons carry `aria-label`; live regions (`aria-live`) for toasts/queue.
- **Colour independence:** status never conveyed by colour alone — always paired with icon/label.
- Target: **WCAG 2.1 AA**.

---

## 10a. Motion Principles

Consistent timing platform-wide — not per-engineer invention. All disabled under `prefers-reduced-motion`.

| Motion | Duration | Notes |
|---|---|---|
| Page / view transition | ≈ 200 ms | gentle rise + fade (cubic-bezier .2,.8,.2,1) |
| Card hover | ≈ 120 ms | subtle lift; pointer only |
| Modal open | ≈ 180 ms | pop + backdrop fade |
| Toast | ≈ 250 ms | slide-in, auto-dismiss ~2.5 s |
| Skeleton shimmer | ≈ 1.2 s loop | the only continuous animation |
| **Reduced motion** | **0 ms** | **no movement — instant state changes** |

---

## 11. UX Validation Checklist

| # | Check | Result |
|---|---|---|
| 1 | One purpose per state | ✅ each state answers "what now?" |
| 2 | Primary/recovery action present | ✅ every empty/error/permission has a CTA |
| 3 | ≤3 interactions to recover | ✅ Retry / Request access / Book |
| 4 | **Empty/loading/offline/permission/error all defined** | ✅ **this package is exactly that matrix** |
| 5 | Reuses components/tokens | ✅ warm system; nothing new invented |
| 6 | Design-system compliant | ✅ tokens only |
| 7 | Light + dark audited | ✅ §9 checklist |
| 8 | Responsive documented | ✅ §8 rules |
| 9 | Isolation preserved | ✅ permission states never leak other tenants |
| 10 | No capabilities exposed | ✅ absent, not greyed |
| 11 | Accessibility baseline | ✅ §10 |

**Gate result:** all pass → this package *closes* item 4 that packages 1–5 deferred. Cleared for review.

---

## 12. What reviewers should look for
- **Product Office:** is the Behavior Matrix a usable contract for future screens? Does every state offer a path forward?
- **Gemini UX audit:** dark-mode parity, focus/keyboard, reduced-motion, colour independence, tone of error/offline copy.
- **Engineering (later):** these become reusable components (`<EmptyState>`, `<Skeleton>`, `<OfflineBanner>`, `<ErrorState>`, `<PermissionState>`) referenced by PRS-043.
