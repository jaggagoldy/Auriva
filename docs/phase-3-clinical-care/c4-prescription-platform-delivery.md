# C4 — Prescription Platform — Delivery Package

> **Process v3.0 · Steps 3–9.** Built entirely after readiness approval; delivered as one release.
> **Customer Promise:** *"Every prescription, captured clearly — and reusable."*
> **Operational question answered:** *"What treatment did the doctor decide — and can it be captured cleanly, printed properly, and reused?"*
> **Canonical Business Object:** `PrescriptionMedicine`
> **Status:** 🧪 In Product-Office review · tsc ✅ · lint ✅ · 632/632 tests ✅ · build ✅ · demo reseeded ✅

---

## 1. Engineering Completion Report

C4 was delivered as an **enrichment** — honoring "enrich, don't fork" across a fourth milestone. The prescription kept its existing home (`Prescription` model, written through `updateClinicalRecord`); C4 gave its *content* a canonical structured shape, gave it a **document identity**, and made it **patient-readable** — without a parallel prescription store.

**What changed (6 files, additive):**

| File | Change |
|------|--------|
| `src/domain/prescription.ts` (**new**) | The canonical **`PrescriptionMedicine`** contract (superset of the legacy shape, backward compatible); **`DOSE_FREQUENCY`** + **`ADMINISTRATION`** vocabularies with clinical *and* patient labels; a tolerant `parseMedicines()`; and the shared **`formatMedicine(m, audience)`** render model. Pure/client-safe so editor and document share one formatter. Documents the lifecycle (A1) and the clinical-not-commercial guardrail (A10). |
| `src/services/document-service.ts` | Added the **`prescription` assembler** → an immutable, **RX-numbered** document snapshotting structured medicines + visit metadata (A7); returns `null` (no document) when there are no medicines. Included prescription in `ensureVisitDocuments`; excluded it from invoice-linkage. |
| `src/components/shared/documents/document-renderer.tsx` | Added **`PrescriptionBody`** — renders through the shared formatter with **patient language** (A6: "Three times daily", never "TDS"); registered the label + footer. One renderer for viewer and print. |
| `src/services/timeline-service.ts` | The "Prescription issued" entry now shows **"N medicines · RX-2026-XXXX"** and **deep-links to the issued document** (A8); prescription-type documents are **de-duplicated** from the generic document rows. |
| `src/components/doctor/prescription-editor.tsx` | Added a **live prescription preview** using the *same* `formatMedicine()` the printed document uses, in patient wording — so what the doctor sees equals what the patient receives (A4). |

**Backward compatibility (A9):** `parseMedicines()` accepts both the legacy `{name,dosage,frequency,duration}` and the structured superset; `medicineDrug`/`medicineStrength` read either. Proven by an automated test that generates a document + timeline entry from a legacy row.

**Tests:** `src/domain/prescription.test.ts` (7 pure) + prescription-document + timeline-enrichment integration tests. Full suite **632/632** (was 620; +12).

---

## 2. Demo Package

### Demo Story
During a consult the doctor adds **Amoxicillin 500 mg**, taps **TDS** and **after food**, sets **5 days**; the live preview immediately shows *"Amoxicillin 500 mg — Three times daily · After food · 5 days"* — exactly what the patient will read. A second drug comes from the **recently-prescribed** chips in one tap. On completing the visit, Auriva issues **Prescription RX-2026-0042** — a proper numbered document. It appears on the patient's **Timeline** ("2 medicines · RX-2026-0042 · Dr. Sharma" → one click opens it), in their **Documents**, and is ready for **C5** to send.

### Demo Checklist
1. Doctor consult → add medicines with frequency chips → watch the live preview render patient language.
2. Complete the visit → open the patient's Documents → a **Prescription (RX-…)** now exists.
3. Open it (`/print/document/[id]`) → patient-readable directions, clinic branding, version/number metadata → Print / Save as PDF.
4. Open the patient **Timeline** → "Prescription issued · N medicines · RX-…" → click → the same document (no duplicate row).
5. Open an **old** patient (legacy prescription) → still renders + generates a document (backward compatible).

### Screens changed
- Doctor Consult Workbench (`prescription-editor`) — live preview.
- Document viewer / print (`/print/document/[id]`) — renders the Prescription type.
- Patient/staff/doctor Timeline — enriched Rx entry.

### Backend capabilities
- `generateDocument("prescription", …)` / `ensureVisitDocuments` — RX-numbered immutable prescription.
- `domain/prescription` — canonical contract + dose vocabulary + shared formatter.

### Business value
The doctor's **primary clinical output** is now structured, patient-readable, and a governed document — reusable, numbered, timeline-linked, and ready to be delivered to patients in C5. This is where Auriva starts looking clinically mature rather than like generic appointment software.

---

## 3. QA / Test Package

