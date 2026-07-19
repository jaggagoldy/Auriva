# 06 — Feature Catalog

← [05 Complete Navigation](./05-complete-navigation.md) · [Index](./00-README.md) · Next: [07 Workflow Library](./07-workflow-library.md)

Every key page, in the format: Purpose · Features · Actions · Tables/Cards/Dialogs/Drawers · Search/Filters · Empty/Loading/Error/Success/Permission states · Dependencies · ASCII wireframe · Main regions · Key actions · screenshot placeholder. States not called out explicitly follow the platform-wide [Experience Behaviour Matrix](./09-ui-components.md) by default.

---

## PKG-1 — Identity & Foundation

### Login — `/login`

- **Purpose:** single credentialed entry to the professional world; separates staff sign-in from patient OTP sign-in.
- **Features:** intelligent email/phone field (auto-detects format: RFC-ish email check vs India 10-digit phone `[6-9]\d{9}`, optional `+91`); password field with show/hide; "Remember me" (OFF by default, reworded for shared-computer safety); inline "Forgot password?".
- **Actions:** Continue/Sign in (disabled until valid, Enter submits only when valid) → on success routes to `/workspace` (2+ memberships) or straight into the resolved surface (1 membership).
- **Dialogs:** none (Forgot/Reset are separate focused-card screens, not modals).
- **Empty/Loading/Error:** loading = spinner in the button; error = inline callout in the form (not a toast) for wrong credentials, shake animation.
- **Success:** redirect (no success screen needed — landing on the resolved surface *is* the success state).
- **Permissions:** public route.
- **Dependencies:** `POST /api/auth/login`, `resolveSurfacePath()`, `WorkspaceSwitcher`/`/workspace` for 2+ memberships.
- **Wireframe:**
```
┌───────────────────────────┬───────────────────────────┐
│  WELCOME                  │   (brand/trust panel)      │
│  Sign in to work          │   flat #0B4A41, honey glow │
│  [ you@clinic.in / phone ]│   ECG/pulse glyph mark      │
│  [ password           👁 ]│   "Your clinic and your     │
│              Forgot pw?   │    care, in one calm place."│
│  [      Continue        ] │   Free · 2 min · UPI · Yours│
│  ── Patient? OTP sign-in ─│                             │
│  Team members are added   │                             │
│  by their practice.       │                             │
└───────────────────────────┴───────────────────────────┘
```
- **Main regions:** left form column, right brand/trust panel (collapses <880px).
- **Key actions:** Continue/Sign in; Forgot password; Sign in with OTP (patient); Create a patient account; Start your practice.
> 📸 Screenshot placeholder — route: `/login`

### Mandatory Password Change — `/change-password`

- **Purpose:** a provisioned (managed) staff account must set its own password before any workspace is usable.
- **Features:** names the actual clinic ("Your practice, *Sunrise Clinic*, created this account"); new + confirm password fields with inline match validation.
- **Actions:** Set password & continue → clears `must_change_password`, proceeds to `/workspace` or the resolved surface.
- **Empty/Loading/Error:** button-busy state on submit; inline error on mismatch/weak password.
- **Permissions:** requires an authenticated session with `must_change_password = true`; blocks everything else until resolved (enforced server-side in `requireStaffContext`, not just the UI).
- **Dependencies:** `POST /api/auth/password/change`.
- **Wireframe:**
```
┌────────────────────────────────────┐
│ (i) Your practice created this      │
│     account. Set your own password. │
│ [ new password                    ] │
│ [ confirm password                ] │
│ [ Set password & continue         ] │
└────────────────────────────────────┘
```
- **Main regions:** single centered focused card.
- **Key actions:** Set password & continue.
> 📸 Screenshot placeholder — route: `/change-password`

### Workspace Selector — `/workspace`

