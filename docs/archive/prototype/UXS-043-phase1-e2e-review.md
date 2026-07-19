# UXS-043 — Phase 1: Whole-of-Product End-to-End Review

**Type:** Internal validation (not creation) · the first evaluation of Auriva as **one product**
**Scope:** the six frozen packages (P1 Foundation · P2 Clinic Workspace · P3 Doctor · P4 Reception · P5 Patient · P6 Resilience) walked as **five user journeys**, not package boundaries.
**Date:** 2026-07-15
**Rule:** no redesigns — surface **inconsistencies** and **genuine gaps** only. Every fix here is a *reconciliation* (data / label / a missing shared affordance), never a change to frozen IA, interaction, or visual language.

**Prototype set:** [P1](./pkg-1-identity.html) · [P2](./pkg-2-owner.html) · [P3](./pkg-3-doctor.html) · [P4](./pkg-4-reception.html) · [P5](./pkg-5-patient.html) · [P6](./pkg-6-resilience.html)

---

## Method

For each journey I traced the flow across surfaces and scored eight continuity criteria:
**navigation continuity · terminology consistency · visual consistency · state transitions · cognitive
load · dead ends · recovery paths · cross-device behaviour.** ✅ pass · ⚠ finding · 🚫 blocker.

**Headline result:** the six packages are **strongly coherent** on visual language, interaction
patterns, resilience behaviour, and cognitive load. There are **no blockers**. The findings cluster
around **one real theme — a fractured demo world** — plus a small number of shared-affordance and
terminology reconciliations. All are prototype-data / label fixes.

---

## Journey 1 — New Patient
*Landing → Book → Reception check-in → Consultation → Checkout → Records → Follow-up*

| Criterion | Verdict | Notes |
|---|---|---|
| Navigation continuity | ⚠ | Each surface is internally clean; the hand-off points line up on the appointment lifecycle (see Continuity Map). But the flow crosses **three different clinic universes** (F1). |
| Terminology | ⚠ | The same entity is a "visit" (patient), "appointment" (reception), "consultation" (doctor) — deliberate per-persona language, but undocumented (F3). |
| Visual consistency | ✅ | Warm tokens, ECG mark, cards/chips/toasts identical across surfaces. |
| State transitions | ✅ | booked → checked-in → waiting → in-consult → completed → collected all represented and aligned. |
| Cognitive load | ✅ | Each screen answers one question; patient side reassurance-first. |
| Dead ends | ✅ | Booking confirm → "Back to Home"; checkout done → "Done"; empty consult → "Back to Today". |
| Recovery paths | ✅ | Reschedule, Retry, Recall all present. |
| Cross-device | ✅ | Patient mobile-first; staff desktop with documented collapse (P6 §8). |

## Journey 2 — Returning Patient
*Home → Today's visit → Consultation → Payment → Timeline → Next visit*

- **Continuity ✅** — Today home → hero visit → (doctor consults) → payment reflected as "Paid" in the records timeline → next-visit surfaces on Home. Clean loop.
- **Finding:** the patient's doctor is **Dr. Meera Iyer** (P5), but the Doctor package's practitioner is **Dr. Arjun Mehta** at **Aegis Family Clinic** (P3) — the returning patient can never "meet" their doctor in the prototype world (F1).

## Journey 3 — Reception
*Morning setup → Queue → Walk-in → Check-in → Consultation flow → Checkout → Close day*

- **Continuity ✅** — board lanes (Waiting → In consultation → To collect) + walk-in + checkout form a complete, one-action-per-stage cash cycle.
- **Finding (F2):** the reception topbar shows **"HSR Family Clinic · Front desk · Meera"** but **no workspace-switcher chip**, whereas Doctor (P3) and Owner (P2) both show an active-workspace chip with a ▾. A multi-clinic receptionist has no visible way to switch — inconsistent with the APS-044/045 switcher that P1 established.
- **Finding (F3):** nav label **"Front desk"** vs the UXS surface name **"Reception Workspace"** vs role **"Receptionist"** — three words near one concept.

