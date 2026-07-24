# 04 — Information Architecture

← [03 Personas](./03-personas.md) · [Index](./00-README.md) · Next: [05 Complete Navigation](./05-complete-navigation.md)

This file gives the navigation structure, entry points, and permission model **per persona/surface**, plus an ASCII site map for each. For the flat, route-by-route list see [05-complete-navigation.md](./05-complete-navigation.md). For what each screen does, see [06-feature-catalog.md](./06-feature-catalog.md).

## The Global Product Glossary (three layers)

Before the per-surface maps: Auriva deliberately uses **three separate vocabularies** for the same underlying concepts. Mixing them causes real confusion, so they are kept explicitly apart (UXS-043 Phase 2, Deliverable B).

| Internal domain model (engineering) | Display language (per surface) | Notes |
|---|---|---|
| `Appointment` | Patient: **"visit"** · Reception: **"appointment"** · Doctor: **"consultation"** | Same DB row; three human words by design |
| `StaffProfile` (= membership) | **"team member"**, **"membership"** | One person may hold several (multi-clinic) |
| `Organization` | **"practice"** / **"health group"** | owner-facing |
| `Clinic` | **"clinic"** / **"location"** / **"branch"** | |
| Reception surface | **"Front desk"** (nav label) / "Reception Workspace" (spec name) | one surface |
| `super_admin` role | **"Owner"** | display label only |
| `Invoice` + `Payment` | **"bill"** (patient) · **"collect"** / **"Desk"** (reception) | |
| `PatientProfile` | **"records"** / **"health vault"** (patient) · **"patient"** (staff) | |

Engineering builds against the **domain model** (left column); the UI always shows the **display language** (middle column); component/prop names follow yet a third, engineering-only vocabulary (see [09-ui-components.md](./09-ui-components.md)). Never mix the three.

---

## Owner / Practice Manager — `/admin` (multi-member clinic) or `/clinic` (solo)

**Purpose:** run the practice — see how it's doing, manage the team, configure the clinic.

**Permission model:** requires `admin_portal` capability (Owner or Practice Manager); gated at the layout level. Legal-owner-only actions (plan, ownership transfer) additionally require `Organization.owner_user_id` match, checked via `requireLegalOwnerContext`.

```
/admin  (Owner · Practice Manager — admin_portal capability)
│
├── Command            → /admin/command-center     "How is my practice doing?"
│     Practice Health → Needs attention → Quick actions → At-a-glance → On the floor → Recent activity
├── Team                → /admin                     "Who's here, what can they do?"
│     Team roster (role/status chips) → Invite / Suspend / Reactivate / Archive
├── Clinics             → (soon — no route yet, shown disabled in nav)
├── Plan                → (soon — no route yet, shown disabled in nav)
└── Settings            → /admin/settings            Organization-level configuration
      also reachable, not in the primary 4-item nav:
      /admin/departments  → Departments (org structure)
      /admin/events       → Event Platform admin view (publish/retry/DLQ visibility)
      /admin/setup        → Setup checklist (guided onboarding)
      /admin/releases     → Release Management (platform-admin gated separately)
```

**Solo variant — `/clinic` (single-member clinic, full capability set):**
```
/clinic  (solo owner-doctor — isSoloClinic && reception+doctor_workspace+admin_portal)
│
├── Dashboard    "What needs me today?"
├── Today        "What do I do next?"
├── Calendar     "When am I free?"
├── Treatments   "What do I offer?"   (Service catalog)
├── Payments     "What have I collected?"
└── Settings ▾ — Practice · Team · Plan
```
The solo owner-doctor runs clinical, reception, and admin work from **one consolidated surface** — no separate `/doctor`/`/staff`/`/admin` tabs. The moment a second staff member joins, `resolveSurfacePath()` stops returning `/clinic` for the owner and routes them to the `/admin` cockpit instead — a **first-hire transition**, not a migration.

**Journeys:**
- *Solo owner's day:* `/clinic` Dashboard → Today (call in patients, since the owner is also the doctor) → Payments (collect) → Settings (adjust hours).
- *Growing owner's day:* first hire accepted → auto-lands on `/admin` Command Center → invites more staff from Team → reviews Command Center daily.
- *Practice Manager's day:* `/admin` Command Center (operational read) → Team (manage lifecycle) → Settings — never touches Plan/ownership (not shown, capability-absent).

---

## Doctor — `/doctor`

**Purpose:** get through a full day of consultations with minimal friction.

**Permission model:** requires `doctor_workspace` capability (Doctor or Nurse); C2 permissions further distinguish what each may do once inside (Nurse: vitals only; Doctor: full clinical write).

```
/doctor  (Doctor · Nurse — doctor_workspace capability)
│
├── Today       → /doctor            "Who's next, and what do they need?" (Mission Control)
├── Workbench   → /doctor/workbench  "Finish this visit" (Queue · Consult · Context, 3-column)
├── Schedule    → /doctor/schedule   Calendar + Availability (week view)
├── Patients    → /doctor/patients   4-column table: Patient / Last visit / Visits / Last Dx
├── Practice    → /doctor/practice   Locations · Fees · Services · Online · Verification
└── Profile     → /doctor/profile    Professional identity + live public preview
```

