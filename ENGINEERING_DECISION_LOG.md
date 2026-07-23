# Engineering Decision Log (EDR)

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Repository:** Auriva Healthcare Operating System (`healthcare-platform`)  
> **Purpose:** Architectural decision records documenting implementation choices, rationale, alternatives considered, and rejected paths during POE-001 delivery.

---

## DECISION RECORDS

### EDR-001 through EDR-010 (Frozen Workstreams B1 & B2)
* **Status:** 🔒 FROZEN & CERTIFIED (`POE-001-RECEPTION-COMPLETE`, `POE-001-DOCTOR-COMPLETE`)

---

### EDR-011: Server-Assembled Role-Shaped Dashboard Payload
* **Requirement:** `REQ-OWN-001` (Owner Command Center Morning Operational Snapshot)
* **Decision:** Enforce server-side role resolution (`resolveDashboardRole`) and build payload slices strictly by role on the server, eliminating client-side feature hiding.
* **Reason:** Guarantees sensitive practice financial metrics (revenue, collections, invoice balances) are never sent to non-owner roles over HTTP.
* **Alternatives Considered:** Send full dashboard JSON to all users and hide financial tabs in UI.
* **Rejected Reason:** Client-side hiding leaks sensitive revenue data in browser dev tools.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23