## Journey 4 — Doctor
*Today's schedule → Consultation → Documentation → Prescription → Complete visit*

- **Continuity ✅** — Today mission-control → Workbench (stepper: Patient ready → Consultation → Prescription → Complete) → Sign/Complete auto-advances. Excellent internal flow.
- **Finding (F1):** whole package is set in **Aegis Family Clinic / Dr. Arjun Mehta / patients Jordan Lee, Rohan Sharma** — a different universe from the Sunrise/HSR world of P2/P4/P5. Patient "Rohan" appears in both P3 (Rohan Sharma) and P4 (Rohan Kulkarni) as **different people**.

## Journey 5 — Practice Owner
*Clinic setup → Team → Reports → Settings → Governance*

- **Continuity ✅** — solo → first-hire transition → Command Center → Team (invite/suspend/archive) is a clean growth story; roles match the frozen six.
- **Finding (F2):** Owner switcher chip reads **"Sunrise Health Group · Owner"** (no clinic mark styling parity with P3's chip); standardise the chip format across all staff surfaces.
- **Finding (F5, not a defect):** Owner/staff primary button is **pine**; patient primary is **honey**. This is the *intentional* staff-efficiency vs patient-warmth distinction — should be **documented as a rule** so it is never "corrected."

---

## Continuity Map — the seams line up

```
PATIENT books ─┐
               ▼
        Appointment: scheduled ──► RECEPTION check-in ──► waiting ──► (queue)
                                                                        │
                                              DOCTOR: in_consultation ◄─┘
                                                     │ Sign & complete
                                                     ▼
                                              completed ──► RECEPTION checkout ──► invoice paid
                                                                        │
                                                       PATIENT Records (timeline) ◄─┘  ──► follow-up booked
```

The appointment **status machine is the connective tissue** and every surface reads/writes the right
stage. The packages are separate artifacts (by design) but **align at the seams** — no
state-transition gap found.

---

## Audit A — Workflow Ownership Continuity

Healthcare systems fail when a task has **two owners** or **no owner**. Every handoff must transfer a
**single visible owner**. Verified across the encounter lifecycle:

| Stage | Owner | Visible? | Two-owner risk | No-owner risk |
|---|---|---|---|---|
| Booking | Patient (self) / Reception (phone-in) | ✅ patient confirm / reception board | None — booking source is explicit | None |
| Check-in → queue | **Reception** | ✅ board "Waiting" lane, per-doctor count | None | None — walk-ins land in a lane immediately, never limbo |
| In consultation | **Doctor** | ✅ "In consultation" lane + Workbench header | ⚠ *soft*: a patient sits in the doctor's queue **and** the reception board — but the **active owner is unambiguous** (whoever's lane shows "in consultation") | None |
| Sign & complete | **Doctor** → hands to Reception | ✅ status flips to "Done · to collect" | None — the flip is the handoff | None — the "to collect" lane *is* the reception inbox |
| Payment | **Reception** | ✅ Desk / Collect | None | None |
| Records | **Patient** (owns their vault) | ✅ patient timeline | None | None |

**Verdict:** ✅ every handoff has exactly one visible owner; the **status flip is the ownership
transfer** (doctor "complete" → reception "to collect"). No orphaned or double-owned tasks found. The
only note (soft) is that a patient appears in two views mid-visit — acceptable because the *active*
owner is always the surface showing "in consultation."

## Audit B — Information Persistence (identity & data continuity)

Verifies that the **same identity and data survive** every hop — nothing silently disappears.

| Data | Enters at | Must persist through | Verdict |
|---|---|---|---|
| Patient identity (name, phone, health ID) | Patient signup / Reception walk-in | Queue → Workbench header → Invoice → Records timeline | ✅ same profile carried; health ID is the stable key (APS-029) |
| Chief complaint / reason | Booking or walk-in | Reception card → Workbench "Chief complaint (from booking)" | ✅ **explicitly pre-filled** in the Workbench — the strongest persistence signal in the product |
| Diagnosis & prescription | Doctor Workbench | Patient Records (visit detail) | ✅ visit detail shows Dx + Rx |
| Amount | Doctor fee / service | Reception checkout invoice → Patient Records invoice | ✅ same figure; "Paid" reflected in timeline |
| Allergies / conditions | Profile / history | Workbench safety strip | ✅ surfaced, not dropped |

