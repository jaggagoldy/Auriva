# C3 — Clinical Timeline — Delivery Package

> **Process v3.0 · Steps 3–9.** Built entirely after readiness approval; delivered as one release.
> **Customer Promise:** *"Understand every patient's story in one place."*
> **Operational question answered:** *"What has happened throughout this patient's care journey?"*
> **Status:** 🧪 In Product-Office review · tsc ✅ · lint ✅ · 620/620 tests ✅ · build ✅ · demo reseeded ✅

---

## 1. Engineering Completion Report

C3 was delivered as an **enrichment of the existing timeline**, not a new feature — honoring the architectural law from the readiness: *"The Timeline never owns data; it only reveals relationships between existing clinical and operational artifacts."* No new tables, no new source of truth, no editing from the Timeline.

**What changed (2 files, additive):**

| File | Change |
|------|--------|
| `src/services/timeline-service.ts` | Enriched the read-time aggregation: **+2 entry kinds** (`treatment_plan`, `document`), **+2 batched queries** in the existing `Promise.all` (plans+sessions, issued documents) — no N+1; **canonical entry shape** (`timestamp · title · subtitle · actor · status · link`); **deterministic tie-break** ordering (timestamp desc → fixed kind-priority → id); **progressive loading** (`opts.limit` default 40, returns `has_more` + `total`). |
| `src/components/staff/patient-timeline.tsx` | The shared timeline presentation (mounted in **both** `/doctor/patients/[id]` and `/staff/patients/[id]`): new kind icons (`Sparkles` plans, `FileText` documents), **filter chips** (Visits · Plans · Prescriptions · Labs · Documents · Invoices · Payments), **deep-links** — plan/invoice/document entries are clickable and open their artifact ("View →"), subtitle now shows `detail · actor · status`. |

**Parity by construction:** because `PatientTimeline` is the single component mounted on both the doctor and reception patient pages, enriching it once upgraded both surfaces simultaneously — no forked presentation to drift.

**Deep-link resolution** (`openArtifact`): `document` → `/print/document/{id}`; `invoice` → resolves the invoice's issued Document then opens it; `plan` → prints/opens the plan's Treatment Plan document. Never a dead-end (readiness Amendment 7).

**Tests:** `src/services/timeline-service.test.ts` (3 tests, integration against dev DB) — enriched aggregation + deep-links; deterministic same-timestamp tie-break (repeat-call stable, document precedes invoice at equal timestamp); progressive limit + `has_more`.

---

## 2. Demo Package

### Demo Story
A returning patient arrives. The doctor opens the patient's page and, **before the consult**, reads the Clinical Timeline top-to-bottom in one scroll: the last **visit** and who saw them, the **Treatment Plan: ACL Rehab (0/6 sessions)**, the **Invoice** and **Payment**, and the **Visit Summary** document — each one tappable. Filter to **Documents** → every artifact for this patient, newest first. No tab-switching, no hunting across modules.

### Demo Checklist
1. Log in as a doctor → open a patient with history (`/doctor/patients/[id]`).
2. Timeline renders newest-first, grouped by day.
3. Click **Plans** chip → only treatment-plan entries; each shows `done/total sessions` + plan status.
4. Click **Documents** chip → visit summary / invoice / receipt entries; click one → the Document print view opens.
5. Click a **Payment** / **Invoice** entry → opens the underlying document.
6. Repeat as **reception** (`/staff/patients/[id]`) → identical timeline (same component).

### Screens changed
- `/doctor/patients/[id]` — enriched timeline (plans, documents, deep-links, filter chips).
- `/staff/patients/[id]` — same, via the shared component.

### New / updated UI
- Filter chips extended: **Plans** and **Documents** added.
- Timeline entries: actor + status in the subtitle; clickable artifact rows with a "View →" affordance.

### Backend capabilities
- `getPatientTimeline(patientId, clinicId, { limit })` now aggregates 7 kinds with deterministic ordering, deep-link references, and progressive slicing (`has_more`/`total`).

### Business value
The doctor stops reconstructing a patient's history by hand before each consult; the whole story — clinical, financial, documentary — is one scroll and one click deep. This is the connective tissue C4 (Prescription) and C5 (Communication) will surface through.

---

## 3. QA / Test Package

| Suite | Coverage | Result |
|-------|----------|--------|
| **Functional** | Enriched entries present (plan+document+invoice+payment+appointment), plan progress subtitle, deep-links present | ✅ automated |
| **Ordering** | Same-timestamp tie-break deterministic across repeated calls; kind-priority applied at equal timestamps | ✅ automated |
| **Progressive** | `limit` slices newest-first; `has_more`/`total` correct | ✅ automated |
| **Regression** | Full suite 620/620 (existing timeline consumers unaffected — added fields are additive) | ✅ |
| **Permission** | Timeline stays clinic-scoped (staff) / patient-scoped (app); no cross-clinic leakage (existing scoping preserved) | ✅ unchanged |
| **Build** | Production build compiles all consuming routes | ✅ |
| **Browser / mobile** | Doctor + reception patient pages render the shared component; chips wrap responsively | ✅ manual (existing component, additive markup) |

---

## 4. Known Limitations

1. **Patient-app Records timeline not yet enriched.** The patient app (`/patient/records`) renders its *own* appointment-based timeline (separate code path from the shared staff/doctor component). The enriched entries (plans, documents, deep-links) and the "My Health Record" human-language treatment (readiness Amendment 4) are **scoped as a C3-follow-up / C5-adjacent item**. Patients still see their plans on the patient home (C2's PatientPlans card). *Nothing regressed; the enrichment simply hasn't reached that surface yet.*
2. **"Load older" is backend-ready, not yet wired in the UI.** `has_more`/`total` are returned and the default limit is 40; the shared component currently renders the first page. A "Load older" control is a small additive follow-up.
3. **Consult Context focus mode** (readiness Amendment 8) is recorded as future behaviour, not built — the Timeline opens newest-first, not auto-focused on Last Visit / Current Plan.
4. **Course Completion split** (operational vs clinical completion) recorded per PO for a future surface — not in C3.

---

## 5. What's New in C3

**For Doctors** — Open a patient and their whole story is in front of you before the consult: last visit, active treatment plan and how many sessions are done, prescriptions, labs, and every document — filterable, newest first, each one click away.

**For Reception** — The same complete patient timeline you and the doctor both see. Find any invoice, receipt, or visit summary from one place and open it instantly.

**For Patients** — (Coming next) your plans already appear on your home; the full "My Health Record" timeline lands in a follow-up.

**For Clinic Owners** — Your team stops digging across modules to answer "what's happened with this patient?" One record, always current, built from data you already have — no extra data entry.

---

## 6. Milestone Summary Card

| | |
|---|---|
| **Milestone** | C3 — Clinical Timeline |
| **Promise** | Understand every patient's story in one place |
| **Operational question** | What has happened throughout this patient's care journey? |
| **Shipped** | Enriched read-time timeline (+plans +documents), canonical deep-linked entry shape, deterministic ordering, progressive loading; shared component upgraded across /doctor + /staff |
| **Architecture** | Read-only aggregation — no new tables, no new source of truth, no editing from the Timeline |
| **Files** | 2 changed (`timeline-service.ts`, `patient-timeline.tsx`) + 1 test file |
| **Tests** | 620/620 pass (3 new C3 tests) · lint ✅ · build ✅ |
| **Deferred** | Patient-app "My Health Record" enrichment · "Load older" UI · Consult Context focus mode · Course Completion split |
| **Unlocks** | C4 (Prescription) and C5 (Communication) surface through the Timeline |
| **Status** | 🧪 In Product-Office review |
