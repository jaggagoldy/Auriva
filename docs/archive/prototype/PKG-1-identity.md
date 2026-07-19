# Prototype Package 1 — Identity Experience

**Series:** UXS-043 Interactive Prototype · Package 1 of 6
**Covers:** Login · Forgot Password · Reset Password · Mandatory Password Change · Workspace Selector · Workspace Switcher
**Status:** ✅ **APPROVED & FROZEN — v1.0** (Product Office, 2026-07-14, scored 9.7/10). Do not revisit unless a critical defect is found in clinician review. This is the visual + interaction **baseline** for the authentication experience.
**Reset decision (ratified):** self-service reset for **both** patients (OTP) and staff (future APS-044), **plus** admin-initiated reset from Team Management — complementary, not exclusive.
**Why first:** this package validates the **biggest architectural change** introduced by APS-044/045 — one credential, many workspaces, server-resolved surface, isolation on switch. Nothing else can be reviewed with confidence until the identity/workspace entry is agreed.

Prototype file: [pkg-1-identity.html](./pkg-1-identity.html) (pure HTML/CSS + vanilla JS — not React/Next/Tailwind; clickable, throwaway).

---

## 1. Storyboard

**User goals**
- *Staff:* sign in with one credential and land in the right place with zero decoding.
- *Multi-clinic staff:* choose which clinic I'm acting in, and switch instantly without losing my place — and trust that clinics never bleed into each other.
- *Provisioned staff:* my practice made my account; I set my own password and get to work.
- *Anyone locked out:* recover access without hitting a dead end.

**Navigation & screen flow**

```
                    ┌──────────────┐
                    │    Login     │──"Forgot password?"──► Forgot ──► Reset ──► Login
                    └──────┬───────┘
             (1 membership)│(2+ memberships)
                    ┌──────┴───────┐
     (provisioned)  │   Selector   │
  Mandatory Change ─┤ (last pre-   │
        │           │  selected)   │
        ▼           └──────┬───────┘
     Staff Shell ◄─────────┘  pick workspace
        │
        └─ Workspace Switcher (top bar) ─► Selector overlay ─► switch ─► content changes, isolation felt
```

**States present in this package:** default, focus, validation error, success confirmation, loading
(on switch), and the isolation reassurance line. (Full empty/offline/permission matrix is Package 6.)

**Decisions encoded**
- Single membership **auto-opens** (no selector) — the selector is only shown for 2+.
- Selector **pre-selects the last-used** workspace (`Users.last_workspace_id`).
- Switching **re-renders the content region decisively** and swaps the active-clinic chip — the isolation guarantee is *felt*, not stated in legalese.
- Mandatory password change **blocks all workspaces** until resolved and explains *why*.

---

## 2. Low-Fidelity Wireframes (layout only — no colour/branding)

**Login**
```
        ┌───────────────────────────┐
        │           Auriva          │
        │      Sign in to work      │
        │  [ phone or email       ] │
        │  [ password           👁 ] │
        │            Forgot password?│
        │  [      Continue        ] │
        │  ───────── or ─────────    │
        │  I'm a patient →          │
        └───────────────────────────┘
```

**Forgot / Reset**
```
 Forgot                          Reset
 ┌──────────────────┐   ┌──────────────────┐
 │ Reset your access│   │ Set a new password│
 │ [ phone/email  ] │   │ [ new password  ] │
 │ [ Send reset   ] │   │ [ confirm       ] │
 │ ← Back to sign in│   │ [ Set password  ] │
 └──────────────────┘   └──────────────────┘
```

**Mandatory Password Change**
```
 ┌────────────────────────────────────┐
 │ (i) Your practice created this      │
 │     account. Set your own password. │
 │ [ new password                    ] │
 │ [ confirm password                ] │
 │ [ Set password & continue         ] │
 └────────────────────────────────────┘
```

**Workspace Selector**
```
 Choose your workspace
 ┌──────────────────────┐  ┌──────────────────────┐
 │ ● Sunrise Clinic     │  │ ○ Metro Hospital      │
 │   Doctor   [Last used]│  │   Doctor              │
 │            Open →     │  │            Open →      │
 └──────────────────────┘  └──────────────────────┘
```