**Verdict:** ✅ identity and clinical/financial data are continuous. The booking-reason → chief-complaint
pre-fill and the amount → invoice → "Paid" chain are the clearest proofs. (Engineering must preserve
this in implementation — captured as **F4/Deliverable D traceability**.)

## Audit C — Trust Continuity (emotional arc)

Does confidence **hold or rise** across the patient arc — with no sudden cold/enterprise page?

`Landing → Book → Confirmation → (Reception) → (Consultation) → Checkout → Records`

- **Landing / Login (P1):** calm two-panel, trust signals (encrypted · audit-logged). Trust: **established.**
- **Book (P5):** warm doctor profile, rating, clear fee, honey CTA. Trust: **rising.**
- **Confirmation (P5):** "You're booked" success screen, reminder promise. Trust: **reinforced.**
- **Reception/Consultation (staff, patient doesn't see):** the patient's *experience* stays in the warm app; the operational surfaces are the staff's, not the patient's — so no cold page is ever shown *to the patient*.
- **Checkout (patient side):** "Payment completed" shown reassuringly on the Home hero; the patient never sees the cash desk. Trust: **held.**
- **Records (P5):** reassurance-first ("You're all caught up"), visit timeline. Trust: **held/rising.**

**Verdict:** ✅ the patient arc **never drops into an enterprise/administrative page** — the operational
coldness is deliberately confined to staff surfaces the patient never touches. Trust holds or rises at
every step. This is Auriva's core differentiator and it survives the end-to-end walk.

---

## Quantitative Summary

| Area | Score |
|---|---|
| Navigation | 9.8 |
| Workflow | 9.7 |
| Continuity (state) | 9.9 |
| Ownership continuity | 9.8 |
| Information persistence | 9.7 |
| Terminology | 8.8 |
| Demo / narrative consistency | 6.9 |
| Emotional / trust cohesion | 9.6 |
| Clinical safety | 9.8 |
| **Overall** | **9.4** |

The single number pulled down is **demo/narrative consistency (6.9)** — entirely F1. Fix it and the
product scores ~9.6 across the board.

---

## Consolidated Findings Register

All are **reconciliations**, not redesigns. Severity = impact on "reads as one product." None blocks
the freeze; all should be resolved in **Phase 2 (Consistency Audit)** before PRS-043.

| # | Finding | Type | Packages | Severity | Recommended reconciliation |
|---|---|---|---|---|---|
| **F1** | **Canonical Product Narrative Drift** — 3 unrelated clinic/doctor/patient universes (P1 Dr Ravi · Sunrise/Metro; P3 Dr Arjun Mehta · Aegis; P2/P4/P5 Sunrise Health Group · HSR/SmileCare · Drs Rao/Shah/Iyer). Same first names reused for different people (two "Rohan"s). *Not a UX issue — a product-continuity/storytelling issue: reviewers subconsciously read it as inconsistency and lose trust.* | Narrative continuity | P1,P3 vs P2,P4,P5 | **High** | **Deliverable A** — one canonical world (Sunrise Health Group; fixed clinics, doctor roster incl. Dr. Meera Iyer, patients). Re-skin P1 & P3 data. Prototype-data only. |
| **F2** | **Workspace-switcher affordance inconsistent** — present in P1/P2/P3 (three different formats), **absent in P4 reception**. | Shared affordance | P1–P4 | **Medium** | **Deliverable C** — standardise one chip `[mark] Clinic · Role ▾` on **every** staff surface; add to P4. |
| **F3** | **Per-persona terminology undocumented** — visit / appointment / consultation (same entity); Front desk / Reception / Receptionist. | Terminology | all | **Medium** | **Deliverable B** — a glossary with **three explicit layers**: (1) **internal domain model** (the entity, e.g. `Appointment`), (2) **display language** (per-surface: "visit"/"appointment"/"consultation"), (3) **engineering terminology** (component/prop names). Keeps PRS unambiguous. |
| **F4** | **P6 states not yet reflected in P1–P5 screens** (empty/loading/offline) — deferred to P6 by design. | Engineering readiness | P1–P5 | **Medium** | Reclassified as an **Engineering Readiness requirement** — cross-referenced in **Deliverable D** (traceability): every screen adopts the P6 `<EmptyState>/<Skeleton>/<OfflineBanner>/…` components; carried into PRS-043. |
| **F5** | Primary-button colour differs staff(pine) vs patient(honey). | Intentional | staff vs P5 | **Info** | **Document as a rule** (efficiency vs warmth). Do **not** unify. |
| **F6** | Bottom-nav (patient) vs rail (staff). | Intentional | P5 vs staff | **Info** | Document as platform rule (mobile-first consumer vs desktop-first operator). |
| **F7** | Owner role chip label "Owner" while stored role is `super_admin`. | Label (resolved APS-044 §11) | P2 | **Info** | No action — "Owner" is the display label by design; note for PRS traceability. |
| **F8** | **Cross-package component-naming drift** — the *UI is identical* but the vocabulary isn't: success toast / confirmation banner / inline message / callout / alert / notification; empty state / placeholder / hint; guidance / support text / secondary text. Inconsistent names → divergent engineering implementations, docs, QA language, PRS wording. | Component naming | all | **Low (fix now)** | **Deliverable C** — a single component name per pattern (e.g. `Toast`, `Banner`, `InlineMessage`, `EmptyState`, `Skeleton`, `PermissionState`). One name, one implementation. |

---

## Eight-criterion summary (whole product)

| Criterion | Verdict |
|---|---|
| Navigation continuity | ✅ within surfaces; ⚠ demo-world breaks the illusion of one flow (F1) |
| Terminology consistency | ⚠ deliberate per-persona terms need a glossary (F3) |
| Visual consistency | ✅ excellent — one design language throughout |
| State transitions | ✅ status machine aligns every seam |
| Cognitive load | ✅ one-question screens; reassurance-first on patient |
| Dead ends | ✅ none found — every terminal state offers a way forward |
| Recovery paths | ✅ Retry / Reschedule / Recall / Request access present |
| Cross-device | ✅ documented responsive + mobile-first patient |

---

## Verdict

**UXS-043 reads as one product** on everything that is hard to retrofit — visual language, interaction
grammar, resilience, accessibility, and emotional tone (warm patient vs efficient staff, *by design*).
The only substantive issue is **F1 (a fractured demo world)**, which is cosmetic-but-important: it
makes a continuous walkthrough feel like three products even though the architecture is one. F2/F3/F4
are small shared-affordance and documentation reconciliations.

**Recommendation:** proceed to **Phase 2 (Cross-Package Consistency Audit)** — expanded per Product
Office direction to also validate **workflow ownership, information persistence, trust continuity, and
component naming** (Audits A–C above + F8). Phase 2 produces **four concrete deliverables** that become
the final Product Office baseline before the external Gemini review:

| Deliverable | Resolves | Contents |
|---|---|---|
| **A — Canonical Demo World** | F1 | One org, clinics, doctor roster, patient set; re-skin P1 & P3 to match |
| **B — Global Product Glossary** | F3 | Three layers: internal domain model · display language · engineering terminology |
| **C — Shared UI Behaviour Standard** | F2, F8 | Canonical component names + behaviour: switcher · empty · loading · offline · toast · banner · inline · permission |
| **D — UX Traceability Register** | F4 | UX interaction → shared component → business rule → PRS reference |

No package needs reopening for design — only reconciliation. After Phase 2, Auriva is ready for the
**external Gemini review** with a clean, single-world walkthrough and a governed component vocabulary.
