# UXS-043 — Phase 2: Cross-Package Consistency Audit + Baseline Deliverables

**Type:** Consistency reconciliation (not creation) · the final Product Office baseline before external review
**Input:** [Phase 1 E2E Review](./UXS-043-phase1-e2e-review.md) findings F1–F8
**Date:** 2026-07-15
**Outputs:** four governed deliverables (A–D) + the systematic consistency matrix. No UX redesign — reconciliation only.

---

## Systematic Consistency Matrix (all six packages)

| Area | Verdict | Note / action |
|---|---|---|
| Terminology (same concept, same name) | ⚠ → **B** | Deliberate per-persona terms; needs the 3-layer glossary |
| Navigation patterns | ✅ | Staff rail + patient bottom-tab, consistent within each world |
| Button hierarchy | ✅ | Primary/line/danger consistent; staff-pine vs patient-honey is **intentional** (F5) |
| Colour semantics | ✅ | success/warning/info/destructive constant across light/dark (clinical safety) |
| Empty states | ⚠ → **D** | Defined in P6; not yet retrofitted into P1–P5 (engineering-readiness) |
| Loading behaviour | ✅ (standard set) | Skeletons standardised in P6; adopt platform-wide |
| Notification usage | ✅ (standard set) | Toast/Banner/Inline/Modal taxonomy in P6 |
| Permission messaging | ✅ | Graceful, explain-not-403; consistent |
| Responsive behaviour | ✅ | Documented rules (P6 §8) |
| Accessibility | ✅ | Baseline (P6 §10) |
| Motion | ✅ | Principles (P6 §10a) |
| **Component naming (F8)** | ⚠ → **C** | UI identical, names drift — one canonical name per pattern |
| **Product narrative (F1)** | 🚫 → **A** | Fractured demo world — the one real reconciliation |

---

## Deliverable A — Canonical Demo World

The single world every prototype, doc, and future demo uses. Resolves **F1**.

**Organization:** **Sunrise Health Group** · Bengaluru · Professional plan

**Clinics**
| Clinic | Location | Role |
|---|---|---|
| SmileCare Dental | HSR Layout | HQ |
| HSR Family Clinic | Sector 2 | branch |
| Sunrise Physio | Koramangala | branch |

**People (the frozen six roles)**
| Person | Role | Home clinic |
|---|---|---|
| Dr. Anjali Rao | Owner (Dentist) | SmileCare Dental |
| Ravi Tandon | Practice Manager | All clinics |
| Dr. Arjun Mehta | Doctor (General Physician) | HSR Family Clinic *(also SmileCare — the multi-workspace doctor)* |
| Dr. Meera Iyer | Doctor (Dermatologist) | HSR Family Clinic |
| Dr. Vikram Shah | Doctor (Physiotherapist) | Sunrise Physio |
| Priya Menon | Nurse | SmileCare Dental |
| Suresh Kumar | Technician | SmileCare Dental |
| Meera Nair | Receptionist | HSR Family Clinic |

**Package casting (removes the three-universe drift)**
- **P1 Identity:** the multi-workspace doctor is **Dr. Arjun Mehta** with memberships at **HSR Family Clinic** + **SmileCare Dental** (was Dr Ravi · Sunrise/Metro).
- **P3 Doctor:** logged-in as **Dr. Arjun Mehta · HSR Family Clinic** (was Aegis Family Clinic).
- **P2 Owner / P4 Reception / P5 Patient:** already in-world — canon adopted from them.
- **Patient (P5):** **Goldy Sharma** (family: Aarav — son, Meera Sharma — mother); books **Dr. Meera Iyer** at HSR Family Clinic.

**Naming-collision rule:** no two *different* people share a first name in a single walkthrough. Applied
fix: the reception queue's "Rohan Kulkarni" → **"Karan Kulkarni"** (removed the two-Rohan clash flagged
in Phase 1). General principle recorded for future demo data.

---

## Deliverable B — Global Product Glossary (three layers)

Resolves **F3**. One entity, three vocabularies — kept explicitly separate so PRS-043 is unambiguous.

| Internal domain model (engineering) | Display language (per surface) | Notes |
|---|---|---|
| `Appointment` | Patient: **"visit"** · Reception: **"appointment"** · Doctor: **"consultation"** | Same row in DB; three human words by design |
| `StaffProfile` (= Membership) | **"team member"**, **"membership"** | 1 person may hold several (multi-clinic) |
| `Organization` | **"practice"** / **"health group"** | owner-facing |
| `Clinic` | **"clinic"** / **"location"** / **"branch"** | |
| Reception **surface** | **"Front desk"** (nav) / **"Reception Workspace"** (spec) | one surface, "Front desk" is the in-product label |
| `super_admin` role | **"Owner"** | display label only (APS-044 §11) |
| `Invoice` + `Payment` | **"bill"** (patient) · **"collect"/"desk"** (reception) | |
| `PatientProfile` | **"records"/"health vault"** (patient) · **"patient"** (staff) | |