**Staff Shell + Switcher**
```
 ┌─ Auriva ───────── [ Sunrise Clinic · Doctor ▾ ] ──── (avatar) ┐
 │ Today                                                          │
 │ Workbench   ┌────────────────────────────────────────────┐    │
 │ Schedule    │  Today · Sunrise Clinic                     │    │
 │ Patients    │  Showing Sunrise Clinic only — no other     │    │
 │ Practice    │  workspace's data is visible here.          │    │
 │ Profile     │  [ patient ] [ patient ] [ patient ]        │    │
 │             └────────────────────────────────────────────┘    │
 └────────────────────────────────────────────────────────────────┘
        click ▾ → overlay selector → switch → content + chip change
```

---

## 3. Review Notes (hi-fi rationale)

| Screen | Why it exists | Information arrangement | UXS-043 principle | APS-044/045 decision |
|---|---|---|---|---|
| **Login** | Single credentialed entry to the professional world | One column, credential-first, forgot-link secondary, patient world offered but visually separate | "Always suggest next action"; two worlds separate | APS-044 §9 separate patient/staff login |
| **Forgot** | Recovery without dead-end | Single field, one action, back-link always present | "Never a dead end" | (supporting) managed accounts still self-recover |
| **Reset** | Complete recovery | New + confirm, inline match validation, success → sign in | "Show system status" | — |
| **Mandatory Change** | Provisioned first-login | Explains *why* first, then the form; blocks everything else | "Never a dead end"; status visible | APS-044 §9 managed provisioning; SAD-043 §6/§11 `must_change_password` |
| **Selector** | Choose active membership | Cards = clinic + role + last-used hint; keyboard-first; pre-selection | "The right room"; ≤3 interactions | APS-045 §7 selector; `last_workspace_id` |
| **Shell + Switcher** | Act in one clinic, switch safely | Active-workspace chip always in chrome; content is per-clinic; isolation line explicit | "Switching is instant & unmistakable"; "Isolation felt as trust" | APS-045 §7 switch; APS-044 §13a Isolation Rule |

**Design-system fidelity:** built entirely on Auriva Design System v1.0 tokens (cream `#FBF8F4`, teal
primary `#0E7466`, honey highlight `#E8A24C`, rounded headings, `--radius` 0.85rem, semantic colours
constant across light/dark). Reuses existing component patterns (card, input, button, badge/chip,
dialog/overlay, skeleton) — no new components invented. Full light + dark parity.

---

## 4. UX Validation Checklist (gate before review)

| # | Check | Result |
|---|---|---|
| 1 | Each screen answers **one** primary question | ✅ Login→"who are you"; Selector→"which clinic"; Shell→"today, here" |
| 2 | Primary action is obvious | ✅ One filled primary button per screen |
| 3 | Task completable in ≤3 interactions where practical | ✅ Login=2 fields+Continue; Selector=1 click (pre-selected) |
| 4 | Empty/loading/offline/permission/error states defined | ◑ Loading (on switch) + validation errors + success shown here; **empty/offline/permission are Package 6** (by design) |
| 5 | Reuses existing components, invents none | ✅ card/input/button/chip/overlay/skeleton only |
| 6 | Complies with Auriva design system | ✅ real tokens, no off-palette values |
| 7 | Supports light **and** dark themes | ✅ full parity + toggle |
| 8 | Usable on tablet/desktop (mobile where applicable) | ✅ responsive; auth centered; shell adapts rail→top on narrow |
| 9 | Preserves tenant isolation | ✅ switch swaps content wholesale + explicit isolation line |
| 10 | Avoids exposing unavailable capabilities | ✅ single-membership shows no switch affordance; nothing cross-tenant listed |
| 11 | Avoids unnecessary clicks / cognitive load | ✅ pre-selection, auto-open for single membership |

**Gate result:** item 4 is intentionally partial (states belong to Package 6). All other items pass →
**cleared to move to the review cycle.**

---

## 4a. Review Round 1 — polish pass (applied)

Product Office scored the first build **8.5/10** (Architecture 10 · UX Flow 9 · Visual 8.5 · Healthcare
Feel 7.5 · Production Readiness 7) and moved it to Review Round 1 with a "make it feel like enterprise
healthcare software, not generic SaaS" brief. Refinement only — tokens, IA, and flow preserved.

