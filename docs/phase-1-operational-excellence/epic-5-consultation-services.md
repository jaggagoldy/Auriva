# Epic 5 — Consultation & Services

**Goal:** let a consultation capture everything that was *done* (services, procedures, investigations, treatments) so it flows cleanly into the record **and** the bill — all **compatible with the current architecture** (the `Service` model, first-class `Prescription`/`LabOrder`, the status machine), additive not a rewrite.
**Source audit:** [Doc 1](../product-office-audit/01-end-to-end-operational-workflow.md) §8–14, [Doc 3](../product-office-audit/03-doctor-workflow-deep-dive.md) §4, §11, [Doc 2](../product-office-audit/02-reception-workspace-deep-dive.md) §4.

> **Architecture note (verified):** a `Service` model + `/api/services` already exist, as do first-class `Prescription`, `LabOrder`, `TestRecommendation` models and `/api/clinic/templates`. Today's invoice is mostly the **consult fee** — the Services catalog isn't wired into the consult→invoice path. This epic connects what already exists.

---

## 5.1 — Wire the Services catalog into the consult → invoice line items

- **Business problem:** Invoices are essentially the consultation fee. Procedures, dressings, injections, and other **billable services performed during the visit aren't captured**, so that revenue leaks and the bill under-represents the visit.
- **User story:** *As a doctor (or receptionist at checkout), I want to add the services/procedures done in this visit so they appear on the invoice and in the record.*
- **Current workflow:** Consult completes → invoice drafts with the consult fee; services model exists but isn't added during the encounter.
- **Proposed workflow:** In the Workbench (and/or at Desk checkout), add **line items from the Services catalog**; each becomes an invoice line and a record entry. **Design decision (Product Office):** who adds them — doctor during consult, reception at checkout, or both?
- **UX rationale:** The bill reflects reality; nothing performed goes unbilled or unrecorded.
- **Business impact:** **High** — directly captures per-encounter revenue that currently leaks (the highest-value Epic 5 item).
- **Engineering complexity:** **Medium/High** — connect `Service` catalog → appointment/invoice line items; UX at consult and/or checkout.
- **Dependencies:** `Service` model + `/api/services` (exist); invoice service; **the ownership decision.**
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - Services from the catalog can be added to a visit (per the chosen ownership model).
  - Each added service becomes an invoice line item **and** a record entry.
  - Invoice total updates correctly; audit trail preserved.
  - Removing/editing a service before payment is supported; nothing changes post-payment without an explicit adjustment.

---

## 5.2 — Investigations & lab as a first-class, visible order loop

- **Business problem:** Lab ordering works, but the loop is thin — "recent labs" in the consult context panel reads "coming soon," and result display is basic. Investigations/procedures beyond lab aren't modeled as orders.
- **User story:** *As a doctor, I want to order investigations and see prior/returned results in the consult, and have them tracked and billable.*
- **Current workflow:** `POST /api/lab-orders` → worklist fulfils → result returns; context-panel "recent labs" is a placeholder.
- **Proposed workflow:** Surface prior/returned lab results in the Workbench context panel; make investigations orderable with the same order→fulfil→result→bill loop; results land in the patient vault with proper display.
- **UX rationale:** The consult becomes the single place to order and read investigations; closes the "coming soon" gap.
- **Business impact:** Medium/High — add-on revenue + clinical completeness.
- **Engineering complexity:** **Medium** — extend the existing LabOrder loop + result rendering.
- **Dependencies:** `LabOrder`/`TestRecommendation` (exist); patient vault (exists).
- **Recommended priority:** **P2.**
- **Acceptance criteria:**
  - The Workbench shows the patient's recent/returned lab results (no "coming soon").
  - Ordered investigations track order→resulted and appear in the vault.
  - Orderable investigations can be billed as line items (via 5.1).

---

## 5.3 — Consultation templates (SOAP) depth

