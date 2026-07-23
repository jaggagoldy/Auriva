# Engineering Decision Log (EDR)

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Repository:** Auriva Healthcare Operating System (`healthcare-platform`)  
> **Purpose:** Architectural decision records documenting implementation choices, rationale, alternatives considered, and rejected paths during POE-001 delivery.

---

## DECISION RECORDS

### EDR-001: Reuse `AppointmentEvent` for 1-Click Check-in Audit Log
* **Requirement:** `REQ-REC-001` (1-Click Patient Check-in)
* **Decision:** Reused existing `AppointmentEvent` Prisma entity to record `checked_in` and `status_changed` activity timeline events inside the atomic transaction, along with `publishEvent` to `EventLog`.
* **Reason:** Preserves centralized appointment lifecycle audit architecture; avoids duplicate event tables.
* **Alternatives Considered:** Create a standalone `CheckInEvent` database table.
* **Rejected Reason:** The existing `AppointmentEvent` and `EventLog` models already handle transactional timeline logs and system-wide event bus publishing. Creating a new table adds redundant schema complexity.
* **Approved By:** AI Engineering Organization (CTO / Principal Architect)
* **Date:** 2026-07-23

---

### EDR-002: Auto-Matching Patient Profile in Rapid Walk-in Modal
* **Requirement:** `REQ-REC-002` (Rapid Walk-in Registration)
* **Decision:** Auto-match existing `PatientProfile` or `Contact` records by 10-digit mobile number during walk-in submission. If matched, attach `patient_id` directly; if new, provision `PatientProfile` and primary `Contact` atomically.
* **Reason:** Eliminates double-entry of patient records while achieving < 30s walk-in throughput target.
* **Alternatives Considered:** Require reception to search directory in a separate tab before opening walk-in form.
* **Rejected Reason:** Forces extra context switching and violates the 1-click zero-training reception principle.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-003: Priority Weight 100 for Emergency Queue Bypass
* **Requirement:** `REQ-REC-003` (Emergency Patient Queue Bypass & Priority Reordering)
* **Decision:** Use numerical priority weight `priority = 100` to force emergency appointments to position #1 in queue queries, preserving natural `queue_number` sequence for non-emergencies.
* **Reason:** Ensures deterministic position #1 placement across queue views while leaving token numbering intact.
* **Alternatives Considered:** Swap queue token numbers with position #1 patient.
* **Rejected Reason:** Token number swapping confuses patients waiting with printed physical tokens. Priority weighting reorders queue display without altering issued paper tokens.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-004: Atomic Token Re-indexing on Doctor Reassignment
* **Requirement:** `REQ-REC-004` (Drag-and-Drop Queue Reordering & Doctor Transfer)
* **Decision:** Re-assign a fresh sequential queue token when transferring an appointment to a target doctor, blocking transfers once consultation has started (`in_consultation`).
* **Reason:** Guarantees target doctor's queue token sequence remains continuous without gap or duplication.
* **Alternatives Considered:** Preserve original doctor's queue token number on target doctor's list.
* **Rejected Reason:** Preserving foreign tokens breaks sequential calling on target doctor's queue display.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-005: Atomic Invoicing Snapshot & Concession Re-calculation
* **Requirement:** `REQ-REC-005` (Instant 1-Click Cashier Checkout Workspace)
* **Decision:** Re-calculate net total via `regenerateInvoice` during checkout concessions and line removals, snapshotting the itemized breakdown into `Invoice.items_json` on receipt generation.
* **Reason:** Eliminates financial discrepancies between draft invoice lines, payment receipts, and ledger audit logs.
* **Alternatives Considered:** Store manual invoice line overrides in client state without updating `items_json`.
* **Rejected Reason:** Un-reconciled client state causes payment total mismatch and audit failures during financial settlement.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-006: Uninterrupted Single-Surface Consultation Charting
* **Requirement:** `REQ-DOC-001` (Uninterrupted Consultation Workbench Charting)
* **Decision:** Consolidate chief complaint, vitals, clinical notes, diagnosis, prescription, and procedure orders on a unified single-surface Consultation Workbench with auto-save draft persistence.
* **Reason:** Eliminates page reloads and tab navigation during patient consults, achieving < 60-second documentation target.
* **Alternatives Considered:** Multi-step wizard page navigation for consultation stages.
* **Rejected Reason:** Multi-step page reloads slow down doctor charting and increase friction during busy clinic hours.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-007: Structured Prescription JSON Snapshot & RX Document Generation
* **Requirement:** `REQ-DOC-002` (Structured Prescription Authoring & Printable Rx)
* **Decision:** Persist medicines as structured JSON (`prescription_medicines_json`) with explicit fields (`name`, `dosage`, `frequency`, `duration`), generating a immutable `RX-` numbered document snapshot upon consultation sign-off.
* **Reason:** Guarantees Rx readability, enables pharmacy integration, and preserves audit trail without relying on un-structured free-text fields.
* **Alternatives Considered:** Store prescription as free-text paragraph string.
* **Rejected Reason:** Free-text paragraphs cause dispensing errors and prevent clinical analytics or interaction checking.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-008: Automated Consultation Fee Invoicing & Visit Summary Generation
* **Requirement:** `REQ-DOC-003` (1-Click Consultation Sign-off & Automated Invoicing)
* **Decision:** Execute consultation status completion (`completed`), invoice creation, and visit summary document generation inside an event-sourced transaction on sign-off.
* **Reason:** Prevents orphaned un-billed visits and ensures clinical summary document (`VS-`) matches invoice charges atomically.
* **Alternatives Considered:** Require reception to create consultation invoice manually after doctor signs off.
* **Rejected Reason:** Manual invoicing introduces human omission errors and delays patient checkout.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-009: Time-Blocking Engine with Buffer Windows
* **Requirement:** `REQ-DOC-004` (Doctor Schedule & Date Time-Blocking Engine)
* **Decision:** Include doctor time-blocks and clinic `buffer_minutes` directly inside `SLOT_OCCUPYING_STATUSES` conflict evaluation during schedule queries.
* **Reason:** Prevents patient double-booking during doctor procedure or meeting windows across online and reception booking routes.
* **Alternatives Considered:** Evaluate time-block conflicts only in frontend date pickers.
* **Rejected Reason:** Client-side only validation allows race conditions when multiple receptionists book simultaneously.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23
