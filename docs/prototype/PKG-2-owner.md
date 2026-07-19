# Prototype Package 2 — Owner Experience

**Series:** UXS-043 Interactive Prototype · Package 2 of 6
**Covers:** Solo Clinic (consolidated) · First-hire surface transition · Command Center · Team roster · Invite staff · Suspend · Archive
**Status:** Draft for Review (Internal → Product Office → Doctor → Business → Gemini UX Audit → Freeze)
**Foundation:** the approved admin design language ([design/mockups/auriva-admin.html](../../design/mockups/auriva-admin.html)) + Package 1 baseline. Same tokens, nav pattern, chips, modal, toast.

Prototype file: [pkg-2-owner.html](./pkg-2-owner.html) (pure HTML/CSS + vanilla JS).

> **Design reuse (lesson from Package 1):** grounded in the existing admin mockup and components
> (`command-center.tsx`, `team-roster.tsx`, `invite-dialog.tsx`, `workspace.tsx`). Cockpit tiles use the
> real `command-center-service` shape (appointments today · in queue now · doctors on floor · collected
> today · outstanding). **Roles use the frozen APS-044 six** (Owner · Practice Manager · Doctor ·
> Receptionist · Nurse · Technician) — the mockup's legacy "Accountant" is intentionally dropped.

---

## 1. Storyboard

**User goals**
- *Solo owner-doctor:* run my whole day from one place; don't make me feel like I'm using "admin software."
- *Growing owner:* when I hire my first person, the product should grow with me — not force a migration or a manual mode switch.
- *Multi-person owner / practice manager:* see how the practice is doing at a glance, and manage who's on the team and what they can do.

**Navigation & screen flow**

```
Solo Clinic (consolidated /clinic)
        │  invite first staff member
        ▼
"Your practice grew" transition  ──►  Owner/Manager Cockpit
                                          │
        ┌────────────────┬────────────────┼───────────────┐
   Command Center       Team            Clinics           Plan
   (how are we doing)   (who's here)    (locations)       (seats)
                         │
              ┌──────────┼───────────┐
          Invite       Suspend      Archive
          (6 roles)    (frees seat) (reassign + lock history)
```

**Decisions encoded**
- Solo = the **consolidated** surface (APS-045 X3); the cockpit only appears once there's a team.
- First hire **auto-transitions** the owner to the cockpit — no migration, celebrated with a one-time welcome (APS-045 §6).
- Team lifecycle is **Active → Suspended → Archived** (APS-044 §14); suspend **frees a seat**, archive **preserves history** and requires **reassignment** of the member's open work (membership-service reconciliation).
- Roles are the **frozen six**; Practice Manager = admin minus clinical write + minus plan/billing mutation.

---

## 2. Low-Fidelity Wireframes