- **Purpose:** choose the active membership when an account holds 2+.
- **Features:** one card per membership (clinic name + role + "Last used" badge on the pre-selected one); keyboard-navigable.
- **Actions:** Open → (click or Enter) sets `active_membership_id`, redirects into that workspace's resolved surface.
- **Empty:** never empty for a staff account that reaches this screen (it only renders for 2+ memberships).
- **Permissions:** authenticated staff session only; single-membership accounts never see this screen (auto-routed instead).
- **Dependencies:** `GET /api/workspaces`, `resolveActiveMembership`.
- **Wireframe:**
```
 Choose your workspace
 ┌──────────────────────┐  ┌──────────────────────┐
 │ ● Sunrise Clinic     │  │ ○ Metro Hospital      │
 │   Doctor   [Last used]│  │   Doctor              │
 │            Open →     │  │            Open →      │
 └──────────────────────┘  └──────────────────────┘
```
- **Main regions:** grid of workspace cards.
- **Key actions:** Open (per card).
> 📸 Screenshot placeholder — route: `/workspace`

### Staff Shell + WorkspaceSwitcher (all staff surfaces)

- **Purpose:** persistent chrome so "which clinic am I in" is always obvious.
- **Features:** `WorkspaceSwitcher` chip `[mark] Clinic · Role ▾` in the top bar (static label if single membership); left nav rail; avatar menu (Profile, Log out).
- **Actions:** click ▾ → selector overlay → switch → content region re-renders decisively, chip updates.
- **Dependencies:** `POST /api/workspace/switch`.
> 📸 Screenshot placeholder — route: any `/doctor`, `/staff`, `/admin` page (shared shell)

---

## PKG-2 — Owner (`/admin`, `/clinic`)

### Solo "Today" — `/clinic` (Dashboard/Today views)

- **Purpose:** the solo owner-doctor's entire day in one consolidated, calm place.
- **Features:** date + "Today" header + calm subtitle; solo banner explaining the consolidated surface; guided-checklist "ready steps" (share booking page, etc.); an invite-card ("Growing? Add your first teammate.").
- **Actions:** Call in / manage today's queue (doctor-side), Register patient, Collect payment, adjust hours.
- **Empty:** "No appointments today" style reassurance + a next action.
- **Dependencies:** `/api/clinic/today`, `/api/clinic/dashboard`, `/api/clinic/overview`.
- **Wireframe:**
```
┌ Sunrise Clinic · Today ───────────────────────────────┐
│ Dashboard | Today | Calendar | Treatments | Payments   │
│ Good morning — here's your day.        [solo banner]   │
│ [ready checklist: share page · set hours · add photo]  │
│ Growing? Add your first teammate. [Invite]              │
└──────────────────────────────────────────────────────────┘
```
- **Main regions:** top nav row, hero/greeting, guided checklist, invite card.
- **Key actions:** navigate tabs; Invite; complete checklist items.
> 📸 Screenshot placeholder — route: `/clinic`

### Command Center — `/admin/command-center`

- **Purpose:** the owner's one-glance "how are we doing?"
- **Features (information hierarchy, top to bottom):** Practice Health (calm plain-language summary, e.g. "steady today… three things need a quick look") → **Needs attention** (elevated, honey-bordered card, per-item action buttons: Issue now / Review / Resend) → Quick actions (Invite team member · Add doctor · Register patient · Open reception · Settings) → Practice at a glance (stat tiles: appointments today, in queue, doctors on floor, collected today) → On the floor now (per-doctor occupancy bar + availability chip + last-active) → Recent activity feed.
- **Tables/Cards:** stat-tile cards; "On the floor now" doctor cards with occupancy bars (turn honey ≥75% load); activity feed rows (actor + relative time).
- **Empty:** `EmptyState` per section (e.g. "No team yet — invite your first member").
- **Loading:** skeletons matching tile/card shapes.
- **Dependencies:** `/api/organizations/[id]/command-center`.
- **Wireframe:**
```
┌ Command Center ─────────────────────────────────────────┐
│ Good afternoon, Dr. Rao — practice is steady today.      │
│ ┌ Needs attention (honey border) ───────────────────┐    │
│ │ 3 invoices to issue [Issue now]  2 labs pending    │    │
│ └────────────────────────────────────────────────────┘   │
│ [Invite] [Add doctor] [Register patient] [Reception] [⚙]  │
│ ┌Appts 42┐┌Queue 5┐┌Floor 4/6┐┌Collected ₹38,400┐        │
│ On the floor now: Dr Rao ▓▓▓░ 9/11 · Dr Shah in consult   │
│ Recent activity: payment collected · consult completed…  │
└────────────────────────────────────────────────────────────┘
```
- **Main regions:** health summary, needs-attention, quick actions row, at-a-glance tiles, on-the-floor list, activity feed.
- **Key actions:** Issue now / Review / Resend (per attention item); the five quick actions.
> 📸 Screenshot placeholder — route: `/admin/command-center`