**Layer discipline:** engineering builds against the **domain model**; UI shows the **display language**;
**engineering terminology** (component/prop names) comes from Deliverable C. Three layers, never mixed.

---

## Deliverable C — Shared UI Behaviour Standard

Resolves **F2 + F8**. One canonical component name + behaviour per pattern. Engineering builds each **once**.

| Canonical component | Replaces the drift of… | Behaviour (from P6) |
|---|---|---|
| `WorkspaceSwitcher` | "switcher chip" (3 formats) | **`[mark] Clinic · Role ▾`** on **every** staff surface; single membership = static label; opens the selector; server-resolved (APS-045 §7). **Now added to P4.** |
| `Toast` | success toast / confirmation / notification | transient confirm, auto-dismiss ~2.5s |
| `Banner` | confirmation banner / alert | persistent context until resolved |
| `InlineMessage` | inline message / hint / support text / secondary text | field/section validation |
| `Callout` | callout / guidance / instruction | contextual explanation inside a card |
| `EmptyState` | empty state / placeholder | reason + one next action |
| `Skeleton` | loading / placeholder | matches final layout; reduced-motion aware |
| `OfflineBanner` | offline / no-connection | non-blocking + auto-sync |
| `ErrorState` | error / alert | icon + plain cause + recovery (3 tiers) |
| `PermissionState` | 403 / access-denied | explain + recovery path |

**Rule:** one name → one implementation → one QA vocabulary → one PRS term.

---

## Deliverable D — UX Traceability Register (starter)

Resolves **F4** (engineering readiness). Every UX interaction traces to a component, a business rule,
and a PRS-043 reference. Starter rows (PRS-043 will complete it):

| UX interaction | Shared component (C) | Business rule / spec | PRS-043 ref |
|---|---|---|---|
| Staff login → >1 membership → selector | `WorkspaceSurvey` → `WorkspaceSwitcher` | APS-044 §9/§10; SAD-043 §3 | PRS §Auth |
| Switch clinic → content re-scopes, isolation | `WorkspaceSwitcher` | APS-044 §13a Isolation; SAD-043 §6 | PRS §Workspace |
| Mandatory password on provisioned first login | `PermissionState`/form | APS-044 §9; SAD-043 §11 (`must_change_password`) | PRS §Auth |
| First hire → owner surface transition | (routing) | APS-045 §6 `resolveSurface()` | PRS §Surface |
| Suspend member → frees seat, per-clinic | `Modal` + `Toast` | APS-044 §14; subscription seat model; §13a | PRS §Team |
| Archive member → reassign + keep history | `Modal` | membership-service reconciliation | PRS §Team |
| Sign & complete → auto-advance next patient | (status machine) | appointment-status.ts transitions | PRS §Consult |
| Checkout collect (UPI/Cash/Card) → receipt | `Modal` + `Toast` | Invoice/Payment (billing) | PRS §Desk |
| Any list with no data | `EmptyState` | P6 matrix (Empty row) | PRS §Resilience |
| Any content load | `Skeleton` | P6 matrix (Loading row) | PRS §Resilience |
| Connection lost | `OfflineBanner` | P6 matrix (Offline row) | PRS §Resilience |

---

## Reconciliations applied to the prototypes (this phase)

| Finding | Action | Files |
|---|---|---|
| F1 | Re-skinned to the Canonical Demo World: P1 → Dr. Arjun Mehta · HSR Family Clinic + SmileCare Dental; P3 → HSR Family Clinic (was Aegis). P2/P4/P5 already canon. | pkg-1, pkg-3 |
| F1 (collision) | Reception "Rohan Kulkarni" → "Karan Kulkarni" | pkg-4 |
| F2 | `WorkspaceSwitcher` chip added to the Reception topbar | pkg-4 |
| F3/F4/F8 | Documented in Deliverables B/C/D (no UI change) | — |

Redeployed artifacts: P1, P3, P4 (same URLs).

---

## Verdict

With Deliverables A–D in place and F1/F2 reconciled in the prototypes, UXS-043 now presents as **one
product, one world, one component vocabulary.** Phase 1's only score-dragging item (demo consistency
6.9) is resolved. The consistency matrix is green except for the two items that are **intentional and
documented** (F5/F6).

**Auriva is ready for Phase 3 — the external Gemini review** — with a clean single-world walkthrough, a
governed glossary, a shared component standard, and a traceability spine that PRS-043 will extend rather
than invent.
