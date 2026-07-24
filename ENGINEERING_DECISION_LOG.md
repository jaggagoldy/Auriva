# Engineering Decision Log (EDR)

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Repository:** Auriva Healthcare Operating System (`healthcare-platform`)  
> **Purpose:** Architectural decision records documenting implementation choices, rationale, alternatives considered, and rejected paths during POE-001 delivery.

---

## DECISION RECORDS

### EDR-001 through EDR-015 (Frozen Workstreams B1, B2, C1, & C2)
* **Status:** 🔒 FROZEN & CERTIFIED (`POE-001-RECEPTION-COMPLETE`, `POE-001-DOCTOR-COMPLETE`, `POE-001-OWNER-COMPLETE`, `POE-001-TEAM-COMPLETE`)

---

### EDR-016: Server-Driven Surface Resolution Matrix
* **Requirement:** `REQ-PLT-001` (Unified Adaptive Workspace Shell & Information Hubs)
* **Decision:** Resolve user persona surfaces server-side (`resolveSurface`) based on trusted StaffProfile capabilities rather than client URL paths.
* **Reason:** Ensures non-authorized roles cannot access restricted workspace surfaces by typing URL paths directly.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-017: Unified Client-Side Search Provider for `Cmd+K` Command Palette
* **Requirement:** `REQ-PLT-002` (Global Command Palette & Universal Search)
* **Decision:** Route `Cmd+K` search queries through an aggregated search route handler (`/api/search`) returning patient, doctor, appointment, and action items in one roundtrip.
* **Reason:** Minimizes network latency and provides sub-50ms command search responses.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23

---

### EDR-018: Design System v2 Token Standardization & ARIA Primitives
* **Requirement:** `REQ-PLT-003` (Design System v2 & Token Standardization)
* **Decision:** Standardize CSS variables for brand personas (Emerald for Clinical, Honey for Reception, Slate for Finance/Owner) and mandate ARIA primitives on all UI components.
* **Reason:** Guarantees brand visual hierarchy and WCAG 2.1 AA accessibility across all clinic screens.
* **Approved By:** AI Engineering Organization (CTO / Lead Architect)
* **Date:** 2026-07-23