### Team ("Your people") — `/admin`

- **Purpose:** manage who's here and what they can do.
- **Features:** roster table (avatar initials, name, role chip, status chip: Active/Invited/Suspended/Archived, specialty·clinic, today's workload with occupancy bar, availability chip, last-active).
- **Table columns:** Member · Role · Status · Workload · Availability · Last active · row actions (⋯).
- **Row actions (⋯ menu):** Resend (Invited) · Suspend/Reactivate · Archive.
- **Dialogs:** Invite (email/phone + clinic + role, 6 options) · Suspend (confirm, explains "loses access; keeps history; frees 1 seat") · Archive (confirm + mandatory reassignment of open items to another team member; explains "history stays").
- **Empty:** "No team yet — invite your first member."
- **Dependencies:** `/api/organizations/[id]/staff`, `/api/organizations/[id]/invitations`.
- **Wireframe:**
```
┌ Team ─────────────────────────────────── [Invite staff] ┐
│ (AR) Dr Anjali Rao   Owner       Active                  │
│ (VS) Dr Vikram Shah  Doctor      Active         ⋯        │
│ (MN) Meera Nair      Reception   Active         ⋯        │
│ (SK) Suresh Kumar    Nurse       Invited        Resend   │
│ (RT) Ravi Tandon     Technician  Suspended  Reactivate   │
└────────────────────────────────────────────────────────────┘
```
- **Main regions:** header + Invite CTA, roster table.
- **Key actions:** Invite staff; row ⋯ menu (Suspend/Archive/Resend/Reactivate).
> 📸 Screenshot placeholder — route: `/admin`

### Settings, Departments, Setup, Events, Releases — `/admin/settings`, `/admin/departments`, `/admin/setup`, `/admin/events`, `/admin/releases`

- **Purpose (Settings):** organization-level configuration (name, contact, timezone, clinic operational settings).
- **Purpose (Departments):** org structure — group staff org-wide or per-branch.
- **Purpose (Setup):** guided onboarding checklist.
- **Purpose (Events):** visibility into the Event Platform (publish/retry/DLQ) for this organization — operational transparency, not a notifications inbox (see [13-events.md](./13-events.md)).
- **Purpose (Releases):** Auriva's own product release notes authoring — gated by `is_platform_admin`, entirely separate from customer-facing `admin_portal`.
> 📸 Screenshot placeholder — routes: `/admin/settings`, `/admin/departments`, `/admin/setup`, `/admin/events`, `/admin/releases`

---

## PKG-3 — Doctor (`/doctor`) — flagship, frozen 9.7/10

### Today (Mission Control) — `/doctor`

- **Purpose:** everything in three seconds; call in the next patient.
- **Features:** greeting + date + clinic name; metrics row (patients today · waiting · completed); "N min behind" running-late indicator; NEXT patient chip with one-tap **Call in**; quick actions (Start consultation · Open schedule · Pause booking); Waiting list grouped, with a **Skipped** sub-lane showing a recall (↺) affordance.
- **Empty:** "No appointments today. Start by opening your calendar."
- **Dependencies:** `GET /api/appointments` (doctor-scoped), `PATCH /api/appointments/[id]` (status transitions).
- **Wireframe:**
```
┌ Doctor Workspace ─ Today ──────────────────────── (search)(bell) ┐
│ Good morning, Dr. Iyer · Thu Jul 16 · Sunrise · 9–20 [12 min behind]│
│ 26 patients · 4 waiting · 9 completed        NEXT: Amit [Call in]  │
│ Quick: [Start consultation][Open schedule][Pause booking]         │
│ ┌ Waiting · 4 ────────────┐                                       │
│ │ #12 Sneha · #13 Priya…  │                                       │
│ │ Skipped · 1  #9 Deepa ↺ │                                       │
│ └─────────────────────────┘                                       │
└───────────────────────────────────────────────────────────────────┘
```
- **Main regions:** daybar (greeting/date/clinic/behind-indicator), metrics, next-patient/quick-actions, waiting list.
- **Key actions:** Call in; Start consultation; Open schedule; Pause booking; select a patient row.
> 📸 Screenshot placeholder — route: `/doctor`

### Consult Workbench — `/doctor/workbench`

- **Purpose:** complete a consultation with the fewest clicks and greatest clinical confidence — "conducting a consultation, not filling a form."
- **Features:** 3-column layout (Queue rail · Consult center · Context rail); persistent **progress stepper** (Patient ready → Consultation → Prescription → Complete); **persistent clinical safety strip** (allergy/pregnancy/chronic-conditions/critical-vitals — rose for critical, honey for conditions, calm "No critical alerts" when clear); **Suggested protocol card** — wait, this is **deferred**, see note below; time awareness (Started · live elapsed · Waited Nm); **Up-next preview** card in the context rail; one-click templates for notes; diagnosis quick-add chips; prescription rows + template.
- **IMPORTANT — deferred sub-feature:** the "Suggested protocol" one-tap AI fill (notes+Dx+Rx from chief complaint) shown in the PKG-3 prototype is **Category-C deferred** (clinical decision-support + regulatory risk) — **not built**. The clinical-safety strip that *is* built is a factual, read-only summary of existing structured data (allergies/chronic conditions/recorded abnormal vitals) only, never a suggestion engine.
- **Actions:** Insert template; Apply diagnosis chip; Save draft; Print prescription; **Sign & complete** (sticky, in-pane, never a dialog — auto-advances to the next waiting patient and loads their context).
- **Empty:** "No more patients" state when the queue clears.
- **Dependencies:** `PATCH /api/appointments/[id]` (writes chief_complaint/notes/diagnosis/prescription/vitals + transitions to `completed`), `/api/clinic/templates`.
- **Wireframe:**
```
┌ QUEUE (left) ─┐┌ CONSULT (center) ───────────────┐┌ CONTEXT (right) ─┐
│ ● In consult  ││ Amit Patel · 41M · B+ · #1 · 6m  ││ ⚠ Allergy: Penicillin│
│   Amit Patel  ││ Chief complaint (pre-filled)     ││ Chronic: HTN, T2DM   │
│ ● Waiting · 3 ││ Clinical notes  [Insert template]││ Last visit timeline  │
│   Sneha       ││ Diagnosis  [chips + quick-add]   ││ Up next — prepare:   │
│   Priya       ││ Prescription [rows + template]   ││  Sneha · fever·2days │
│ ● Skipped ·1  │├──────────────────────────────────┤│                     │
│   Deepa [↺]   ││ Draft saved · [Save][Print][Sign & complete]│           │
└───────────────┘└──────────────────────────────────┘└─────────────────────┘
```
- **Main regions:** queue rail, consult pane (stepper + safety strip + form + sticky footer), context panel.
- **Key actions:** Call in (from queue rail); Insert template; Apply Dx chip; Save draft; Print prescription; Sign & complete.
> 📸 Screenshot placeholder — route: `/doctor/workbench`

### Patients — `/doctor/patients`

- **Purpose:** doctors remember cases, not names.
- **Table columns:** Patient / Last visit / Visits / Last Dx (4-column).
- **Deferred:** Favourites / High-Risk / Follow-up-Due **faceted tabs** shown in the PKG prototype are Category-C deferred (new persistence/classification) — an honest placeholder reads "Advanced patient filters will be available in a future release."
> 📸 Screenshot placeholder — route: `/doctor/patients`

### Schedule — `/doctor/schedule`

- **Purpose:** calendar + availability in one.
- **Features:** week-view grid, clinic-coloured blocks; a **"Requests"** tab shown in the prototype is Category-C deferred (new workflow).
> 📸 Screenshot placeholder — route: `/doctor/schedule`

### Practice — `/doctor/practice`

- **Purpose:** where I work, what I charge.
- **Sub-nav:** Locations · Fees · Services · Online · Verification.
> 📸 Screenshot placeholder — route: `/doctor/practice`

### Profile — `/doctor/profile`

- **Purpose:** professional identity + a live public preview (what patients see on Find Care).
> 📸 Screenshot placeholder — route: `/doctor/profile`

---

## PKG-4 — Reception (`/staff`) — frozen 9.8/10

### Front desk board ("Today's flow") — `/staff/queue`

- **Purpose:** the front desk's home — keep the room moving; answers "what's the room doing?"
- **Features:** hero (eyebrow "Front desk · live" + h1 + sub); **operational awareness strip** (patients waiting · longest current wait · doctor(s) approximately N min behind, rounded — calm, informational, no notify/capacity actions); doctor strip (per-doctor status: in consult/late/free + wait count); **3-lane board**: Waiting · In consultation · Done · to collect.
- **Queue aging (visual only, no alerts):** waiting cards age **≥20m honey/yellow, ≥30m orange, ≥45m red** — so reception naturally prioritises without a system nag.
- **Cards:** each lane card shows patient initials/name, wait time, and the one action for that stage (Send in / Mark done / **Collect ₹amount**).
- **Actions:** Register walk-in (primary CTA); Send in; Mark done; Collect.
- **Empty:** "Waiting room is clear. You're all caught up." + Register walk-in CTA.
- **Dependencies:** `/api/reception/queue`, `/api/reception/checkin`, `/api/reception/status`, `/api/reception/walkin`.
- **Wireframe:**
```
┌ Sunrise Clinic · Front desk · live ───────── [Register walk-in] ┐
│ 4 waiting · longest wait 35m · Dr Reddy ~15m behind              │
│ [Dr Iyer · in consult · 3 wait] [Dr Reddy · late · 2] [Dr Rao·free]│
│ ┌ Waiting 4 ────┐ ┌ In consultation 2 ┐ ┌ Done · to collect 1 ┐  │
│ │ Sneha 35m 🟠  │ │ Amit               │ │ Kiran  [Collect ₹600]│  │
│ │ [Send in]     │ │ [Mark done]        │ │                     │  │
│ └───────────────┘ └───────────────────┘ └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```
- **Main regions:** hero, awareness strip, doctor strip, 3-lane board.
- **Key actions:** Register walk-in; Send in; Mark done; Collect.
> 📸 Screenshot placeholder — route: `/staff/queue`

### Calendar — `/staff/calendar`

- **Purpose:** book a slot into a doctor's day, from reception.
- **Features:** reuses `ClinicCalendar` (all doctors) in `readOnly` mode (hides doctor-only "Block time" editing); books via the existing booking flow, not a new engine.
> 📸 Screenshot placeholder — route: `/staff/calendar`

### Desk ("Collect & close") — `/staff/billing`

- **Purpose:** visits ready to bill — money surfaced, never buried.
- **Features:** "Cash desk" framing; list of completed, unbilled visits with **amount on every Collect button**; Checkout modal.
- **Dialogs — Checkout modal:** itemised invoice → total → payment method chips (UPI/Cash/Card) → Collect ₹amount → receipt.
- **Empty:** "Nothing to collect today."
- **Dependencies:** `/api/billing/invoices`, `/api/clinic/payment(s)`.
- **Wireframe:**
```
┌ Collect · Amit Patel ─────────────┐
│ Consultation           ₹600        │
│ Total                  ₹600        │
│ [ UPI ] [ Cash ] [ Card ]          │
│ [        Collect ₹600           ]  │
└─────────────────────────────────────┘
```
- **Main regions:** to-collect list, checkout modal.
- **Key actions:** Collect ₹amount; choose payment method.
> 📸 Screenshot placeholder — route: `/staff/billing`

### Walk-in modal — `/staff` (from board)

- **Purpose:** register an arrival in seconds (under 20 seconds by design).
- **Fields:** Name · Phone · Age/Sex · Reason · Doctor.
- **Action:** Add to queue.
> 📸 Screenshot placeholder — route: `/staff/walkin` (modal)

### Lab Orders — `/staff/lab`

- **Purpose:** diagnostics/results worklist (Technician's primary home when granted the narrower `diagnostics` capability).
> 📸 Screenshot placeholder — route: `/staff/lab`

---

## PKG-5 — Patient (`/patient`) — frozen 9.7/10

### Home (Today) — `/patient`

- **Purpose:** "What do I need to do today?"
- **Features:** warm greeting ("Good morning, Amit"); Next Visit hero card (dark, calm — clinic name, doctor, time, "bring reports"/"payment done" reminders, Directions/Reschedule); compact **Today Summary** (appointment · medicine · payment); "For you today" list (medicine reminders, lab report ready); Quick actions (Book → Records → Family → Payments, in that order).
- **Reassurance-first copy:** "You're free today" (not "No appointment"); "You're all caught up" (not "18 records"); "Nothing to pay right now" (not "₹0 due").
- **Empty:** "You're free today. Enjoy your day." + Book CTA.
- **Dependencies:** `/api/patients/[id]/timeline`, `/api/appointments` (patient-scoped).
> 📸 Screenshot placeholder — route: `/patient`

### Book — `/patient/book`

- **Purpose:** "Can I book my doctor?"
- **Features:** doctor search + "care team" (favourited/previously-seen doctors first); doctor profile with slots; confirm → **"You're booked ✓"** full-screen success moment.
- **Empty:** "Nothing booked yet."
- **Dependencies:** `/api/doctors`, `/api/doctors/[id]/slots`, `/api/public/bookings` or `/api/clinic/book`.
> 📸 Screenshot placeholder — route: `/patient/book`

### Records — `/patient/records`

- **Purpose:** "What happened during my visit?" — a **visit timeline**, not an EMR list.
- **Features:** grouped by visit; each entry shows a one-line outcome/diagnosis; opening a visit shows Dx/Rx/reports/invoice.
- **Empty:** "Your first visit will appear here."
> 📸 Screenshot placeholder — route: `/patient/records`

### Family — `/patient/family`

- **Purpose:** "Who in my family needs attention?"
- **Features:** one-tap profile switch (greeting changes to the switched-to person); per-member **next-care status** (e.g. "Vaccination due next month"); Add family member.
- **Dependencies:** `AccountProfileLink`, `/api/patients/family-members`, `POST /api/auth/switch-profile`.
> 📸 Screenshot placeholder — route: `/patient/family`

### You — `/patient/you`

- **Purpose:** "Who am I?"
- **Features:** identity card (name, health_id, phone); account rows: Personal · Insurance (informational only — no claims processing) · Payments · Notifications · Settings · Sign out.
- **Noted but not applied (awaiting Product Office call):** surfacing an Emergency Contact field on this screen.
> 📸 Screenshot placeholder — route: `/patient/you`

---

## PKG-6 — Resilience (cross-cutting, not a page)

See [09-ui-components.md](./09-ui-components.md) for the full component reference (`EmptyState`, `ErrorState`, `PermissionState`, `SuccessState`, `LoadingState`/`Skeleton`, `OfflineBanner`) and the Experience Behaviour Matrix these implement.

---

## Feature Matrix

| Feature | Module | Persona | Implemented | Hidden | Future | Notes |
|---|---|---|---|---|---|---|
| Two-panel login w/ smart phone/email detection | Identity | All staff | ✅ | | | Frozen PKG-1 |
| Workspace Selector | Identity | Multi-membership staff | ✅ | | | Auto-skipped for single membership |
| Mandatory password change | Identity | Provisioned staff | ✅ | | | Server-enforced, not just UI |
| Self-service password reset | Identity | All staff | | | ✅ | Deferred (SEC-4); assisted reset via Team Mgmt retained |
| Solo consolidated surface | Owner | Solo owner-doctor | ✅ | | | `/clinic` |
| First-hire auto-transition | Owner | Solo owner | ✅ | | | No migration, `resolveSurfacePath` flips automatically |
| Grow Transition celebration screen | Owner | Solo owner | | | ✅ | Deferred — lifecycle/first-run logic |
| Command Center | Owner | Owner, Practice Manager | ✅ | | | Needs-attention + quick actions + at-a-glance + floor + activity |
| "Needs attention" View/Resolve/Dismiss actions | Owner | Owner, Practice Manager | | | ✅ | Deferred; today read-only per-item action buttons only |
| Team roster + lifecycle (invite/suspend/archive) | Owner | Owner, Practice Manager | ✅ | | | Active → Suspended → Archived |
| Clinics tab | Owner | Owner | | ✅ "Soon" | ✅ | Honest disabled nav item |
| Plan tab (multi-clinic) | Owner | Owner | | ✅ "Soon" | ✅ | Honest disabled nav item |
| Doctor Today (Mission Control) | Doctor | Doctor, Nurse | ✅ | | | |
| Consult Workbench 3-column | Doctor | Doctor | ✅ | | | Frozen, 9.7/10 |
| Clinical safety strip (factual) | Doctor | Doctor | ✅ | | | Allergy/pregnancy/chronic/critical-vitals, read-only |
| "Suggested protocol" AI one-tap fill | Doctor | Doctor | | | ✅ | Deferred — clinical decision-support + regulatory risk |
| Patient Favourites/High-Risk/Follow-up-Due facets | Doctor | Doctor | | | ✅ | Deferred — new persistence/classification |
| Schedule "Requests" tab | Doctor | Doctor | | | ✅ | Deferred |
| Front desk 3-lane board + queue aging | Reception | Receptionist | ✅ | | | Visual-only aging thresholds |
| Reception Calendar | Reception | Receptionist | ✅ | | | Read-only `ClinicCalendar` reuse |
| Walk-in registration | Reception | Receptionist | ✅ | | | |
| Checkout/collect (UPI/Cash/Card) | Reception | Receptionist | ✅ | | | Closes the pre-RC cash-cycle gap |
| Notify workflow / capacity thresholds | Reception | Receptionist | | | ✅ | Deferred — new operational feature |
| Lab Orders / diagnostics worklist | Reception | Technician | ✅ | | | Backend model supports fuller UI; results-entry UI itself minimal |
| Patient Home/Book/Records/Family/You | Patient | Patient | ✅ | | | Frozen 9.7/10 |
| "After the Visit" post-checkout moment | Patient | Patient | | | ✅ | Deferred future backlog item |
| Emergency Contact surfaced in You | Patient | Patient | | | ✅ | Noted, not applied — awaiting PO call |
| Resilience states (Empty/Loading/Error/Permission/Success/Offline) | Platform | All | ✅ | | | Adopted across all 5 workspaces |
| Multi-instance rate limiting | Platform | — | | | ✅ | Currently in-memory/single-instance |
| Insurance | Financial | Patient/Owner | | | ✅ | Deferred — see [18](./18-deferred-features.md) |
| Medication-adherence tracking | Clinical | Patient | | | ✅ | Deferred |
| Capacity/room alerts | Practice Ops | Reception | | | ✅ | Deferred |
| Online payments (patient-initiated) | Financial | Patient | | | ✅ | Deferred |
| Teleconsultation | Patient Engagement | Patient/Doctor | | | ✅ | Future idea, not committed — see [20](./20-future-ideas.md) |

For the full deferred-item rationale table, see [18-deferred-features.md](./18-deferred-features.md).
