# Prototype Package 3 — Doctor Experience (Flagship)

**Series:** UXS-043 Interactive Prototype · Package 3 of 6
**Covers:** Today (Mission Control) · Consult Workbench (flagship) · Patients (faceted) · Schedule · Practice · Profile
**Status:** ✅ **APPROVED & FROZEN — v1.0** (Product Office, 2026-07-14, scored 9.7/10). All six screens frozen; do not reopen unless clinician review finds a genuine workflow problem.
**Deferred (future epic, NOT Release 1.2):** *UX-Advanced Clinical Productivity* — voice dictation · smart follow-up suggestions · keyboard-first shortcuts · favourite prescriptions · specialty-specific templates · multi-monitor · clinical macros · ambient documentation. Kept out of MVP to preserve the current experience; clear evolution path.
**Foundation:** [design/doctor-workspace-hifi-mockup.html](../../design/doctor-workspace-hifi-mockup.html) (APS-011) — structure + interaction model reused verbatim; rendered in the **warm Auriva design system** from Packages 1 & 2 (the mockup's older teal palette is superseded by the current APS-031 tokens the app ships).

Prototype file: [pkg-3-doctor.html](./pkg-3-doctor.html)

> **The one objective:** *Can a doctor complete an entire consultation with the fewest possible clicks,
> the least cognitive load, and the greatest confidence?* Every decision below serves that. The
> Workbench feels **calm, focused, clinically efficient — not a documentation system.**

---

## 1. Storyboard

**Doctor's day (the loop that must be frictionless)**
```
Today (Mission Control) ── Call in next ──► Consult Workbench
        ▲                                        │
        │                                   fill (mostly pre-filled + templates)
        │                                        │
        └──────── Sign & complete ── auto-advances to next patient ◄┘
```

**Consult Workbench — the anatomy (three rails, APS-007 T3)**
```
┌ QUEUE (left) ─┐┌ CONSULT (center) ───────────────┐┌ CONTEXT (right) ─┐
│ ● In consult  ││ Jordan Lee · 32F · A− · #11 · 6m ││ ⚠ Allergy: Penicillin│
│   Jordan Lee  ││ Chief complaint (pre-filled)     ││ Last visit with me  │
│ ● Waiting · 3 ││ Clinical notes  [Insert template]││ Timeline            │
│   Rohan       ││ Diagnosis  [chips + quick-add]   ││ Vitals (soon)       │
│   Priya       ││ Prescription [rows + template]   ││                     │
│ ● Skipped ·1  │├──────────────────────────────────┤│                     │
│   Vikram [↺]  ││ Draft saved · [Save] [Sign&complete]│                   │
└───────────────┘└──────────────────────────────────┘└─────────────────────┘
```

**Cognitive-load & click-reduction decisions**
- **Booking reason pre-fills the chief complaint** — the visit starts already contextualized.
- **One-click templates** fill clinical notes (SOAP) and a common prescription — typing is the exception, not the rule.
- **Diagnosis as quick-add chips** (common Dx one tap) — structured, feeds Patients facets later.
- **Allergies surface as a red safety alert** at the top of context — confidence, not hunting.
- **Sign & complete is an in-pane sticky action** (never a dialog) that **auto-advances** to the next waiting patient and loads their context — the loop has no dead stop.
- Information **recedes when not needed**: context rail is glanceable; the center holds only the active visit.

---

## 2. Low-Fidelity Wireframes

**Today · Mission Control**
```
┌ Doctor Workspace ─ Today ──────────────────────── (search)(bell) ┐
│ Good morning, Dr. Mehta · Thu Jul 3 · Aegis · 9–13   [12 min behind]│
│ 26 patients · 4 waiting · 9 completed        NEXT: Rohan [Call in] │
│ Quick: [Start consultation][Open schedule][Pause booking]         │
│ ┌ Waiting · 4 ────────────┐   → select a patient → Workbench      │
│ │ #12 Rohan · #13 Priya…  │                                       │
│ │ Skipped · 1  #9 Vikram ↺│                                       │
│ └─────────────────────────┘                                       │
└───────────────────────────────────────────────────────────────────┘
```

**Patients (faceted) / Schedule (week) / Practice (sub-nav) / Profile (identity + public preview)** — as
in the APS-011 mockup, re-skinned warm.

---

## 3. Review Notes

| Screen | Why it exists | Fewest-clicks / confidence move | Source |
|---|---|---|---|
| **Today** | Everything in three seconds; call in the next patient | Next-patient chip + one-tap Call in; running-behind visible | APS-011 DOC-001 |
| **Workbench** | Complete a consult with minimal friction | pre-filled complaint · one-click templates · quick Dx chips · allergy alert · Sign&complete auto-advance | APS-011 DOC-002 (flagship) |
| **Patients** | Doctors remember cases, not names | faceted tabs (Recent/Follow-up Due) + last-Dx column | APS-011 DOC-007 |
| **Schedule** | Calendar + availability in one | week grid, clinic-colored blocks | APS-011 DOC-003/004 |
| **Practice** | Where I work, what I charge | left sub-nav, locations/fees | APS-011 SET-003 |
| **Profile** | Professional identity + live public preview | sub-nav + pinned public preview | APS-011 PRO-002 |

**Design-system fidelity:** warm tokens (cream `#FBF8F4`, pine `#0E7466`, honey), rounded headings,
the same nav/chip/card/modal/toast vocabulary as Packages 1–2. Clinical safety colors (allergy = rose)
constant across light/dark. Full theme parity + the Package 1 workspace-switcher pattern in the shell.

---

## 4. UX Validation Checklist

| # | Check | Result |
|---|---|---|
| 1 | One primary question per screen | ✅ Today="who's next"; Workbench="finish this visit" |
| 2 | Primary action obvious | ✅ Call in (Today); Sign & complete (Workbench) |
| 3 | ≤3 interactions where practical | ✅ **A full consult can be: Call in → Insert template → Apply Rx → Sign & complete** |
| 4 | Empty/loading/permission/error | ◑ empty queue + "no more patients" + draft-saved state shown; full matrix = Package 6 |
| 5 | Reuses components | ✅ APS-011 structure + Packages 1–2 warm system; nothing invented |
| 6 | Design-system compliant | ✅ real tokens, warm palette |
| 7 | Light + dark | ✅ parity + toggle |
| 8 | Tablet/desktop | ✅ context rail collapses <1100px, queue <900px |
| 9 | Tenant isolation | ✅ single-clinic context; scoped to the doctor's active workspace |
| 10 | No unavailable capabilities | ✅ Earnings/Vitals shown as honest "Soon", not faked |
| 11 | Avoids clicks / cognitive load | ✅ pre-fill, templates, auto-advance, glanceable context |

**Gate result:** item 4 partial by design (state matrix = Package 6). All else pass → cleared for review.

---

## 4a. Consult Workbench refinement (applied) — resubmitted for final review

Product Office froze Today/Patients/Schedule/Practice/Profile as-is and directed a refinement of **only
the Consult Workbench** — to feel like *conducting a consultation, not filling a form*. Same three-rail
architecture; all seven asks applied:

| # | Ask | Applied |
|---|---|---|
| 1 | Consultation progress indicator | **Persistent stepper**: Patient ready → Consultation → Prescription → Complete; steps light/check as state advances |
| 2 | Persistent clinical safety strip | Always-visible **safety strip** surfacing every applicable alert — **allergy · pregnancy · chronic conditions · critical vitals** (rose for critical, honey for conditions); calm "No critical alerts" when clear |
| 3 | Context-aware template suggestions | A **Suggested protocol** card keyed off the chief complaint (fever→Viral fever, BP→Hypertension, rash→Dermatitis, back→MSK); one-tap **Apply** fills notes + diagnosis + Rx; diagnosis quick-adds are complaint-specific |
| 4 | Time awareness | Header shows **Started 12:34 · live elapsed · Waited 22m** |
| 5 | Persistent Next-Patient preview | **Up-next** in the footer + an **"Up next — prepare"** card in the context rail (name, reason, and an allergy/pregnancy pre-flag) so the doctor can prepare before completing |
| 6 | Workflow-oriented footer | **Save draft · Print prescription · Complete consultation** |
| 7 | Momentum feedback | Lightweight toasts on key actions — *protocol applied · diagnosis captured · prescription ready · notes inserted* — reinforcing forward motion, with the stepper advancing in step |

**Fastest path now:** Call in → **Apply protocol** (one tap fills notes+Dx+Rx) → **Complete consultation**
→ auto-advances. The safety strip and next-patient preview make it feel supervised and prepared, not
transactional. Warm design system, IA, and interactions preserved. Other five screens untouched.

**Self-audit:** unchanged pass profile (10/11; states = Package 6). The refinement strengthens
"greatest confidence" (safety strip), "forward momentum" (stepper + feedback), and "least cognitive
load" (context-aware suggestion, prepared next patient). **Consult Workbench resubmitted for final review.**

---

## 5. What reviewers should look for
- **Doctors:** does a full consult *feel* like ≤4 deliberate actions? Is the allergy alert reassuring? Does Sign & complete → next feel natural?
- **Product Office:** structure matches APS-011; nothing beyond APS-044/045 scope; "Soon" items honest.
- **Gemini UX audit:** cognitive load in the center pane, template discoverability, keyboard flow, the five UX principles.