**Command Center**
```
┌ Sunrise Health Group · Owner ▾ ───────────────── [Invite staff] (AR) ┐
│ COMMAND CENTER                                                        │
│ ┌ Appts today ┐ ┌ In queue ┐ ┌ Doctors on floor ┐ ┌ Collected today ┐│
│ │     42      │ │    5     │ │      4 / 6        │ │    ₹38,400       ││
│ └─────────────┘ └──────────┘ └──────────────────┘ └──────────────────┘│
│ ┌ Needs attention ────────────┐ ┌ On the floor now ───────────────┐   │
│ │ • 3 invoices to issue        │ │ Dr Rao · Dental · 2 waiting     │   │
│ │ • 2 lab results pending      │ │ Dr Shah · Physio · in consult   │   │
│ └──────────────────────────────┘ └─────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Team roster + row actions**
```
┌ Team ─────────────────────────────────── [Invite staff] ┐
│ (AR) Dr Anjali Rao   Owner       Active                  │
│ (VS) Dr Vikram Shah  Doctor      Active         ⋯        │
│ (MN) Meera Nair      Reception   Active         ⋯ ─► Suspend / Archive
│ (SK) Suresh Kumar    Nurse       Invited        Resend  │
│ (RT) Ravi Tandon     Technician  Suspended  Reactivate  │
└──────────────────────────────────────────────────────────┘
```

**Modals**
```
Invite                       Suspend                     Archive
┌──────────────┐   ┌──────────────────────┐   ┌────────────────────────────┐
│ Email/phone  │   │ Suspend Meera Nair?   │   │ Archive Meera Nair?         │
│ Clinic       │   │ Loses access; keeps   │   │ Reassign 3 open items to:   │
│ Role (6 opt) │   │ history. Frees 1 seat.│   │ [ Dr Shah ▾ ]              │
│ [Send invite]│   │ [Cancel][Suspend]     │   │ History stays. [Archive]    │
└──────────────┘   └──────────────────────┘   └────────────────────────────┘
```

---

## 3. Review Notes (hi-fi rationale)

| Screen | Why it exists | UXS-043 principle | APS-044/045 decision |
|---|---|---|---|
| **Solo Clinic** | Solo owner-doctor runs everything in one calm place | "The right room"; one screen answers the day | APS-045 X3 consolidated surface |
| **First-hire transition** | Growth without migration; a delight, not a surprise | "Grow without a migration"; show status | APS-045 §6 auto surface transition |
| **Command Center** | Owner's one-glance "how are we doing" | "Always answer what's next"; summary before detail | APS-045 §8 cockpit; command-center-service tiles |
| **Team roster** | Manage who's here + what they can do | State encoded in chips (role/status) | APS-044 §11 six roles; §14 lifecycle |
| **Invite** | Owner provisions staff (staff can't self-register) | ≤3 interactions; obvious primary action | APS-044 §9 org-created accounts |
| **Suspend** | Pause access, free a seat, keep history | "Never a dead end"; reversible | APS-044 §14; seat model; Isolation Rule (per-clinic) |
| **Archive** | End the relationship, preserve history, reassign work | Confirm destructive; explain consequence | membership-service reconciliation; archival never deletes |

**Design-system fidelity:** admin tokens/nav-rail/stat-cards/`.lrow`/rolechips/statustags/invite-modal/
toasts reused verbatim from the approved mockup. Role chips: Owner=honey, Doctor=pine, Reception=sand,
Nurse=teal-soft, Technician=slate, Practice Manager=honey-deep. Full light + dark parity + Package 1's
workspace switcher chip in the topbar.

---

## 4. UX Validation Checklist

| # | Check | Result |
|---|---|---|
| 1 | Each screen answers one primary question | ✅ Command Center="how are we doing"; Team="who & what can they do" |
| 2 | Primary action obvious | ✅ Invite staff is the standing primary; row actions scoped |
| 3 | ≤3 interactions where practical | ✅ Invite=field+role+send; Suspend=⋯→confirm |
| 4 | Empty/loading/permission/error states | ◑ Solo empty-team state + suspend/archive confirms + toasts shown; full matrix = Package 6 |
| 5 | Reuses existing components | ✅ admin mockup language verbatim; no new components |
| 6 | Complies with design system | ✅ real tokens/chips/modal |
| 7 | Light + dark | ✅ parity + toggle |
| 8 | Tablet/desktop | ✅ rail→bottom nav <900px (per mockup) |
| 9 | Tenant isolation | ✅ suspend/archive scoped to this clinic; per-clinic status |
| 10 | No unavailable capabilities exposed | ✅ Practice Manager view omits plan/billing mutation; roles are the six |
| 11 | Avoids extra clicks / load | ✅ summary-first cockpit; row-scoped actions |

**Gate result:** item 4 partial by design (state matrix = Package 6). All else pass → cleared for review.

---

## 4a. Operations-Center Polish Pass (applied) — self-audited for final freeze

Product Office directed one refinement pass to move the cockpit from "generic admin dashboard" to a
**healthcare operations center** answering *"what needs my attention right now?"* — no new scope. All
seven asks applied:

| # | Ask | Applied |
|---|---|---|
| 1 | Needs Attention first + most prominent | Now the **first section**, honey-bordered elevated card with per-item **action buttons** (Issue now / Review / Resend) |
| 2 | Quick Actions | Row of five: **Invite team member · Add doctor · Register patient · Open reception · Settings** |
| 3 | Enrich Team members | Each row now carries **specialty · clinic**, **today's workload** with an **occupancy bar** (e.g. "9 of 11 seen"), **availability chip** (Available / In consult / At front desk / Assisting), and **last active** (live dot for "Active now") |
| 4 | Calm Practice Health summary | Plain-language header: *"Good afternoon, Dr. Rao — your practice is steady today … three things need a quick look,"* with a calm "Running smoothly" status badge |
| 5 | Team capacity indicators | **Occupancy/progress bars** on doctors (On-the-floor + roster) and the plan **seat bar**; bars turn honey when load ≥75% |
| 6 | Recent Activity feed | Lightweight feed of real operational events (payment collected · consult completed · walk-in checked in · lab ordered · invite sent) with actor + relative time |
| 7 | Less generic-admin feel | Summary-before-detail hierarchy, human language, live signals, capacity — reads as an ops center, not a KPI wall |

**Re-run UX Validation Checklist:** all items 1–3, 5–11 pass (unchanged); item 4 still partial by design
(full state matrix = Package 6). The additions strengthen #1 (each section answers one question), #7
(both themes hold with the new components), and #11 (owner sees "what's next" immediately). **Cleared
for final freeze.**

---

## 5. What reviewers should look for
- **Owner/Business:** does the first-hire transition feel like a reward? Is the cockpit's "how are we doing" genuinely one-glance?
- **Product Office:** roles are exactly the six; suspend frees a seat; archive requires reassignment + keeps history.
- **Doctors:** would a managing-doctor owner find the cockpit useful without it feeling like "admin software"?
- **Gemini UX audit:** destructive-action clarity (suspend vs archive), chip legibility, keyboard/focus, five UX principles.
