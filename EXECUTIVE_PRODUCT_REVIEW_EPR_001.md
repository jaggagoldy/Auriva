# Executive Product Review & Approval Gate (EPR-001)

> **Document Classification:** Executive Gate Review & Funding Authorization  
> **Review Target:** Practice Operations Excellence (POE-001) Milestone & `POPS-001`  
> **Review Date:** Current Release Baseline (July 2026)  
> **Convening Authority:** Executive Product Review Board  
> **Final Recommendation:** 🟢 **APPROVE WITH CONDITIONS** (Overall Board Score: **9.2 / 10**)

---

## 1. EXECUTIVE REVIEW BOARD & SCORECARD

The Executive Product Review Board convened to challenge every assumption in `POPS-001`, `POE_SCREEN_FUTURES_DECISION_MATRIX.md`, and `PRACTICE_OPERATIONS_BASELINE_REPORT.md` before authorizing BRD drafting.

| Board Member Role | Panel Representative | Score (1-10) | Primary Recommendation & Verdict |
|---|---|---|---|
| **Chief Product Officer (Chair)** | Institutional CPO | **9.5 / 10** | **Approve with Conditions.** Shifting to `Workspace → Role → Task` and consolidating 5 apps into 4 functional hubs solves the fragmented user experience. |
| **VP Product** | Head of SaaS Products | **9.0 / 10** | **Approve.** Sequencing Workstream A (Foundation) before B & C guarantees high UX quality. |
| **Director of UX** | Principal Design Systems Lead | **9.5 / 10** | **Approve.** Design System v2 guidelines and the "One Question Per Screen" rule create a top-tier healthcare aesthetic. |
| **Healthcare Operations Consultant**| Outpatient OPD Specialist | **9.0 / 10** | **Approve.** Target check-in under 20s and automated consultation-to-invoice generation solve real OPD bottlenecks. |
| **SaaS Strategy Consultant** | Commercial Growth Director | **9.2 / 10** | **Approve.** 1-click cashier checkout and prepaid/postpaid billing gates eliminate unbilled revenue leakage. |
| **Chief Technology Officer (CTO)** | Principal Architect | **9.0 / 10** | **Approve.** Decoupling the IA hub model from physical URL routes mitigates deep-link breakages and routing migration risk. |
| **Engineering Director** | Delivery Lead | **8.8 / 10** | **Approve with Conditions.** Must enforce strict scope boundaries on Leave Engine (OPS-002) to prevent schedule complexity creep. |
| **Practice Owner Representative** | Solo Practice Owner | **9.5 / 10** | **Approve.** The 2-minute Morning Snapshot in the Owner Command Center is exactly what clinic owners need. |
| **Head Receptionist Representative** | Senior Front-Desk Manager | **9.5 / 10** | **Approve.** Emergency patient bypass and drag-and-drop queue management resolve front-desk stress. |
| **Senior Doctor Representative** | Consultant Physician | **9.0 / 10** | **Approve.** Uninterrupted clinical flow and under 60-second consultation charting match clinical reality. |
| **SaaS Investor / Board Member** | Principal VC Partner | **9.2 / 10** | **Approve.** Evolution and simplification over building 20 new unproven modules maximizes capital efficiency and retention. |

---

## 2. EVALUATION ACROSS 10 STRATEGIC CATEGORIES

### 2.1 Vision Alignment
The POE-001 milestone perfectly aligns with Auriva’s core product bible: giving the consultation room and practice operations back to doctors and staff. It focuses on refinement, de-duplication, and operational calm rather than bloated feature expansion.

### 2.2 Market Fit
The target user is the independent outpatient clinic, single-specialty practice, and multi-doctor OPD group in India. POE-001 directly addresses high walk-in volumes, family phone sharing, cash/UPI payment collection, and rapid front-desk throughput.