| Suite | Coverage | Result |
|-------|----------|--------|
| **Functional** | Prescription document RX-numbered, Clinical, snapshots structured medicines + visit_id (A7) | ✅ automated |
| **Backward compat (A9)** | Legacy `{name,dosage,frequency,duration}` → parse → document → timeline all work | ✅ automated |
| **Empty guard** | No medicines → no prescription document (not an empty artifact) | ✅ automated |
| **Contract** | display_name (A2), separated frequency/administration (A3), patient vs clinical labels (A6), 1-0-1 notation, shared formatter (A4) | ✅ automated (7 unit) |
| **Timeline (A8)** | Rx entry shows count + RX number, deep-links to the doc, no duplicate document row | ✅ automated |
| **Regression** | Full suite 632/632 (existing ensure-set test updated to include prescription) | ✅ |
| **Permission** | Documents stay clinic-scoped; prescription reuses the same access path | ✅ unchanged |
| **Build / lint** | Production build + eslint clean | ✅ |

---

## 4. Known Limitations

1. **Editor captures a subset of the contract.** The consult editor writes `drug/strength/frequency/duration`; the richer optional fields (`form`, `route`, `administration`, `instructions`, `quantity`, `display_name`) exist in the **contract** and render when present, but the editor doesn't yet capture all of them. The preview and document honor whatever is set. *Additive follow-up — no data loss.*
2. **Interaction / allergy checking not present** (guardrail) — the editor still shows "verify interactions manually." This is a future *integration*, not a build.
3. **Curated Clinic Medicine catalog** deferred (+1 table) — quick-pick is the read-model of recent medicines for now.
4. **Prescription lifecycle states** (superseded/archived) are documented and mechanically supported by the Document Platform's versioning, but not yet surfaced as explicit UI states.

---

## 5. What's New in C4

**For Doctors** — Prescribe faster and see exactly what the patient will read as you type. Pick frequency (OD/BD/TDS) and timing instead of writing it out; reuse your common medicines in a tap. Every completed visit now produces a proper, numbered prescription.

**For Reception** — Every prescription is now a real document (RX-number) you can find, reprint, and hand over — alongside invoices and receipts, from the same place.

**For Patients** — Your prescription is written in plain language ("Three times daily, after food") and kept in your records as a proper document you can open any time.

**For Clinic Owners** — Your clinic's core clinical output is now structured and governed — consistent, reusable, and (next milestone) deliverable straight to patients. A visible step up in clinical maturity.

---

## 6. Platform Contracts Introduced

| Contract | Shape / rule | Stability |
|----------|--------------|-----------|
| **`PrescriptionMedicine`** | `{ drug, display_name?, strength?, form?, route?, frequency, administration?, duration?, instructions?, quantity? }` — superset of legacy `{name,dosage,frequency,duration}`; every surface reads/writes it | Canonical business object |
| **`DOSE_FREQUENCY` / `ADMINISTRATION`** | Enumerated dose terms, each with `clinical` + `patient` labels; frequency and administration are separate | Stable enums |
| **`formatMedicine(m, audience)`** | The single render model behind editor preview and printed document (A4) | Stable function |
| **`prescription` Document** | RX-numbered, immutable, versioned snapshot via the Document Platform; deep-linked from the Timeline | Extends the B3 + C3 contracts |

## 7. Canonical Business Object

**`PrescriptionMedicine`** — the doctor's structured treatment decision. Joins the platform vocabulary: `TreatmentPlan` (C1) · `TreatmentPlanSession` (C2) · `TimelineEntry` (C3) · **`PrescriptionMedicine` (C4)** · `CommunicationMessage` (C5, upcoming).

## 8. Milestone Summary Card

| | |
|---|---|
| **Milestone** | C4 — Prescription Platform |
| **Promise** | Every prescription, captured clearly — and reusable |
| **Operational question** | What treatment did the doctor decide — and can it be captured, printed, reused? |
| **Canonical object** | `PrescriptionMedicine` |
| **Shipped** | Structured medicine contract + dose vocabulary + shared formatter; RX-numbered immutable Prescription document; patient-language rendering; live editor preview; enriched, deep-linked timeline entry |
| **Architecture** | Enrichment — no new tables; Prescription model stays source of truth, document is its immutable snapshot |
| **Files** | 6 (1 new domain, 1 new domain test) |
| **Tests** | 632/632 pass (+12) · lint ✅ · build ✅ |
| **Deferred** | Full-contract capture in the editor · interaction checking (integration) · curated medicine catalog · explicit lifecycle UI |
| **Unlocks** | C5 (Communication) sends the prescription; Phase-4 analytics reads it |
| **Status** | ✅ **Approved** — Product Office (accepted) |

---

## 9. Business Rules Preserved (recorded per PO — new governance from C5)

- Prescription **model remains the source of truth**; the document is an immutable snapshot.
- The prescription **document is immutable** (regeneration → new version, prior superseded).
- **Preview equals print** — one shared `formatMedicine()`.
- **Patients never see clinical abbreviations** — patient-facing rendering translates codes.
- The structured contract stays **clinical, not commercial** (no SKU / stock / price / vendor).

## 10. Recorded future direction (per PO — not built)

- **Prescription Renewal** — distinguish *New Prescription* from *Repeat Previous Prescription* using the same `PrescriptionMedicine` contract. Future enhancement; not implemented now.
