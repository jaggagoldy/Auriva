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

## PKG-2 — Owner · status: **🔒 FROZEN** (Product Office, 2026-07-19)
Invite-card wired → `/admin` (Team → Invite Member). Grow Transition deferred. "Needs your attention" View/Resolve/Dismiss = future refinement (not RC).

| Screen | Route | Header | Nav | Info Hier. | Sections | Copy | Interactions | Empty | Loading | Error | Success | Responsive | A11y | Approved |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Solo "Today" | `/clinic` (owner) | ✅ date + Today + sub | ✅ | ✅ | ✅ + solo banner + invite-card | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Command Center | `/admin/command-center` | ✅ Practice Health | ✅ | ✅ reordered | ✅ health · attention · quick · at-a-glance · floor · activity | ✅ | ✅ action links | ✅ | ✅ skeletons | ✅ | — | ✅ | ✅ | 🔒 |
| Team | `/admin` (People) | ✅ "Your people" + sub | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Grow Transition | — | — | — | — | — | — | — | — | — | — | — | — | — | ⏸ **deferred (PO)** |

### PKG-2 change log
- **A/B (implemented):** Solo hero → date + "Today" + calm sub + solo banner; Command Center reordered to PKG hierarchy (Practice Health → Needs attention → Quick actions → Practice at a glance → On the floor now → Recent activity); "Doctor status" → "On the floor now"; Team → "Your people" + sub.
- **C (approved, existing-data only per Rule #3):** "Needs your attention" V1 (unpaid invoices, pending labs, patients waiting — all from existing snapshot tiles, no new engine); Practice Health = structured metrics + "N items need your attention today" (no narrative).
- **C (deferred by PO):** Grow Transition screen (lifecycle/first-run — out of RC scope).
- **Held for your call:** Solo **invite-card** ("Growing? Add your first teammate.") — the banner is in; the card needs the solo invite entry route confirmed (Category B routing).
## PKG-3 — Doctor · status: **🔒 FROZEN** (Product Office, 2026-07-19)

| Screen | Route | Header | Nav | Info Hier. | Sections | Copy | Interactions | Empty | Loading | Error | Success | Responsive | A11y | Approved |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Today | `/doctor` | ✅ greeting + date + clinic | ✅ | ✅ | ✅ patients/waiting/completed + **behind** + next + call-in | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Workbench | `/doctor` consult | ✅ | ✅ 3-col | ✅ | ✅ queue-rail · consult · context-panel | ✅ | ✅ obvious primary actions | ✅ | ✅ | ✅ | ✅ toast | ✅ | ✅ | 🔒 |
| Patients | `/doctor/patients` | ✅ | ✅ | ✅ | ✅ 4-col table (Patient/Last visit/Visits/Last Dx) | ✅ honest placeholder | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Schedule | `/doctor/schedule` | ✅ | ✅ Calendar/Availability | ✅ | ✅ week view | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Practice | `/doctor/practice` | ✅ | ✅ Locations/Fees/Services/Online/Verification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Profile | `/doctor/profile` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | 🔒 |

### PKG-3 change log
- **A/B (implemented):** "N min behind" indicator on Today (existing scheduled_time data); honest placeholder wording on Patients ("Advanced patient filters will be available in a future release.").
- **Already aligned (verified):** patients-total metric; 3-column Workbench (queue-sidebar · consult-workbench · context-panel); Patients 4-column table (Visits + Last Dx present); Practice subnav; Schedule tabs.
- **C (deferred by PO):** Patients Favourites/High-Risk/Follow-up-Due facets; Schedule "Requests" tab.
- **Workbench experience validation (Rule #4):** consultation-first 3-column layout preserved — queue rail (context) · consult (primary) · context panel; primary actions obvious; minimal distraction. ✅
## PKG-4 — Reception · status: **🔒 FROZEN** (Product Office, 2026-07-19)

| Screen | Route | Header | Nav | Info Hier. | Sections | Copy | Interactions | Empty | Loading | Error | Success | Responsive | A11y | Approved |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Board ("Today's flow") | `/staff` | ✅ hero eyebrow+h1+sub | ✅ | ✅ hero→awareness→queue→actions | ✅ + **awareness strip** | ✅ calm wording | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Desk ("Collect & close") | `/staff/billing` | ✅ Cash desk framing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ skeletons | ✅ | — | ✅ | ✅ | 🔒 |
| Walk-in modal | `/staff` | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 |
| Checkout modal | `/staff/billing` | ✅ | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 |
| Calendar ("Clinic calendar") | `/staff/calendar` | ✅ Front desk framing | ✅ nav entry | ✅ | ✅ reused ClinicCalendar (read-only) | ✅ | ✅ book via existing flow | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |

### PKG-4 change log
- **A (implemented):** Board → "Today's flow" hero (eyebrow "Front desk · live" + h1 + sub); Desk → "Collect & close" (eyebrow "Cash desk").
- **B/C (approved, existing-data only):** operational **awareness strip** V1 — patients waiting · longest current wait · doctor(s) approximately N min behind (rounded). Calm, informational; **no** notify/capacity/thresholds (deferred, PO).
- **Verified aligned:** Walk-in + Checkout modals present; queue columns per status (hierarchy).
- **B (implemented, PO-approved):** reception Calendar — new `/staff/calendar` route reusing `ClinicCalendar` (all doctors, `readOnly` hides the doctor-only "Block time" editing) + a "Calendar" nav entry. No new scheduling engine; books via the existing flow.
## PKG-5 — Patient · status: **🔒 FROZEN** (Product Office, 2026-07-19)

| Screen | Route | Header | Nav | Info Hier. | Sections | Copy | Interactions | Empty | Loading | Error | Success | Responsive | A11y | Approved |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Home | `/patient` | ✅ Hello + hero | ✅ bottom nav | ✅ next visit → quick actions | ✅ | ✅ "Quick actions" | ✅ | ✅ | ✅ | ✅ | — | ✅ mobile-first | ✅ | 🔒 |
| Book | `/patient/book` | ✅ | ✅ | ✅ | ✅ search + care team | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Records | `/patient/records` | ✅ + reassurance | ✅ | ✅ | ✅ timeline | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| Family | `/patient/family` | ✅ | ✅ | ✅ | ✅ profiles + add | ✅ | ✅ switch profile | ✅ | ✅ | ✅ | — | ✅ | ✅ | 🔒 |
| You | `/patient/you` | ✅ | ✅ | ✅ | ✅ account rows | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | 🔒 |

### PKG-5 change log
- **Verified aligned:** bottom nav (Home/Book/Records/Family/You — exact PKG-5), mobile-first hero ("Your next visit"), quick-action tiles, Book search + care team, Records timeline, Family profiles + switch, You account rows.
- **A (implemented):** Home section label "Quick access" → **"Quick actions"** (PKG wording); Records warm reassurance line added.
- **No Category C.**
## PKG-6 — Resilience & UX States · status: **🔒 FROZEN** (Product Office, 2026-07-19)

Cross-cutting system (built in E1/E2; this pass closes the specific PKG-6 gaps).

| State (PKG-6 §) | Component / pattern | Status |
|---|---|---|
| Empty (§2) | `EmptyState` — warm, next-action; adopted across workspaces | ✅ |
| Loading (§3) | `Skeleton` for content (mirrors layout); button-scoped inline spinner; `LoadingState` spinner reserved for bootstrapping/indeterminate (PO ruling) | ✅ |
| Offline (§4) | `OfflineBanner` — **now mounted globally** in root layout, PKG copy ("You're offline. We'll sync automatically…"), non-blocking | ✅ |
| Error — 3 tiers (§5) | `ErrorState` **now `tier`**: recoverable (Retry) · action (amber, Try again) · critical (red, Contact support); icon + plain explanation + recovery | ✅ |
| Success (§4b) | `SuccessState` (full-page for booking/checkout); toasts for the rest | ✅ |
| Permission (§6) | `PermissionState` (calm, path-to-access); surface-level = capability-absent redirect (PKG: "never shown", correct) | ✅ |
| Notifications (§7) | in-app notification center | ✅ |
| Responsive / Dark / A11y (§8–10) | theme-aware tokens, responsive layouts, aria labels | ✅ |

### PKG-6 change log
- **A/B (implemented):** mounted `OfflineBanner` app-wide (was built, unmounted) + PKG §4 copy; `ErrorState` given the PKG §5 three-tier model (recoverable/action/critical).
- **Verified:** content regions load with skeletons (not spinners); buttons use inline spinners; empty ≠ error (warm); permission = capability-absent at surfaces.
- **No Category C.**