### 2.3 Competitive Positioning

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 COMPETITIVE LANDSCAPE EVALUATION                                 │
├───────────────────┬───────────────────────────────────┬──────────────────────────────────────────┤
│ Competitor        │ Competitor Approach / Weakness    │ Auriva POE-001 Differentiating Edge      │
├───────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ **Practo Ray**    │ Lead-gen marketplace focus; clinic│ Pure clinic operating system; owner owns │
│                   │ is a node in someone else's funnel│ patient data; zero marketplace extraction│
├───────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ **HealthPlix**    │ Heavy focus on EMR data entry & AI│ Balanced encounter-to-cash ledger; zero  │
│                   │ prescription generation           │ revenue leakage at checkout              │
├───────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ **Cliniko / Jane**│ Built for Western insurance &     │ Built for Indian OPD reality: walk-ins,  │
│                   │ appointment-only allied health    │ UPI payments, family profile links       │
├───────────────────┼───────────────────────────────────┼──────────────────────────────────────────┤
│ **Hospital ERPs** │ Massive, complex HRMS/ERP suites  │ Zero-training front desk; productive in  │
│                   │ requiring months of deployment    │ 15 minutes; zero unnecessary modules     │
└───────────────────┴───────────────────────────────────┴──────────────────────────────────────────┘
```

### 2.4 Workflow Quality
* **Reception:** Check-in time drops from 90s to < 20s. Drag-and-drop queue and 1-click checkout eliminate front-desk bottlenecks.
* **Doctor:** Consultation sign-off automatically drafts invoices; side drawers preserve medical history context without page switches.
* **Owner:** Morning review takes < 2 minutes via the unified Command Center.

### 2.5 UX & Design System v2
* Adherence to two anchors: **Pine Teal (`#0B4A41`)** for clinical efficiency and **Honey Amber (`#E8A24C`)** for patient warmth.
* Comfortable density, standardized `Outfit`/`Inter` typography, shimmer loading skeletons, and strict adherence to the **"One Question Per Screen"** rule.

### 2.6 Information Architecture & Routing Governance
* **Approval of IA Hubs:** Operations, Clinical, Finance, and Management establish a clean conceptual hierarchy.
* **Approval of URL Decoupling:** Decoupling physical URLs (`/staff`, `/doctor`, `/clinic`) from conceptual IA hubs removes delivery risk, keeps existing bookmarks intact, and gives engineering implementation flexibility.

### 2.7 Commercial Value & Retention
* Eliminating post-consultation revenue leakage via automated `ServiceEvent` invoicing directly increases clinic collection rates.
* Lowering receptionist onboarding time to 15 minutes reduces churn when clinic staff turnover occurs.

### 2.8 Engineering Feasibility & Scope
* Reuses existing Postgres/Prisma schemas (`Appointment`, `ServiceEvent`, `Invoice`, `Document`, `EventLog`).
* Workstream sequencing (A ➔ B ➔ C) ensures core components exist before complex dashboards are built.

### 2.9 Delivery & Adoption Risks
* Primary risk: Over-complicating leave management (OPS-002). Mitigated by restricting Scope to basic doctor leave requests and holiday date overrides in Sprint 1.

### 2.10 Scope Trimming & Simplification
* Confirmed merging of 5 duplicate views (Owner Today, Owner Payments, Reception Dashboard, Staff Patient Profile, Patient Family & You).

---

## 3. TOP 20 SYSTEMIC & DELIVERY RISKS

1. **OPS-002 Scope Creep:** Risk of expanding leave management into a full HRMS. *(Mitigation: Limit to date-range slot suppression only).*
2. **Multi-Clinic State Confusion:** Staff switching clinic branches mid-checkout. *(Mitigation: Lock cashier modal to invoice clinic ID).*
3. **Queue Reordering Race Conditions:** Concurrent reordering by reception and doctor. *(Mitigation: Optimistic locking on queue position).*
4. **Prepaid Hard Gate Lockout:** Blocking urgent clinical access. *(Mitigation: Mandatory doctor override toggle).*
5. **Over-dense Workbench UI:** Cramming too many vitals fields on mobile. *(Mitigation: Progressive disclosure drawers).*
6. **Command Palette Performance:** Heavy patient lookup latency over 10,000 records. *(Mitigation: Server-side debounced search).*
7. **Offline Status Desync:** Local queue actions taken while disconnected. *(Mitigation: Queue event replay queue).*
8. **Multi-Invoice Settlement Drift:** Partial payments resulting in orphaned ledger states. *(Mitigation: Immutable invoice lines).*
9. **Doctor Availability Overlap:** Overlapping time blocks and recurring availability. *(Mitigation: Strict interval union math).*
10. **Draft Invoice Litter:** Unfinished checkout sessions cluttering billing lists. *(Mitigation: Automated 24h draft cleanup alert).*
11. **Breakdown of 1-Tap Workflow:** Adding mandatory text fields to quick check-in. *(Mitigation: Optional notes modal).*
12. **Notification Event Flooding:** Event bus firing duplicate patient SMS triggers. *(Mitigation: Idempotent source event constraint).*
13. **Role Permission Over-Granting:** Capability grants overriding safety checks. *(Mitigation: Centralized `authorization.ts` validator).*
14. **Custom Service Pricing Drift:** Ad-hoc prices corrupting financial reports. *(Mitigation: Mandatory `needs_catalog_review` flag).*
15. **Patient Family Profile Confusion:** Dependents booking under parent account. *(Mitigation: Explicit profile picker at step 1).*
16. **Print Stylesheet Inconsistency:** Prescriptions rendering poorly on thermal printers. *(Mitigation: Dedicated `@media print` CSS).*
17. **Demo Reset Data Leaks:** Accidental resetting of production tenant data. *(Mitigation: Hard DB check for `is_demo = true`).*
18. **Unread Badge Desync:** What's New bell count mismatch. *(Mitigation: `ReleaseView` composite unique index).*
19. **Excessive Toast Notifications:** Stacking multiple success toasts on visit completion. *(Mitigation: Toast deduplication).*
20. **Mobile Navigation Overlap:** Bottom navbar covering primary action buttons. *(Mitigation: Explicit safe padding `pb-16`).*

