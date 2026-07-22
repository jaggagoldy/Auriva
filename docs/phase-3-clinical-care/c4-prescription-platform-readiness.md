# C4 — Prescription Platform — Engineering Readiness

> **Process v3.0 · Step 1.** Concise readiness for Product-Office approval. **No code until approved.**
> **Customer Promise:** *"Every prescription, captured clearly — and reusable."* · Phase 3 · Milestone C4 · ~1–2 sprints.
> **Operational question:** *"What treatment did the doctor decide — and can it be captured cleanly, printed properly, and reused?"*
> **Canonical Business Object:** `PrescriptionMedicine` (new PO rule — every milestone names the object it establishes in Auriva's shared vocabulary).

## Why now?
- **Why needed now:** a prescription today is **free text** — medicines are a loose JSON blob (`name/dosage/frequency/duration`), typed fresh every visit, and the prescription is **not a real document** the way an invoice is (no number, no immutable snapshot, not in the Document registry). Doctors retype the same common drugs; patients get a printout that isn't a governed artifact.
- **Why before the next milestone:** **C5 (Communication)** delivers artifacts *to patients* ("here is your prescription" over SMS/WhatsApp/email). It can only send a prescription that is a real, **numbered, immutable Document** — so C4 must make it one first.
- **What capability it unlocks:** fast **structured prescribing** (pick, don't type), a proper **numbered Prescription document** that unifies with invoices/visit-summaries, and **reuse** of what the doctor commonly prescribes.
- **What future milestone depends on it:** **C5** sends it; **Phase-4 analytics** ("most-prescribed", formulary insight) reads it; the **patient app** surfaces it as a first-class record.

## Scope (IN)
1. **Structured medicine line** — formalise the medicine object into a validated shape: `drug · strength · form? · route? · frequency · duration · instructions? · quantity?`, **backward compatible** with the existing `{name, dosage, frequency, duration}` (old rows still parse). Stored in the existing `medicines_json` — richer content, same column.
2. **India-centric dose vocabulary** — doctors **pick** a frequency (OD · BD · TDS · QID · HS · SOS · STAT · Q_H) and food timing (before/after food) instead of typing prose; a domain constant, human-labelled ("BD — twice daily").
3. **Structured Rx editor** in the Consult Workbench — per-medicine rows with drug + strength + frequency chips + duration + instructions, and a **live prescription preview**. Upgrades the existing prescription field; no new consult surface.
4. **Recent-medicines quick-pick** — surface the medicines *this doctor/clinic has recently prescribed* as one-tap chips. A **read-model over existing prescriptions** (no new table) — the same "reuse existing data, don't build a parallel system" discipline as C1–C3.
5. **Issued Prescription Document** — on visit completion with a prescription, generate an immutable, **RX-numbered** Prescription document via the **existing Document Platform** (the `prescription` type is already declared with an `RX` prefix — C4 adds its *builder*). This unifies the prescription with invoices/receipts/visit-summaries: unified numbering, versioned regeneration, `/print/document/[id]`, patient Documents tab.
6. **Timeline + patient app wiring** — the C3 "Prescription issued" entry deep-links to the issued **document**; the patient app shows the prescription among their records.

## Out of scope (deferred / guardrail)
- **Drug–drug interaction / allergy checking** — clinical-safety with real liability. **Integration, not a build** (Auriva is not a clinical decision-support engine). Recorded for a future *integration*, not this milestone.
- **Pharmacy inventory / dispensing / stock** — **RED FLAG** (not Auriva's domain). Explicitly excluded.
- **E-prescribing transmission** to external pharmacies / national exchanges — an integration, post-MVP.
- **Controlled-substance / regulatory compliance** workflows (schedule tracking, mandatory registers) — jurisdiction-specific, later.
- **Comprehensive national drug master DB** — C4 ships a lightweight *recent-medicines* quick-pick, not a licensed formulary. A **curated Clinic Medicine catalog** (a manageable per-clinic favourites list, +1 table) is a recorded **future enhancement**, not this milestone.

## Architecture
Same discipline as C1–C3: **enrich the existing capability, don't fork it.** The prescription already has a home (`Prescription` model, written through `updateClinicalRecord`). C4 (a) makes its *content* structured (richer `medicines_json`, backward compatible), (b) gives it a **document** identity through the Document Platform (add one builder to the existing `BUILDERS` map), and (c) makes prescribing *fast* via a read-model quick-pick. **No new persistence layer, no parallel prescription store.**

## Integrates With
Consultation / Clinical Record (writes the prescription) · **Document Platform (B3)** — numbered immutable snapshot + versioning + print · **Clinical Timeline (C3)** — deep-links to the issued document · **Patient App** — Records/Documents · **Treatment Planning (C1)** — a plan-session consult prescribes through the same editor · **C5 Communication (next)** — sends the issued document.

## Platform Contracts Introduced
> New standard (per PO, from C4 onward): the stable interfaces future milestones build on, vs. internal detail.

| Contract | Shape / rule | Stability |
|----------|--------------|-----------|
| **`PrescriptionMedicine`** | `{ drug, strength?, form?, route?, frequency, duration?, instructions?, quantity? }` — the canonical medicine line every surface (editor, print, document, timeline) reads/writes; **superset** of the legacy `{name,dosage,frequency,duration}` (old rows valid) | Stable platform type |
| **`DOSE_FREQUENCY` vocabulary** | Enumerated dose patterns (OD/BD/TDS/QID/HS/SOS/STAT/Q_H) + food timing, each with a human label; the allowed frequency values | Stable enum |
| **`prescription` Document** | RX-numbered, immutable, versioned snapshot via the Document Platform — joins the **B3 document contract** and the **C3 deep-link contract** (timeline → prescription document, one click) | Stable — extends existing contract |

## Database
**None (target).** Structured medicines live in the existing `medicines_json` (richer shape, backward compatible); the quick-pick is a read-model; the document reuses the existing `Document` table and the already-declared `prescription` type. A **curated Clinic Medicine catalog** (+1 table) is explicitly deferred. → **No migration.**

## Backend
- `domain/prescription.ts` (new, small): `PrescriptionMedicine` type + `DOSE_FREQUENCY` vocabulary + a tolerant `parseMedicines()` (accepts legacy + structured) + `formatMedicine()` for print/preview.
- `document-service.ts`: add a **`prescription` builder** to `BUILDERS` (snapshots patient/doctor/clinic branding + the structured medicines + advice + follow-up); include it in `ensureVisitDocuments` so a prescription document is issued on completion when medicines exist.
- `prescription-service.ts` (new, thin): `getRecentMedicines(clinicId, doctorId)` read-model (distinct recent medicines for quick-pick); `getPrescriptionDocument(appointmentId)` accessor. Writing still flows through the existing `updateClinicalRecord`/consultation path — **unchanged**.
- Timeline: point the prescription entry's `link` at the issued document when one exists (deep-link contract).

## Frontend
- **Structured Rx editor** in the Consult Workbench: medicine rows (drug · strength · frequency chips · duration · instructions), quick-pick chips of recent medicines, live preview. Replaces the free-text medicines field in place.
- **Prescription document** reuses `/print/document/[id]` (no new print route); appears in the patient **Documents** list and deep-links from the Timeline.

## Risks
- **Backward compatibility** of `medicines_json` — the top risk. Mitigation: `parseMedicines()` accepts both legacy and structured; a golden test over old-shape rows.
- **Double source (Prescription model vs. issued Document)** — mitigation: the **Prescription model stays the source of truth**; the Document is an *immutable snapshot at completion* (same pattern as invoices), never edited independently.
- **Scope creep toward clinical-safety / pharmacy** — mitigation: the guardrail exclusions above are explicit; interaction-checking and dispensing are integrations, not builds.
- **Editor complexity vs. speed** — a structured editor can slow a doctor down; mitigation: quick-pick + sensible defaults so the common case is one tap.

## Demo Story
> During a consult the doctor adds a medicine: types "Amoxicillin", picks **500 mg**, taps **TDS · after food**, sets **5 days** — the live preview shows the full line. A second drug comes straight from the **recent-medicines quick-pick** in one tap. On completing the visit, Auriva issues **Prescription RX-2026-0042** — a proper numbered document. It appears on the patient's **Timeline** (one click → the prescription), in their **Documents**, and is ready for **C5** to send them a copy.

## PO Amendments (approved — incorporated in the build)
1. **Prescription lifecycle** documented — draft → saved-during-consult → issued → superseded(future) → archived(future); only the *issued document* is immutable, the Prescription model stays source of truth (`domain/prescription.ts` header).
2. **`display_name`** added to the medicine contract; the UI reads it, never an internal drug id.
3. **Frequency and administration separated** — two distinct fields (`frequency` = OD/BD/TDS…, `administration` = before/after food).
4. **Preview === print** — one shared `formatMedicine()` behind both the editor's live preview and the printed document (identical rendering, not approximate).
5. **Recent-medicines** quick-pick is a read-model (already frequency-ranked in the workbench); recency tie-break noted.
6. **Patient language** — patient-facing rendering shows "Three times daily", "At bedtime" (the contract keeps codes; presentation differs).
7. **Document metadata** — the prescription snapshot carries visit_id + doctor + clinic + issued time + version + RX number.
8. **Timeline** entry enriched — "N medicines · RX-2026-XXXX · Dr. …", deep-linking to the issued document (and de-duplicated from the generic document row).
9. **QA golden path** — a legacy `{name,dosage,frequency,duration}` row opens, saves, generates a document, and appears on the timeline (automated).
10. **Guardrail recorded** — the medicine contract is *clinical, not commercial* (no SKU / stock / price / vendor; those belong to a future Pharmacy module).

**New PO rule adopted (effective C4):** every readiness names its **Canonical Business Object** (see header). These objects (TreatmentPlan · TreatmentPlanSession · TimelineEntry · **PrescriptionMedicine** · CommunicationMessage) are Auriva's shared vocabulary.

---
**STOP — awaiting Product Office approval of this readiness before implementation.** On approval I build the entire C4 milestone, then deliver the full Process v3.0 package (Completion Report · Demo · QA · Known Limitations · "What's New in C4" · **Platform Contracts Introduced** · Milestone Summary Card · Release Dashboard update) and stop for review.
