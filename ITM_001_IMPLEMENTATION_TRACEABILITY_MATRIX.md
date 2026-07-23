# Implementation Traceability Matrix (ITM-001)

> **Document Classification:** Engineering & Delivery Governance  
> **Milestone Target:** **Practice Operations Excellence (POE-001)**  
> **Governing BRD:** `BRD-POE-001`  
> **Purpose:** 1:1 mapping of every BRD requirement through Epics, User Stories, UI Screens, API Routes, Database Entities, Test Cases, and Delivery Status.  
> **Status:** 🔒 ACTIVE DELIVERY TRACEABILITY MATRIX

---

## 1. TRACEABILITY MATRIX TABLE

| Requirement ID | Epic & Chapter | Requirement Name | Target UI Component / Screen | Primary API Endpoint | Database Entities (Prisma) | Automated Test Case | QA Status | Delivery Status |
|---|---|---|---|---|---|---|---|---|
| **REQ-REC-001** | Epic 2 / Ch. 1 | 1-Click Patient Check-in | `QueueCard`, `CheckInButton` | `POST /api/reception/checkin` | `Appointment`, `AppointmentEvent` | `reception-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-REC-002** | Epic 2 / Ch. 1 | Rapid Walk-in Registration | `WalkinModal` | `POST /api/reception/walkin` | `PatientProfile`, `Appointment` | `walkin-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-REC-003** | Epic 2 / Ch. 1 | Emergency Queue Bypass | `QueueCard`, `EmergencyBadge` | `PATCH /api/appointments/[id]`| `Appointment.priority` | `reception-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-REC-004** | Epic 2 / Ch. 1 | Drag-and-Drop Queue Reorder | `QueueBoard`, `QueueColumn` | `PATCH /api/reception/queue` | `Appointment.doctor_id`, `priority`| `reception-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-REC-005** | Epic 2 / Ch. 1 | 1-Click Cashier Checkout | `CheckoutWorkspace` | `POST /api/clinic/checkout` | `Invoice`, `Payment`, `Document` | `checkout-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-DOC-001** | Epic 1 / Ch. 2 | Uninterrupted Consultation | `ConsultWorkbenchView` | `POST /api/clinic/consultation`| `Appointment`, `ClinicalTemplate` | `consultation-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-DOC-002** | Epic 1 / Ch. 2 | Structured Rx Editor & Print | `PrescriptionEditor`, Print | `POST /api/clinic/consultation`| `Prescription`, `Document` | `prescription.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-DOC-003** | Epic 2 / Ch. 2 | 1-Click Visit Sign-off | `ConsultationCompleteModal` | `POST /api/clinic/consultation`| `Appointment`, `ServiceEvent`, `Invoice`| `billing-engine-service.test.ts`| 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-DOC-004** | Epic 3 / Ch. 2 | Schedule & Time-Blocking | `DoctorSchedule` | `POST /api/doctors/[id]/time-blocks`| `DoctorTimeBlock`, `DoctorAvailability`| `availability-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-DOC-005** | Epic 3 / Ch. 2 | Doctor Leave Engine | `DoctorSchedule`, `TimeOff` | `POST /api/doctors/[id]/time-blocks`| `DoctorTimeBlock`, `Clinic` | `availability-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-OWN-001** | Epic 4 / Ch. 3 | Owner Morning Snapshot | `DashboardView`, `CommandCenter`| `GET /api/organizations/[id]/command-center`| `Appointment`, `Invoice`, `Payment`| `command-center-service.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-OWN-002** | Epic 5 / Ch. 3 | Operational Intelligence KPIs | `CommandCenter`, `Insights` | `GET /api/clinic/dashboard` | `Appointment`, `StaffProfile` | `dashboard-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-OWN-003** | Epic 1 / Ch. 3 | Treatment Catalog & Prices | `TreatmentsView`, `ServicesTable`| `GET/POST /api/services` | `Service`, `ServiceEvent` | `service-catalog-service.test.ts`| 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-TEA-001** | Epic 6 / Ch. 4 | Staff Directory & Capabilities| `TeamPanel`, `StaffTable` | `POST /api/clinic/team/[staffId]`| `StaffProfile.capabilities`, `User` | `membership-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-TEA-002** | Epic 6 / Ch. 4 | Phone Staff Invites | `InviteDialog` | `POST /api/organizations/[id]/invitations`| `Invitation`, `User` | `membership-service.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-PLT-001** | Epic 1 / Ch. 5 | Unified Adaptive Shell | `StaffShell`, `Sidebar` | `GET /api/workspace/switch` | `Session`, `OrganizationMember` | `workspace-surface.test.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-PLT-002** | Epic 1 / Ch. 5 | Global Command Palette | `CommandPalette` (`Cmd+K`)| `GET /api/patients?name=...` | `PatientProfile`, `Appointment` | `patient-service.ts` | 🟡 Pending UAT | 🟡 In Readiness |
| **REQ-PLT-003** | Epic 1 / Ch. 5 | Design System v2 Tokens | `globals.css`, UI Primitives | All UI Rendering | CSS HSL Design Tokens | `components/ui/*` UI Audit | 🟡 Pending UAT | 🟡 In Readiness |

---

## 2. TRACEABILITY GOVERNANCE RULES

1. **Zero Unmapped Requirements:** Every requirement specified in `BRD-POE-001` must map to at least one primary API endpoint, database entity, and test case.
2. **Acceptance Gate Verification:** A requirement status can only transition from `In Readiness` ➔ `Implemented` ➔ `Certified` once its mapped automated test case passes cleanly and UAT sign-off is recorded.
3. **Change Control:** Any change to API parameters or Prisma models affecting a mapped requirement requires an updated entry in `ITM-001` before coding begins.

---

> **End of ITM-001.**  
> *Maintained by Engineering Lead & QA Governance Team during POE-001 implementation.*