- **Business problem:** Documentation is free-text; repeatable structure (SOAP, common complaints) speeds consults and improves record quality. Templates exist but shallowly.
- **User story:** *As a doctor, I want quick templates (SOAP, common conditions) to document faster and more consistently.*
- **Current workflow:** `chief_complaint`/`history_notes`/`diagnosis`/`prescription_notes` free-text; `/api/clinic/templates` exists.
- **Proposed workflow:** Richer template application (insert SOAP scaffolds, common-condition presets) in the Workbench, editable after insert.
- **UX rationale:** Faster documentation → shorter consults → more patients/day, with better records.
- **Business impact:** Medium — throughput + record completeness.
- **Engineering complexity:** **Medium** — extend template application UX over existing endpoints.
- **Dependencies:** `/api/clinic/templates` (exists).
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - Doctors can insert and edit SOAP/condition templates in the consult.
  - Templates are clinic-manageable.
  - Applying a template never overwrites existing entered text without intent.

---

## 5.4 — Structured clinical data (incremental, off the god table)

- **Business problem:** Clinical fields live on the `Appointment` row as free-text/JSON ([TD-18](../knowledge-base/25-technical-debt-register.md)). This limits analytics, decision support, and interoperability.
- **User story:** *As the platform, I want clinical data structured enough to power future analytics and (eventually) decision support, without a rewrite.*
- **Current workflow:** Complaint/history/vitals/diagnosis/prescription on the appointment; first-class `Prescription`/`LabOrder` already exist alongside.
- **Proposed workflow:** Incrementally normalize the highest-value fields (e.g. vitals, diagnosis coding) into structured models — additive migrations, no behaviour change — building on the first-class models already present.
- **UX rationale:** Invisible now; the foundation the AI/analytics future ([26](../knowledge-base/26-future-vision-3yr.md)) depends on.
- **Business impact:** Low now / High later — enables Stage 3+ of the vision.
- **Engineering complexity:** **High** — clinical-model normalization; sequence carefully.
- **Dependencies:** schema evolution; keep the god table working during migration.
- **Recommended priority:** **P2.**
- **Acceptance criteria:**
  - At least one high-value field (e.g. vitals) is structured additively without breaking the current consult.
  - No regression to documentation UX.
  - A documented path for the remaining fields.

---

## 5.5 — Follow-up & care plan *(delivery platform-gated)*

- **Business problem:** `follow_up_date` is captured but does nothing proactively — no reminder, no care-plan summary for the patient ("take medicine 5 days · follow-up in 7").
- **User story:** *As a patient, I want a clear after-visit summary and a follow-up reminder so I know what to do next.*
- **Current workflow:** Follow-up date stored; surfaced passively; no delivery.
- **Proposed workflow:** An after-visit care summary in the patient app now (in-app), and follow-up reminders **when the notification platform exists**.
- **UX rationale:** The "After the Visit" moment — one of the most memorable trust builders (noted in PKG-5 as deferred).
- **Business impact:** Medium — adherence, retention, trust.
- **Engineering complexity:** **Medium** in-app; delivery **blocked** on [TD-04](../knowledge-base/25-technical-debt-register.md).
- **Dependencies:** **Notification delivery platform (missing)** for reminders; in-app summary can ship independently.
- **Recommended priority:** **P2 (partly blocked).**
- **Acceptance criteria:**
  - An in-app after-visit summary shows medicines, follow-up date, and "need help? call the clinic."
  - Reminder delivery deferred until the platform exists; the in-app summary works without it.

---

## Epic 5 summary

| ID | Improvement | Complexity | Priority |
|---|---|---|---|
| 5.1 | Services/procedures → invoice line items | M/H | **P1** |
| 5.3 | Consultation templates (SOAP) | M | **P1** |
| 5.2 | Investigations & lab loop depth | M | **P2** |
| 5.4 | Structured clinical data | H | **P2** |
| 5.5 | Follow-up & care plan | M | **P2 (part-blocked)** |

**The decision that shapes this epic:** **who adds services to a visit** (5.1) — doctor, reception, or both. It determines the consult and checkout UX and should be settled before Wave 2.
