# PKG Alignment Checklist (F3A)

Baseline: **PKG-1 → PKG-6** (`PRODUCT_BASELINE.md`). One package at a time: complete → Product Office review → freeze → next.
Per screen: ✅ done · ⬜ pending · — n/a · 🔒 frozen.

**Checklist rows (every screen signs off against all of these):**
Header · Navigation · **Information Hierarchy** (guides in the same order as the PKG) · Sections · Copy ·
**Interactions** (buttons, dialogs, hover states, confirmation flows, primary vs secondary) · Empty · Loading ·
Error · Success · Responsive · Accessibility · Approved.

## PKG-1 — Identity  · status: **🔒 FROZEN** (Product Office, 2026-07-19)

| Screen | Route | Header | Nav | Info Hier. | Sections | Copy | Interactions | Empty | Loading | Error | Success | Responsive | A11y | Approved |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Login | `/login` | ✅ | — | ✅ | ✅ | ✅ | ✅ show/hide, inline err | — | ✅ | ✅ inline | — | ✅ split-shell | ✅ | 🔒 |
| Mandatory Change | `/change-password` | ✅ | — | ✅ | ✅ | ✅ clinic name + trust | ✅ | — | ✅ button busy | ✅ inline | — | ✅ | ✅ | 🔒 |
| Workspace Selector | `/workspace` | ✅ | — | ✅ | ✅ | ✅ verbatim | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Staff Shell | doctor/staff shells | ✅ | ✅ spine + switcher | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | 🔒 |

### PKG-1 change log (this pass)
- **A (Presentation):** password show/hide toggle; remember-me copy + shared-computer caution; mandatory-change trust line (verbatim); footer re-laid to PKG-1 exactly (patient actions + staff note + start-your-practice).
- **B (Functionality presented differently):** credential error moved from toast → inline callout in the form; patient-OTP action moved from below the form → footer; assisted-reset message restyled + reworded to PKG voice.
- **C (New functionality):** self-service password reset (SEC-4) — **NOT built** (Product Office deferred). Assisted-reset retained, styled to PKG.
- **Data:** mandatory-change now names the actual clinic (fallback generic).

## PKG-2 — Owner · ⬜ not started
## PKG-3 — Doctor · ⬜ not started
## PKG-4 — Reception · ⬜ not started (largest known gap)
## PKG-5 — Patient · ⬜ not started (highest existing alignment)
## PKG-6 — Resilience · ⬜ not started (note: LoadingState=spinner must become skeletons)