---

## 4. TOP 20 PRODUCT & ARCHITECTURE STRENGTHS

1. **Unified Status Machine:** Single `Appointment` state machine across all roles.
2. **Atomic Billing Ledger:** `ServiceEvent` snapshots prevent historical price corruption.
3. **Immutable Document Platform:** JSON document snapshots ensure legal reprint fidelity.
4. **URL Decoupling Governance:** IA hubs decoupled from physical route paths.
5. **Adaptive Workspace Shell:** Single entry point dynamically rendering role capabilities.
6. **One Question Per Screen Rule:** Absolute operational clarity on primary pages.
7. **Pine & Honey Design System:** Semantic visual contrast between clinical efficiency and patient warmth.
8. **Resilient 3-Tier Error States:** Graceful degraded states for offline and loading scenarios.
9. **Event Bus DLQ & Replay:** Robust event processing with manual retry capabilities.
10. **Prepaid/Postpaid Policy Engine:** Flexible clinic-level financial gate configuration.
11. **Family Profile Linking:** Multiple healthcare profiles linked to one mobile login.
12. **Doctor Time Blocking:** Date-specific slot suppression for personal breaks.
13. **Treatment Plan Subscriptions:** Multi-session care courses billed per attendance.
14. **Compensating Financial Ledger:** Immutable paid invoices with `CreditNote` and `Refund` tracking.
15. **Global Command Palette:** Instant keyboard navigation across all records (`Cmd+K`).
16. **Clinical Templates:** SOAP note presets for rapid doctor charting.
17. **Diagnostic Test Catalog:** 50+ pre-seeded lab tests with patient preparation notes.
18. **Shared Reception Calendar:** Multi-doctor schedule grid with availability overlays.
19. **Zero-Training Reception Board:** Visual stage cards requiring zero training.
20. **Multi-Clinic Entity Architecture:** Clean parent `Organization` and branch `Clinic` structure.

---

## 20 RECOMMENDED SIMPLIFICATIONS

1. Merge Owner Today (`/clinic` - Today) into Reception Queue (`/staff/queue`).
2. Merge Owner Payments (`/clinic` - Payments) into Billing Desk (`/staff/billing`).
3. Merge Reception Dashboard (`/staff/dashboard`) into Owner Command Center (`/clinic/command-center`).
4. Merge Staff Patient View (`/staff/patients/[id]`) into Doctor Patient Record (`/doctor/patients/[id]`).
5. Consolidate Patient Family (`/patient/family`) and Account (`/patient/you`) into `/patient/account`.
6. Consolidate Practice, Team, and Plan settings into one tabbed `/clinic/settings` sidebar view.
7. Remove duplicate "Book Appointment" buttons from top headers when primary page CTA exists.
8. Simplify Walk-in Modal to 2 input fields (Name, Phone) with auto-matching.
9. Replace multi-step consultation checkout with a single 1-click cashier popup.
10. Standardize all status badges across staff and patient views using semantic design tokens.
11. Eliminate standalone "Today's Revenue" cards in favor of the unified Owner Command Center header.
12. Replace generic loading spinners with layout-matching shimmer skeletons.
13. Consolidate duplicate patient search bars in headers into the global Command Palette (`Cmd+K`).
14. Remove unused legacy appointment JSON columns in favor of relational `Prescription` tables.
15. Simplify doctor time-blocking form to quick duration presets (30m, 1h, Half Day, Full Day).
16. Standardize print actions across Prescriptions, Invoices, and Summaries using `DocumentRenderer`.
17. Collapse secondary sub-navigation tabs into clean horizontal segment pickers on mobile.
18. Remove manual queue priority input fields in favor of 1-tap "Emergency Bypass" buttons.
19. Consolidate staff role assignment into a single capability grant checklist.
20. Replace raw error boundary screens with friendly 1-click "Reload Workspace" cards.