**Journey (the frictionless loop):** Today (see waiting list) → select/Call in next patient → Workbench (pre-filled chief complaint → template → diagnosis chips → prescription) → **Sign & complete** → auto-advances to the next waiting patient. See [07-workflow-library.md](./07-workflow-library.md) for the full step-by-step.

---

## Reception — `/staff`

**Purpose:** keep the waiting room moving and close the day's cash cycle.

**Permission model:** requires `reception` (Receptionist) or `diagnostics` (Technician) capability — the latter is deliberately narrower (no billing/booking/consultation).

```
/staff  (Receptionist — reception · Technician — diagnostics, narrower)
│
├── Front desk  → /staff/queue     "What's the room doing?" — 3-lane board (Waiting · In consultation · Done·to collect)
├── Calendar    → /staff/calendar  Read-only ClinicCalendar, all doctors, book via existing flow
├── Desk        → /staff/billing   "Collect & close" — cash cycle, checkout modal
├── Lab Orders  → /staff/lab       Diagnostics/results worklist (Technician's home when narrower capability)
│
also reachable (not primary nav):
├── /staff (root)     → redirects to /staff/queue (front-desk board is the landing)
├── /staff/dashboard  → legacy Reception Dashboard (kept reachable, no longer the landing)
├── /staff/walkin     → Walk-in registration flow (also reachable as a modal from the board)
└── /staff/patients/[id] → a single patient's record from reception's point of view
```

**Journey (the cash cycle):** Register walk-in *or* scheduled patient arrives → Check in → **Waiting** lane → Send in → **In consultation** lane → doctor completes → **Done · to collect** lane → Checkout modal (itemised invoice, UPI/Cash/Card) → Collect → receipt.

---

## Patient — `/patient`

**Purpose:** understand today, book care, review what happened, manage family, manage self. Mobile-first, phone-framed on desktop.

**Permission model:** `patient_workspace` role; scoped to the session's `active_healthcare_profile_id`, never a client-supplied id.

```
/patient  (Patient — patient_workspace)
│
├── Home     → /patient            "What do I need to do today?"
├── Book     → /patient/book       "Can I book my doctor?"
├── Records  → /patient/records    "What happened during my visit?" (timeline, grouped by visit)
├── Family   → /patient/family     "Who in my family needs attention?" (switch profile)
└── You      → /patient/you        "Who am I?" (identity, payments, notifications, settings)
      reachable from You:
      /patient/profile   → profile detail + edit (health summary)
      /patient/settings  → notifications / language / security sub-screen
      /patient/doctors/[id] → a doctor's public profile (reached from Book's search)

Legacy/superseded routes (kept as redirects, not real screens):
  /patient/care      → redirects to /patient (folded into Home + Records)
  /patient/find-care → redirects to /patient/book (superseded by the Book tab)
```

**Journey:** Home (see next visit or "you're free today") → Book (search doctor → profile+slots → confirm → "You're booked ✓") → (visit happens, staff-side) → Records (visit appears in the timeline with Dx/Rx/invoice) → Family (switch to a dependent's profile if needed) → You (manage identity/settings).

---

## Cross-surface: Identity & Foundation (PKG-1)

Not a persona-specific surface — the shared entry point every staff persona passes through.

```
/login  →  (1 membership) auto-opens the surface
        →  (2+ memberships) /workspace  Workspace Selector  →  chosen surface
        →  (must_change_password = true) /change-password  →  blocks all workspaces until resolved

Inside any staff shell:  WorkspaceSwitcher chip `[mark] Clinic · Role ▾` (top bar)
  → click ▾ → selector overlay → switch → content re-scopes, isolation felt (no other workspace's data visible)
```

Patients use a **separate** login path entirely (phone + OTP, no workspace concept — a patient's "workspace" is just their set of linked `PatientProfile`s, switched via Family, not via `WorkspaceSwitcher`).

## Cross-surface: Marketing / Public (unauthenticated)

```
/  (homepage)
├── /platform        Product overview
├── /solutions       Industries/solutions overview
├── /pricing         Plans (Solo/Professional/Enterprise messaging)
├── /about, /customers, /contact-sales, /security, /compliance, /trust
├── /industries
├── /book-demo, /get-started
├── /find-care → /book/[doctorId]   Public doctor directory + public booking (no login required)
├── /register-org                   Start a new practice (Owner org creation)
├── /start                          "Start your practice" entry
└── /login                          Staff sign-in (with a footer path to patient OTP sign-in / patient sign-up)
```

See [05-complete-navigation.md](./05-complete-navigation.md) for the exhaustive route table including every marketing page and API route grouping.

## Permission model summary (cross-reference)

| Surface | Capability required | Roles that can reach it |
|---|---|---|
| `/admin` | `admin_portal` | Owner, Practice Manager |
| `/clinic` | `reception` + `doctor_workspace` + `admin_portal`, AND solo clinic | Solo owner-doctor only |
| `/doctor` | `doctor_workspace` | Doctor, Nurse |
| `/staff` | `reception` or `diagnostics` | Receptionist, Technician |
| `/patient` | (role) `patient_workspace` | Patient |
| `/admin/releases` | `is_platform_admin` flag (separate from role) | Auriva internal staff only |

Full capability/permission tables are in [08-business-rules.md](./08-business-rules.md).
