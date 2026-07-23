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