---

## 20 HIGH-VALUE MISSING OPPORTUNITIES

1. **Dynamic UPI QR Display:** Displaying instant UPI QR codes on the cashier desk screen.
2. **WhatsApp Appointment Reminders:** Integrating direct WhatsApp notification dispatch for upcoming visits.
3. **Queue Wait-Time Estimator:** Auto-calculating estimated wait time based on average doctor consult duration.
4. **Emergency Priority Bypass:** 1-tap button to move trauma/emergency cases to the top of the queue.
5. **Doctor Shift Swapping:** Allowing doctors to request shift swaps with approval by reception.
6. **Auto-Scheduling Follow-ups:** Automatically booking follow-up dates when signed on prescriptions.
7. **Patient Report Upload Parsing:** Allowing patients to attach lab PDFs directly to recommended tests.
8. **Cashier Split Payments:** Support for partial cash + partial UPI payments on a single invoice.
9. **Doctor Consultation Timer:** Subtle timer on workbench showing active visit duration.
10. **Recent Patient Quick Pills:** Chips displaying recently viewed patients in global search.
11. **Keyboard Shortcuts Cheat Sheet:** Modal displaying `Cmd+K`, `Cmd+S`, `Cmd+P` shortcuts (`?` key).
12. **Clinic Holiday Calendar:** Multi-day holiday picker that pauses online bookings automatically.
13. **Doctor Daily Capacity Cap:** Auto-closing online slots once a doctor reaches max daily patients.
14. **1-Click Repeat Prescription:** Copying previous prescription medicines into a new visit with 1 click.
15. **Uncollected Bill Counter Badge:** Visual badge on the navbar highlighting pending cashier collections.
16. **Patient Portal Health Summary Share:** 1-click shareable link for patient health summaries.
17. **Receptionist Quick Note:** Adding operational desk notes ("Patient in wheelchair") to queue cards.
18. **Doctor Fee Override Warning:** Alerting reception if custom consultation fee differs from catalog.
19. **Audit Trail Drawer:** Quick slide-over drawer showing recent staff audit logs for an appointment.
20. **Dark Theme High-Contrast Mode:** Enhanced contrast toggle for low-light clinical environments.

---

## 7. FEATURE SCOPE DECISION REGISTER

### Features Approved for POE-001 (Prioritized)
* **Workstream A:** Adaptive Workspace Shell, Design System v2, Command Palette (`Cmd+K`), IA Consolidation.
* **Workstream B:** Drag-and-drop Reception Queue, Emergency Bypass, 1-Click Cashier Checkout, Doctor Leave Engine (OPS-002 Lite), Doctor Time Blocks, Expanded Team Operations.
* **Workstream C:** Owner Command Center (Morning Snapshot), Operational Intelligence KPIs (Wait times, doctor utilization, reception throughput).

### Features Deferred to Future Milestones
* Full Insurance & Claims Processing (Out of scope for Indian cash/UPI OPD market).
* Native Mobile iOS/Android Apps (Web app responsive PWA remains current target).
* AI Diagnostic Guidance / Auto-Prescribing (Deferred per Product Bible safety rules).
* Multi-Branch Inventory & Pharmacy Management (Deferred to post-POE-001 release).

---

## 8. FINAL FUNDING AUTHORIZATION & BOARD VERDICT

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                EXECUTIVE BOARD FUNDING VERDICT                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                 🟢 APPROVED WITH CONDITIONS                                      │
│                                   (Overall Score: 9.2 / 10)                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CONDITIONS FOR FREEZING BRD-POE-001:                                                             │
│ 1. Workstream A (Experience Foundation) MUST be implemented before Workstream B & C.             │
│ 2. Physical URL routes remain flexible engineering choices (URL Decoupling Governance).         │
│ 3. Leave Engine (OPS-002) must be constrained to slot suppression without HRMS bloat.            │
│ 4. All 5 duplicate screens identified in Section 5 MUST be merged during POE-001.               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> **Authorization:** The Product Office is hereby authorized to freeze `POPS-001` and proceed immediately to authoring **`BRD-POE-001` (Business Requirements Document)**.
