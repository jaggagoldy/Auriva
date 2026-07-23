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
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-012: Real-time Ledger Aggregation for Operational KPIs
* **Requirement:** `REQ-OWN-002` (Real-time Operational Intelligence & Practice KPIs)
* **Decision:** Compute operational KPIs directly from event-sourced `Invoice` and `Payment` ledgers using `billingDaySummary`, avoiding stored aggregate summary tables.
* **Reason:** Guarantees KPI accuracy and eliminates data drift or cache invalidation bugs.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23
