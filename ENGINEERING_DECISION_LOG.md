# Engineering Decision Log (EDR)

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Repository:** Auriva Healthcare Operating System (`healthcare-platform`)  
> **Purpose:** Architectural decision records documenting implementation choices, rationale, alternatives considered, and rejected paths during POE-001 delivery.

---

## DECISION RECORDS

### EDR-001 through EDR-013 (Frozen Workstreams B1, B2, & C1)
* **Status:** 🔒 FROZEN & CERTIFIED (`POE-001-RECEPTION-COMPLETE`, `POE-001-DOCTOR-COMPLETE`, `POE-001-OWNER-COMPLETE`)

---

### EDR-014: Capability-Based Staff Grant Engine & Conflict Re-assignment
* **Requirement:** `REQ-TEA-001` (Staff Directory & Capabilities Assignment Engine)
* **Decision:** Scoped grantable staff capabilities to operational roles (`reception`, `doctor_workspace`), and enforce automatic active appointment re-assignment prior to archiving a staff member.
* **Reason:** Prevents orphaned appointments assigned to archived staff members and keeps org owner permissions non-transferable.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-015: Phone-First Staff Invitation Token Engine with 72h Expiry
* **Requirement:** `REQ-TEA-002` (Phone-First Staff Invitation & Onboarding Lifecycle)
* **Decision:** Use 10-digit mobile number as staff invitation identifier with cryptographic 72-hour single-use token generation (`createInvitation`), enforcing subscription seat limits server-side.
* **Reason:** Aligns with Indian healthcare practice mobile identity patterns and prevents over-inviting beyond paid plan seat ceilings.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23