| Feedback | Change applied |
|---|---|
| Login card too small / right side empty | Login rebuilt as a **two-panel front door**: form left (~roomy column), **brand/trust panel right** — deep-teal gradient, abstract healthcare motif (pulse line + care mark), "One login. Every clinic you work at.", three value props, trust chips |
| Brand hierarchy (action before tagline) | Now **Auriva → "Sign in to work" → "Healthcare, run well."** |
| Unrealistic field value | Realistic demo copy throughout: `dr.ravi@sunriseclinic.com`, prefilled so the happy path is one click |
| Button too small for quick/touch use | Primary CTAs enlarged (`.btn-lg`, taller hit area) across all auth screens |
| Missing trust signals | Trust line under the login ("Encrypted sessions · Audit-logged · Privacy by design") + contextual trust footers on Forgot ("links expire, single-use") and Mandatory ("your practice can never see your password") + trust chips in the brand panel |
| Feel like software, not a website | Two-panel branded front door + calmer spacing + rounded-heading hierarchy → enterprise-healthcare read |

**Preserved deliberately:** the palette (teal/cream/honey), the patient/staff split, the distinct
prototype toolbar, and the entire interaction flow. Sub-task screens (Forgot/Reset/Mandatory) stay
**focused centered cards** by design — the grand front door is the entry; once inside a specific task,
focus beats marketing.

**Compliance copy note:** used market-neutral trust language ("Encrypted · Audit-logged · Privacy by
design") rather than HIPAA, since Auriva's context is India (health_id/DPDP, INR, Asia/Kolkata). Swap to
the exact certification wording once the target-market compliance posture is confirmed.

---

## 4b. Final Freeze Pass — realigned to the approved app design + production behaviour

Product Office noted the app **already has an approved login** ([src/app/login/page.tsx](../../src/app/login/page.tsx)) and directed: reuse it, don't invent. This pass **realigns the prototype to the real design** and adds production-quality interaction. No new concepts, IA, or flow.

**Design realignment (match the shipped login):**
- Left panel is the real **flat `#0B4A41`** brand/trust panel with the single honey radial glow (not my invented gradient + illustration).
- The Auriva mark is the app's **ECG/pulse glyph** (`M3 12h3l2-6 4 12 2-6h4`), replacing my placeholder "A" everywhere.
- Copy matches: **WELCOME** eyebrow · "Your clinic and your care, in one calm place." · the real lede · the **Free / 2 min / UPI / Yours** trust grid · the real footer.
- Right side is the **"Welcome back" card** with the combined **Email or phone** field (mail icon) and the real placeholder `you@clinic.in · or +91 98765 43210`, password with inline "Forgot password?".

**Production behaviour (freeze criteria):**
- **Intelligent email/phone detection** — email → RFC-ish format check; phone → India 10-digit (`[6-9]\d{9}`, optional `+91`), letters stripped in phone mode, digit count capped.
- **Inline validation** on blur + live; **Continue/Sign in disabled until valid**; **Enter submits only when valid**.
- **Realistic states:** required, invalid email, invalid phone, **wrong credentials** (change the prefilled password to trigger — shake + error banner), **loading spinner**, success → Selector.
- **Patient vs Staff (APS-044):** main area is **Staff Sign In**; the footer gives patients **two explicit actions** (Sign in with OTP · Create a patient account) and states plainly **"Team members are added by their practice — staff don't create their own accounts."** Owner org creation is a separate "Start your practice →".
- **Remember Me → safer:** now **OFF by default**, reworded "Keep me signed in on this device / Leave this off on shared clinic computers."

**Freeze criteria status:** ✅ intelligent validation · ✅ input constraints · ✅ inline validation · ✅ disabled/enabled button · ✅ keyboard (Enter/submit, focus) · ✅ realistic auth states · ✅ patient/staff separation · ✅ spacing/alignment · ✅ responsive (panel collapses <880px) · ✅ accessibility (labels, focus-visible, aria). **Package 1 is ready to LOCK.**

---

## 5. What reviewers should look for

- **Doctors:** is the switch fast and unambiguous enough for a real two-clinic day? Is "which clinic am I in" always obvious at a glance?
- **Business:** does the first-run (provisioned account → set password → work) feel trustworthy?
- **Product Office:** does the selector correctly *never* appear for solo/single-membership staff?
- **Gemini UX audit:** isolation legibility, keyboard flow, contrast, and whether any screen violates the five UX principles.
