# Auriva Practice Operations Excellence (BRD-POE-001)

> **Document Classification:** Institutional Business Requirements Document (BRD)  
> **Milestone Target:** **Practice Operations Excellence (POE-001)**  
> **Preceding Artifacts:** `PRACTICE_OPERATIONS_BASELINE_REPORT.md`, `POE_SCREEN_FUTURES_DECISION_MATRIX.md`, `POPS_001_PRACTICE_OPERATIONS_PRODUCT_SPECIFICATION.md`, `EXECUTIVE_PRODUCT_REVIEW_EPR_001.md`  
> **Succeeding Artifacts:** `FRD-POE-001`, `UX-SPEC-001`, `ITM-001`  
> **Authors:** Institutional Product Office & Engineering Governance Board  
> **Status:** 🔒 FROZEN SINGLE SOURCE OF TRUTH FOR IMPLEMENTATION

---

# PART A: BUSINESS FOUNDATIONS & STRATEGIC DRIVERS

## A.1 Executive Summary
Auriva is a **Healthcare Operating System** serving independent outpatient clinics, single-specialty practices, and multi-doctor outpatient clinic groups in India. The **Practice Operations Excellence (POE-001)** milestone transitions Auriva from a collection of well-built operational modules into a single, intuitive, calm, and highly performant clinic operating experience.

### Key Strategic Objectives:
1. **Unify the Product Experience:** Transition from 5 separate surface apps (`/clinic`, `/doctor`, `/staff`, `/admin`, `/patient`) to a single **Unified Clinic Workspace** following `Workspace → Role → Task`.
2. **Eliminate Operational Friction:** Reduce patient check-in times from 90s to **< 20s**, walk-in registration from 120s to **< 30s**, and cashier checkout to **< 15s**.
3. **Prevent Revenue Leakage:** Automatically draft invoices upon consultation completion, eliminating 100% of unbilled visits.
4. **Empower Practice Owners:** Deliver a 2-minute morning operational snapshot via the **Owner Command Center**.
5. **Zero-Training Reception Onboarding:** Enable new receptionists to achieve full operational productivity within **15 minutes**.

---

## A.2 Business Drivers & Market Opportunity
* **Indian OPD OPD Dynamics:** High walk-in patient ratios (40%–60% of daily volume), cash and UPI instant payments, and family-shared mobile numbers require a specialized operational system.
* **Churn Reduction:** Rapid receptionist turnover in private clinics often leads to software abandonment if onboarding is complex. POE-001's visual, zero-training front desk guarantees software retention.
* **Encounter-to-Cash Monetization:** Closing the gap between clinical consultation and payment collection protects clinic profitability.

---

## A.3 Quantifiable Success Metrics & Operational KPIs

| Metric Code | Metric Name | Baseline | POE-001 Target | Measurement Method |
|---|---|---|---|---|
| **MET-001** | Patient Check-in Time | 90 seconds | **< 20 seconds** | Telemetry timestamp from Queue entry to `checked_in` |
| **MET-002** | Walk-in Registration Time | 120 seconds | **< 30 seconds** | Form submit timer on `WalkinModal` |
| **MET-003** | Consult to Invoice Latency | 4 manual clicks | **0 clicks (Instant)**| System trigger latency on consultation completion |
| **MET-004** | Cashier Checkout Duration | 45 seconds | **< 15 seconds** | Time spent inside cashier checkout workspace |
| **MET-005** | Owner Morning Review | 10 minutes | **< 2 minutes** | Time spent on `Owner Command Center` page |
| **MET-006** | New Staff Onboarding Time | 3 days | **< 15 minutes** | User time to first successful check-in/checkout |
| **MET-007** | Navigation Context Switch | 4 route changes | **0 route changes** | Side-drawer history & 1-click checkout usage |

---

# PART B: PRODUCT & EXPERIENCE ARCHITECTURE

## B.1 Personas & Journey Maps
1. **P-01: Front Desk Receptionist (Priya)** — High-volume walk-in registration, queue tokening, appointment check-in, billing collection, patient reassurance.
2. **P-02: Consulting Doctor (Dr. Sharma)** — Uninterrupted patient consultation, rapid SOAP charting, prescription generation, lab ordering, follow-up scheduling.
3. **P-03: Practice Owner (Dr. Mehta)** — Morning operational snapshot, revenue collections oversight, staff performance monitoring, practice configuration.
4. **P-04: Clinic Administrator (Anil)** — Organization setup, staff invitations, role capability grants, event bus monitoring, security logs.
5. **P-05: Outpatient Patient (Rajesh)** — Appointment self-booking, health record vault downloads, family profile management.

---

## B.2 Experience Principles
* **Calm:** Warm paper grounds (`bg-muted/30`), soft rounded cards (`12px`), zero anxiety-inducing error walls.
* **Premium:** Pine Teal (`#0B4A41`) for staff efficiency; Honey Amber (`#E8A24C`) for patient warmth.
* **Fast:** Optimistic UI updates, keyboard shortcuts (`Cmd+K`, `Cmd+S`, `Cmd+P`), zero full-page reloads.
* **Human:** Conversational tone ("Good morning, Dr. Sharma", "All caught up — no patients waiting").
* **Modern:** Crisp `Outfit` and `Inter` typography, backdrop blurs, status badges.
* **Trustworthy:** Complete audit trail, immutable financial ledgers, safe undo actions.
* **Never Overwhelming:** Comfortable density, "One Question Per Screen" discipline.

---

## B.3 The "One Question Per Screen" Rule
Every primary screen strictly addresses exactly **ONE operational question**:
* **Queue Board:** *"Who needs attention right now in the clinic?"*
* **Consultation Workbench:** *"Who am I consulting right now and what is their clinical state?"*
* **Billing Desk:** *"Who owes money and how do I collect it?"*
* **Owner Command Center:** *"What is happening across my practice today?"*
* **Doctor Schedule:** *"When am I available to see patients and when am I taking leave?"*
* **Patient Care Hub:** *"What is my active care plan and when is my next appointment?"*

---

## B.4 Information Architecture & URL Decoupling Governance
The platform is organized into **four conceptual information hubs**:
1. **Operations Hub:** Queue Board, Walk-in, Calendar, Lab Worklist.
2. **Clinical Hub:** Today Consults, Consultation Workbench, Patient Records, Schedules.
3. **Finance Hub:** Billing Desk, Cashier Checkout, Invoices, Payments, Services Catalog.
4. **Management Hub:** Owner Command Center, Team Roster, Reports & KPIs, Practice Settings.

> **URL Decoupling Rule:** Physical URL routes (`/staff`, `/doctor`, `/clinic`, `/admin`) remain flexible engineering implementation details to preserve bookmarks and prevent routing migration risk.

---

# PART C: DETAILED REQUIREMENT SPECIFICATIONS

---

## CHAPTER 1: RECEPTION JOURNEY & OPERATIONS

### REQ-REC-001: 1-Click Patient Check-in & Queue Entry
* **Business Problem:** Front-desk receptionists spend up to 90 seconds searching for scheduled patients and checking them in, creating long waiting room queues.
* **Current Workflow:** Navigate to `/staff/calendar` or `/staff/queue` → Find patient in list → Open menu → Select "Check in" → Select Doctor → Assign queue number → Save.
* **Future Workflow:** Receptionist views Today Queue (`/staff/queue`). Scheduled patients display a prominent 1-click **[ Check In ]** button. Clicking auto-assigns the next sequential token number and moves status to `waiting`.
* **Personas:** Front Desk Receptionist, Practice Owner.
* **Business Rules:**
  1. Token numbers are positive integers auto-incremented sequentially per doctor per calendar day.
  2. Clicking "Check In" sets `Appointment.status = 'checked_in'` and populates `checked_in_at` timestamp.
  3. Pre-consultation billing policies (`prepaid`) evaluate soft warning badges on the queue card but do not block check-in.
* **UX Principles:** One obvious primary button, 1-click execution, optimistic UI state update.
* **Success Metrics:** Patient check-in completed in **< 20 seconds** (MET-001).
* **Permissions:** `workspace.reception` capability or `receptionist` / `owner` role.
* **Dependencies:** `Appointment` model, `reception-service.ts`.
* **Edge Cases:** Double-clicking button triggers single check-in transaction.
* **Validation:** Rejects check-in if appointment status is `completed` or `cancelled`.
* **Error States:** Network failure displays offline toast; state rolls back.
* **Audit Events:** `AppointmentEvent` created with `type = 'checked_in'`.
* **Analytics Events:** Telemetry event `reception.patient.checked_in`.
* **Acceptance Criteria:**
  * **Given** a patient with status `scheduled` on today's queue,
  * **When** reception clicks `Check In`,
  * **Then** status becomes `checked_in`, token is assigned, and position moves to Waiting column within 200ms.
* **Out of Scope:** Automatic SMS notifications on check-in (deferred to communication release).
* **Future Evolution:** Facial recognition / QR code self-check-in kiosk.

---

### REQ-REC-002: Rapid Walk-in Patient Registration & Tokening
* **Business Problem:** Registering walk-in patients takes 2 minutes, forcing receptionists to delay phone calls and payments.
* **Current Workflow:** Open `/staff/walkin` → Fill 10-field form → Search existing patients → Submit → Open queue board to assign token.
* **Future Workflow:** Receptionist triggers `WalkinModal` (`Cmd+W` or top button). Enters Patient Name and Mobile Number. System auto-matches existing profile or creates new one, assigns doctor, issues queue token, and checks in patient in **1 click**.
* **Personas:** Front Desk Receptionist, Practice Owner.
* **Business Rules:**
  1. Phone number lookup matches existing `PatientProfile` or `Contact` rows.
  2. If matching profile exists, walk-in registers under existing `patient_id`.
  3. Appointment created with `walk_in = true`, `status = 'checked_in'`, `checked_in_at = NOW()`.
* **UX Principles:** 2-field primary focus, auto-fill matching, instant token badge.
* **Success Metrics:** Walk-in registration completed in **< 30 seconds** (MET-002).
* **Permissions:** `workspace.reception` capability.
* **Dependencies:** `walkin-service.ts`, `PatientProfile`, `Appointment`.
* **Edge Cases:** Patient with no mobile phone can register using clinic fallback identity.
* **Validation:** Mobile number must contain 10 valid digits (Indian standard).
* **Error States:** Validation failure highlights input border in destructive red.
* **Audit Events:** `AppointmentEvent` created with `type = 'walk_in_registered'`.
* **Analytics Events:** Telemetry event `reception.walkin.registered`.
* **Acceptance Criteria:**
  * **Given** a new walk-in patient,
  * **When** reception inputs Name and 10-digit Mobile and submits,
  * **Then** Patient Profile and Appointment are created, checked in, and assigned token in < 500ms.
* **Out of Scope:** Biometric Aadhaar verification.
* **Future Evolution:** WhatsApp self-registration QR code on clinic desk.

---

### REQ-REC-003: Emergency Patient Queue Bypass & Priority Reordering
* **Business Problem:** Critical or severe patients arriving at the clinic must be seen immediately by the doctor without manual re-tokening.
* **Current Workflow:** Manual communication with doctor; no visual flag on software queue.
* **Future Workflow:** Receptionist clicks **[ Emergency Bypass ]** on queue card or walk-in modal. System assigns priority weight `priority = 100`, adds prominent red **[ EMERGENCY ]** badge, and pins patient to position #1 in doctor's waiting queue.
* **Personas:** Front Desk Receptionist, Doctor.
* **Business Rules:**
  1. Emergency patients override standard numerical token ordering.
  2. Emergency status alerts active Doctor Workbench via real-time banner.
* **UX Principles:** High visual contrast (Destructive red badge), single-action bypass.
* **Success Metrics:** Emergency bypass executed in **1 click** (< 2 seconds).
* **Permissions:** `workspace.reception` or `workspace.clinical`.
* **Dependencies:** `Appointment.priority`, `QueueCard`.
* **Edge Cases:** Multiple emergency patients order by arrival time.
* **Validation:** Requires confirmation toast if active consultation is in progress.
* **Error States:** Audit record written if emergency status is revoked.
* **Audit Events:** `AppointmentEvent` created with `type = 'emergency_priority_set'`.
* **Analytics Events:** Telemetry event `reception.queue.emergency_bypass`.
* **Acceptance Criteria:**
  * **Given** a waiting patient,
  * **When** reception clicks `Emergency Bypass`,
  * **Then** patient moves to position #1 in Doctor Workbench queue with red Emergency badge.
* **Out of Scope:** Triage scoring algorithms.
* **Future Evolution:** Ambulance pre-arrival notification integration.

---

### REQ-REC-004: Drag-and-Drop Queue Reordering & Doctor Transfer
* **Business Problem:** Reassigning a patient to another doctor or reordering waiting patients requires multiple menu dropdown clicks.
* **Current Workflow:** Open appointment edit modal → Change doctor select box → Save → Refresh page.
* **Future Workflow:** Receptionist drags appointment card between doctor columns or up/down the waiting queue. Reordering updates priority; dragging to another doctor transfers patient with instant notification.
* **Personas:** Front Desk Receptionist.
* **Business Rules:**
  1. Dragging across doctor columns updates `Appointment.doctor_id`.
  2. Reordering within column updates sequential `priority` weights.
* **UX Principles:** Direct manipulation, smooth drag animation, instant feedback.
* **Success Metrics:** Queue transfer completed in **< 3 seconds**.
* **Permissions:** `workspace.reception`.
* **Dependencies:** `reception-service.ts`, `dnd-kit` / HTML5 Drag and Drop.
* **Edge Cases:** Transferring to an inactive doctor flags confirmation warning.
* **Validation:** Cannot drag `completed` or `in_consultation` appointments to another doctor.
* **Error States:** Failed transfer rolls card back to original column.
* **Audit Events:** `AppointmentEvent` created with `type = 'doctor_transferred'`.
* **Analytics Events:** Telemetry event `reception.queue.transferred`.
* **Acceptance Criteria:**
  * **Given** a waiting patient card on Reception Board,
  * **When** reception drags card to Dr. Kapoor's column,
  * **Then** `doctor_id` updates and Dr. Kapoor's workbench queue reflects patient instantly.
* **Out of Scope:** Cross-clinic inter-branch transfers.
* **Future Evolution:** AI-suggested load-balancing transfers across doctors.

---

### REQ-REC-005: Instant 1-Click Cashier Checkout Workspace
* **Business Problem:** Cashiers spend 45 seconds locating draft invoices, entering payment amounts, and selecting payment methods.
* **Current Workflow:** Navigate to `/staff/billing` → Search patient → Find draft invoice → Click Edit → Select Payment Method → Enter Amount → Save → Open Print page.
* **Future Workflow:** When doctor completes consultation, cashier receives a 1-click **[ Collect ₹X ]** notification on Reception Desk. Clicking opens a 1-page checkout drawer with exact total pre-filled, instant Cash/UPI/Card buttons, and 1-click receipt print.
* **Personas:** Front Desk Receptionist, Cashier, Practice Owner.
* **Business Rules:**
  1. Cashier drawer automatically loads draft `Invoice` generated from consultation `ServiceEvents`.
  2. Selecting `Cash`, `UPI`, or `Card` and clicking `Complete Payment` writes `Payment` row and updates `Invoice.status = 'paid'`.
  3. Paid invoices are **immutable** (enforced by `billing-service.ts`).
* **UX Principles:** Pre-filled amounts, zero manual typing for exact payments, 1-click receipt print.
* **Success Metrics:** Cashier checkout completed in **< 15 seconds** (MET-004).
* **Permissions:** `workspace.reception` or `workspace.finance`.
* **Dependencies:** `checkout-service.ts`, `Invoice`, `Payment`, `Document`.
* **Edge Cases:** Partial payment logs partial balance and keeps invoice `issued`.
* **Validation:** Payment amount cannot exceed invoice remaining balance.
* **Error States:** Failed payment creation leaves invoice in `issued` draft state.
* **Audit Events:** `AuditLog` created with `action = 'payment_received'`.
* **Analytics Events:** Telemetry event `finance.payment.collected`.
* **Acceptance Criteria:**
  * **Given** a completed visit with draft invoice of ₹500,
  * **When** cashier clicks `UPI` and `Complete Payment`,
  * **Then** Payment is recorded, Invoice becomes `paid`, and printable Receipt modal opens in < 300ms.
* **Out of Scope:** Integrated hardware card POS terminal syncing.
* **Future Evolution:** Dynamic cashier desk UPI QR code display.

---

## CHAPTER 2: DOCTOR JOURNEY & CLINICAL EXCELLENCE

### REQ-DOC-001: Uninterrupted Consultation Workbench Charting
* **Business Problem:** Doctors spend too much time navigating between clinical tabs, typing repetitive SOAP notes, and opening separate prescription tools.
* **Current Workflow:** Multi-tab navigation on `/doctor/workbench` → Manual typing of chief complaints, vitals, diagnosis, and medicines.
* **Future Workflow:** Single-screen Consultation Workbench. Top header displays patient age, gender, blood group, and vital chips. Left side provides SOAP notes & diagnosis with 1-click `ClinicalTemplate` insertion. Right side features structured Rx Editor.
* **Personas:** Consulting Doctor, Practice Owner.
* **Business Rules:**
  1. Workbench auto-selects patient with status `doctor_ready` or next `waiting`.
  2. Clicking "Start Consultation" updates `Appointment.status = 'in_consultation'` and sets `started_at = NOW()`.
  3. SOAP fields support pre-filling from saved `ClinicalTemplate` presets.
* **UX Principles:** Uninterrupted clinical flow, high comfortable density, single-screen layout.
* **Success Metrics:** Complete visit charting in **< 60 seconds**.
* **Permissions:** `workspace.clinical` capability.
* **Dependencies:** `consultation-service.ts`, `ClinicalTemplate`, `Prescription`.
* **Edge Cases:** Navigating away during active consult auto-saves draft in local storage.
* **Validation:** Requires at least one chief complaint or diagnosis before sign-off.
* **Error States:** Draft save failure triggers top alert banner.
* **Audit Events:** `AppointmentEvent` created with `type = 'status_changed'` (`in_consultation`).
* **Analytics Events:** Telemetry event `clinical.consultation.started`.
* **Acceptance Criteria:**
  * **Given** an active patient in consultation,
  * **When** doctor selects template "Acute URTI" and clicks Sign & Complete,
  * **Then** SOAP fields populate, Prescription is created, and visit completes in < 500ms.
* **Out of Scope:** AI voice-to-text transcription.
* **Future Evolution:** Ambient clinical documentation voice assistant.

---

### REQ-DOC-002: Structured Prescription Authoring & Printable Rx
* **Business Problem:** Hand-written or free-text prescriptions cause dispensing errors and look unprofessional.
* **Current Workflow:** Textarea typing in `prescription_notes` column → Generic print view.
* **Future Workflow:** Structured Rx Editor with auto-completing medicine catalog (Name, Dosage, Frequency, Duration, Instructions). Generates formal `Prescription` record and launches formatted print layout (`/print/prescription/[id]`).
* **Personas:** Consulting Doctor.
* **Business Rules:**
  1. Prescriptions write relational `Prescription` rows linked to `Appointment`.
  2. Frequency format uses standard medical terms (`1-0-1`, `1-1-1`, `0-0-1`, `As needed`).
  3. Print layout renders official clinic header, doctor registration number, and signature block.
* **UX Principles:** Auto-completion, clean structured rows, 1-click print.
* **Success Metrics:** Prescription authored and printed in **< 30 seconds**.
* **Permissions:** `workspace.clinical` capability.
* **Dependencies:** `prescription.ts`, `medicine-catalog.ts`, `DocumentRenderer`.
* **Edge Cases:** Custom non-catalog medicines can be added as free-text items.
* **Validation:** Each medicine row must contain medicine name and duration.
* **Error States:** Missing registration number displays warning in print layout.
* **Audit Events:** `AuditLog` created with `action = 'prescription_created'`.
* **Analytics Events:** Telemetry event `clinical.prescription.created`.
* **Acceptance Criteria:**
  * **Given** a doctor in Consultation Workbench,
  * **When** doctor inputs "Paracetamol 650mg, 1-0-1, 5 days" and clicks `Sign & Complete`,
  * **Then** Prescription record is saved and printable PDF/print window opens cleanly.
* **Out of Scope:** Drug-drug interaction database checking (deferred to clinical AI release).
* **Future Evolution:** E-prescription WhatsApp delivery directly to patient app.

---

### REQ-DOC-003: 1-Click Consultation Sign-off & Automated Invoicing
* **Business Problem:** Doctors forget to inform reception when a visit completes, resulting in unbilled visits and lost revenue.
* **Current Workflow:** Doctor signs visit → Verbal call to reception → Reception manually creates bill.
* **Future Workflow:** Doctor clicks **[ SIGN & COMPLETE ]** (`Cmd+S`). System saves consultation notes, marks `Appointment.status = 'completed'`, sets `completed_at = NOW()`, auto-generates `ServiceEvents` for consultation fee and procedures, and automatically drafts `Invoice` on Billing Desk.
* **Personas:** Consulting Doctor, Practice Owner, Cashier.
* **Business Rules:**
  1. Clicking Sign & Complete executes atomic transaction:
     - `Appointment.status = 'completed'`
     - Create `Prescription`
     - Create `ServiceEvent` for consultation fee
     - Create draft `Invoice`
  2. Zero manual invoice creation required by front desk.
* **UX Principles:** 1-click execution, automated downstream workflow, instant queue clearing.
* **Success Metrics:** **0 manual clicks** for invoice drafting (MET-003).
* **Permissions:** `workspace.clinical` capability.
* **Dependencies:** `consultation-service.ts`, `billing-engine-service.ts`.
* **Edge Cases:** Completing visit with follow-up date auto-books follow-up appointment.
* **Validation:** Rejects sign-off if appointment is already completed.
* **Error States:** Transaction rollback if invoice generation fails.
* **Audit Events:** `AppointmentEvent` created with `type = 'status_changed'` (`completed`).
* **Analytics Events:** Telemetry event `clinical.consultation.completed`.
* **Acceptance Criteria:**
  * **Given** an active consultation,
  * **When** doctor clicks `SIGN & COMPLETE`,
  * **Then** visit status becomes `completed`, draft invoice appears on cashier desk, and queue advances.
* **Out of Scope:** Automated claim submission to health insurance portals.
* **Future Evolution:** Automated follow-up reminder scheduling via WhatsApp.

---

### REQ-DOC-004: Doctor Schedule & Date Time-Blocking Engine
* **Business Problem:** Doctors needing personal time off for lunch, meetings, or conferences get double-booked by online patient booking.
* **Current Workflow:** Inform reception verbally; no system mechanism to block specific hours.
* **Future Workflow:** Doctor opens `/doctor/schedule`. Views weekly recurring hours (`DoctorAvailability`) and date-specific time blocks (`DoctorTimeBlock`). Click **[ Block Time ]** to select date and time range (e.g., Today 13:00–14:00 Lunch). Online slot generator instantly removes overlapping slots.
* **Personas:** Consulting Doctor, Front Desk Receptionist.
* **Business Rules:**
  1. `DoctorTimeBlock` stores date-specific windows (`start_at`, `end_at`, `reason`).
  2. `availability-service.ts` subtracts time blocks from bookable slot generation.
  3. Existing appointments overlapping a newly created time block display a rescheduling alert to reception.
* **UX Principles:** Visual schedule calendar, quick preset buttons (Lunch, Half Day, Full Day).
* **Success Metrics:** Time block created in **< 10 seconds**.
* **Permissions:** `workspace.clinical` capability.
* **Dependencies:** `availability-service.ts`, `DoctorTimeBlock`.
* **Edge Cases:** Creating a block over an existing appointment prompts reception warning.
* **Validation:** `end_at` must be after `start_at`.
* **Error States:** Time block creation failure shows error toast.
* **Audit Events:** `AuditLog` created with `action = 'time_block_created'`.
* **Analytics Events:** Telemetry event `clinical.schedule.blocked`.
* **Acceptance Criteria:**
  * **Given** a doctor schedule view,
  * **When** doctor blocks 13:00 to 14:00 today for Lunch,
  * **Then** public and internal booking engines suppress 13:00-14:00 slots immediately.
* **Out of Scope:** Multi-doctor shift exchange marketplace.
* **Future Evolution:** Google Calendar 2-way synchronization.

---

### REQ-DOC-005: Doctor Leave & Holiday Management Engine (OPS-002 Lite)
* **Business Problem:** OPS-002 leave management was previously on hold, preventing doctors from marking planned vacation or sick leave in the system.
* **Current Workflow:** Manual verbal communication; online bookings remain open during doctor leave.
* **Future Workflow:** Doctor or Admin submits leave request (Date range + Reason). Once approved, system suppresses all online slots for that doctor across the date range and flags affected scheduled appointments on reception's rebook list.
* **Personas:** Consulting Doctor, Practice Owner, Receptionist.
* **Business Rules:**
  1. Approved leave creates date-range `DoctorTimeBlock` entries.
  2. Daily capacity counter displays "On Leave" banner across reception and patient booking pages.
* **UX Principles:** Simple date-range picker, status badges (Pending, Approved), automatic slot suppression.
* **Success Metrics:** Multi-day leave request submitted and processed in **< 15 seconds**.
* **Permissions:** `workspace.clinical` or `workspace.management`.
* **Dependencies:** `availability-service.ts`, `DoctorTimeBlock`, `Invitation`.
* **Edge Cases:** Single day leave vs. multi-week sabbatical supported cleanly.
* **Validation:** Leave dates cannot be set in the past.
* **Error States:** Overlapping leave requests return validation error.
* **Audit Events:** `AuditLog` created with `action = 'doctor_leave_approved'`.
* **Analytics Events:** Telemetry event `clinical.leave.approved`.
* **Acceptance Criteria:**
  * **Given** a doctor requesting leave for July 25-27,
  * **When** owner approves leave,
  * **Then** all slots for July 25-27 are closed, and booked patients move to reception rebook list.
* **Out of Scope:** HRMS accrual tracking, casual/sick leave quota ledgers.
* **Future Evolution:** Automated locum doctor substitution assignment.

---

## CHAPTER 3: PRACTICE OWNER JOURNEY & COMMAND CENTER

### REQ-OWN-001: Owner Command Center Morning Operational Snapshot
* **Business Problem:** Clinic owners must open 5 different reports and calculate manual figures to understand morning clinic performance.
* **Current Workflow:** Open `/clinic` → Open `/staff/billing` → Open `/doctor` → Calculate total revenue and patient counts manually.
* **Future Workflow:** Owner opens Owner Command Center (`/clinic/command-center`). Top hero bar presents the **Morning Snapshot**: 8 real-time KPI tiles (Today's Visits, Today's Revenue, Staff On Duty, Available Doctors, Pending Collections, No-shows, Follow-ups Due, Operational Alerts).
* **Personas:** Practice Owner, Managing Doctor.
* **Business Rules:**
  1. All KPI tiles update in real time from backend database queries.
  2. Revenue tile aggregates paid payments (`Payment`) collected today.
  3. Pending collections tile calculates total outstanding amounts on `issued` invoices.
* **UX Principles:** Instant situational awareness, 8-tile structured header, zero manual calculation.
* **Success Metrics:** Morning operational review completed in **< 2 minutes** (MET-005).
* **Permissions:** `workspace.management` capability or `practice_owner` / `managing_doctor` role.
* **Dependencies:** `command-center-service.ts`, `Invoice`, `Payment`, `Appointment`.
* **Edge Cases:** Zero visits/revenue displays warm encouraging empty state ("Good morning! Practice opening").
* **Validation:** Queries scoped strictly to active `organization_id` and selected `clinic_id`.
* **Error States:** Failed metric fetch displays retry button inside affected tile.
* **Audit Events:** `AuditLog` created with `action = 'command_center_viewed'`.
* **Analytics Events:** Telemetry event `management.command_center.viewed`.
* **Acceptance Criteria:**
  * **Given** a practice owner logging in at 9:00 AM,
  * **When** opening Command Center,
  * **Then** all 8 operational metrics load in < 400ms with zero manual reporting steps.
* **Out of Scope:** Multi-organization enterprise consolidation (single org scope).
* **Future Evolution:** Automated daily morning summary digest via WhatsApp to owner.

---

### REQ-OWN-002: Real-time Operational Intelligence & Practice KPIs
* **Business Problem:** Clinic owners lack visibility into room bottlenecks, doctor utilization, and average patient waiting times.
* **Current Workflow:** No operational metrics available in current baseline software.
* **Future Workflow:** Command Center Operational Intelligence section displays live practice KPIs: Average Wait Time (mins), Average Consultation Duration (mins), Doctor Utilization %, Reception Checkout Throughput, Repeat Visit Rate, Revenue Per Doctor.
* **Personas:** Practice Owner, Practice Manager.
* **Business Rules:**
  1. Average Wait Time = `started_at` - `checked_in_at` averaged across completed visits.
  2. Average Consultation Duration = `completed_at` - `started_at` averaged across completed visits.
  3. Doctor Utilization = (Total Consultation Time / Total Available Hours) * 100.
* **UX Principles:** Visual charts, clean trend indicators (+5% vs last week), actionable insights.
* **Success Metrics:** Operational bottlenecks identified instantly without manual data export.
* **Permissions:** `workspace.management` capability.
* **Dependencies:** `dashboard-service.ts`, `Appointment`, `StaffProfile`.
* **Edge Cases:** Single doctor clinic hides doctor comparison chart.
* **Validation:** Metrics aggregate exclusively over valid completed visits.
* **Error States:** Missing historical data shows "Insufficient visit data for trend".
* **Audit Events:** `AuditLog` created with `action = 'kpi_dashboard_viewed'`.
* **Analytics Events:** Telemetry event `management.kpis.viewed`.
* **Acceptance Criteria:**
  * **Given** an owner reviewing clinic performance,
  * **When** viewing Operational Intelligence,
  * **Then** average wait time and doctor utilization rates calculate accurately from visit timestamps.
* **Out of Scope:** Predictive AI patient volume forecasting.
* **Future Evolution:** Benchmark comparison against anonymized regional practice averages.

---

### REQ-OWN-003: Treatment Services Catalog & Pricing Engine
* **Business Problem:** Managing clinic service prices, durations, and buffer times is clunky and requires developer assistance in legacy systems.
* **Current Workflow:** Flat service list on `/clinic` with basic name and price fields.
* **Future Workflow:** Master Treatment Catalog (`/clinic/settings/services`). Owners configure services with Name, Category (Consultation, Procedure, Lab, Therapy), Duration (mins), Buffer Time (mins), Price (INR), and Active status. Service versions bump automatically to prevent historical invoice mutation.
* **Personas:** Practice Owner, Practice Manager.
* **Business Rules:**
  1. `Service.version` increments on material price or duration edits.
  2. Inactive services (`is_active = false`) hide from new booking pickers but remain in historical `ServiceEvents`.
  3. Duration drives bookable slot length calculation in `availability-service.ts`.
* **UX Principles:** Comfortable density table, category filter pills, quick price edit inline.
* **Success Metrics:** Service added or price updated in **< 15 seconds**.
* **Permissions:** `workspace.management` capability.
* **Dependencies:** `service-catalog-service.ts`, `Service`, `ServiceEvent`.
* **Edge Cases:** Deleting a service soft-archives it (`is_active = false`) to preserve audit history.
* **Validation:** Price must be a non-negative integer INR value.
* **Error States:** Duplicate active service name returns validation warning.
* **Audit Events:** `AuditLog` created with `action = 'service_updated'`.
* **Analytics Events:** Telemetry event `management.service.updated`.
* **Acceptance Criteria:**
  * **Given** an owner adding a new "Physiotherapy Session" service (₹800, 30 mins),
  * **When** saving the service,
  * **Then** service appears in catalog and is immediately bookable by front desk and patients.
* **Out of Scope:** Multi-currency international pricing engine (INR integer scope).
* **Future Evolution:** Dynamic seasonal pricing rules and package bundles.

---

## CHAPTER 4: TEAM OPERATIONS & GOVERNANCE

### REQ-TEA-001: Staff Directory & Capabilities Assignment Engine
* **Business Problem:** Roles are currently rigid. An owner-doctor acting as part-time receptionist cannot access front-desk tools without full admin privileges.
* **Current Workflow:** Rigid 1:1 role mapping (`doctor`, `receptionist`, `super_admin`).
* **Future Workflow:** Unified Staff Directory (`/admin/team`). Owners assign base roles (`doctor`, `receptionist`) and grant specific capability overrides via `StaffProfile.capabilities` JSON array (`workspace.reception`, `workspace.clinical`, `workspace.finance`, `workspace.management`).
* **Personas:** Practice Owner, Clinic Administrator.
* **Business Rules:**
  1. Effective capabilities = Role Base Defaults ∪ Granted Capabilities.
  2. `authorization.ts` validates capability grants on every API route and UI surface render.
  3. Deactivating staff (`is_active = false`) revokes session login immediately.
* **UX Principles:** Checkbox capability matrix, instant status toggle switches, active role badges.
* **Success Metrics:** Capability override granted in **< 10 seconds**.
* **Permissions:** `workspace.management` capability.
* **Dependencies:** `membership-service.ts`, `authorization.ts`, `StaffProfile`.
* **Edge Cases:** Revoking capabilities while user is online updates capabilities on next request.
* **Validation:** Owner role cannot be revoked by non-owner admins.
* **Error States:** Permission denied toast displayed if unauthorized user attempts edit.
* **Audit Events:** `AuditLog` created with `action = 'staff_capabilities_updated'`.
* **Analytics Events:** Telemetry event `management.team.capabilities_updated`.
* **Acceptance Criteria:**
  * **Given** a doctor profile,
  * **When** owner grants `workspace.reception` capability,
  * **Then** doctor's sidebar dynamically includes Reception Queue and Billing Desk tools.
* **Out of Scope:** Complex custom policy rule expression language.
* **Future Evolution:** Role-based template sharing across organization branches.

---

### REQ-TEA-002: Phone-First Staff Invitation & Onboarding Lifecycle
* **Business Problem:** Email invitations fail when new receptionists do not have formal work emails or check email at the front desk.
* **Current Workflow:** Email-only invite form requiring full email account verification.
* **Future Workflow:** Owner enters Staff Name, Mobile Number, and Role on Team Panel. System generates secure 72-hour invitation token (`Invitation`) and offers 1-click **[ Share via WhatsApp ]** or **[ Copy Invite Link ]**. Recipient opens link, sets password, and logs in immediately.
* **Personas:** Practice Owner, New Staff Member.
* **Business Rules:**
  1. `Invitation` keyed on mobile number `phone` or `email`.
  2. Tokens expire after 72 hours (`expires_at = NOW() + 72h`).
  3. Accepting invite creates `User`, `StaffProfile`, and `OrganizationMember` in one atomic transaction.
* **UX Principles:** WhatsApp 1-click share, 72h expiry timer badge, instant account provisioning.
* **Success Metrics:** Invitation created and shared in **< 10 seconds**.
* **Permissions:** `workspace.management` capability.
* **Dependencies:** `membership-service.ts`, `Invitation`, `User`.
* **Edge Cases:** Resending an invitation refreshes the 72-hour expiry window.
* **Validation:** Phone number must not belong to an already active staff member in the same clinic.
* **Error States:** Expired invitation link displays friendly "Invitation Expired - Contact Owner" screen.
* **Audit Events:** `AuditLog` created with `action = 'staff_invited'`.
* **Analytics Events:** Telemetry event `management.team.staff_invited`.
* **Acceptance Criteria:**
  * **Given** an owner inviting a receptionist via mobile number,
  * **When** invite is sent and accepted by staff member,
  * **Then** staff account is provisioned and logged in to reception workspace in < 1 second.
* **Out of Scope:** Automated SMS gateway dispatch for invites (WhatsApp link / copy link standard).
* **Future Evolution:** QR code scanning for physical staff badge onboarding.

---

## CHAPTER 5: PLATFORM & EXPERIENCE FOUNDATION

### REQ-PLT-001: Unified Adaptive Workspace Shell & Information Hubs
* **Business Problem:** Users navigating between `/doctor`, `/staff`, and `/clinic` experience jarring theme shifts, header jumps, and inconsistent sidebars.
* **Current Workflow:** Each surface route renders its own independent layout component.
* **Future Workflow:** Single `StaffShell` mounting an adaptive sidebar. Top navigation displays Clinic Switcher, Global Search (`Cmd+K`), Active Context Badge, What's New Bell, and User Profile menu. Navigation sidebar dynamically renders permitted Information Hubs (*Operations, Clinical, Finance, Management*).
* **Personas:** All Staff Users (Doctors, Receptionists, Owners, Admins).
* **Business Rules:**
  1. Navigation items render strictly according to server-resolved user capabilities.
  2. Active workspace state stored in `Session.active_membership_id`.
  3. Physical route paths remain flexible (URL Decoupling Governance).
* **UX Principles:** Seamless transition between hubs, consistent top bar, zero layout shifts.
* **Success Metrics:** Workspace layout render time **< 100ms**.
* **Permissions:** Authenticated staff session (`Session`).
* **Dependencies:** `StaffShell`, `workspace-switcher.ts`, `authorization.ts`.
* **Edge Cases:** Single clinic users hide clinic switcher dropdown.
* **Validation:** Unauthenticated callers redirected to `/login`.
* **Error States:** Invalid session redirects to login with return URL parameter.
* **Audit Events:** `AuditLog` created with `action = 'workspace_accessed'`.
* **Analytics Events:** Telemetry event `platform.workspace.accessed`.
* **Acceptance Criteria:**
  * **Given** a logged-in user with reception and clinical capabilities,
  * **When** opening workspace,
  * **Then** sidebar renders Operations and Clinical hubs cleanly with zero header flicker.
* **Out of Scope:** Fully customizable drag-and-drop sidebar widget ordering.
* **Future Evolution:** Multi-window desktop layout pop-out support.

---

### REQ-PLT-002: Global Command Palette (`Cmd+K`) & Universal Search
* **Business Problem:** Locating a patient, appointment, or invoice requires navigating to specific search pages and typing queries.
* **Current Workflow:** Navigate to `/staff/patients` or `/staff/billing` → Type query in local search box.
* **Future Workflow:** Pressing `Cmd+K` (or `Ctrl+K`) opens the Global Command Palette overlay anywhere in the staff workspace. Instant debounced search queries patients by Name/Phone/Health ID, appointments by Date/Doctor, and invoices by Number. Selecting an item jumps directly to its detail drawer or page.
* **Personas:** All Staff Users.
* **Business Rules:**
  1. `Cmd+K` keyboard shortcut listens globally on keydown events.
  2. Search queries search `PatientProfile`, `Appointment`, `Invoice`, and `Service` tables simultaneously.
  3. Displays recent searches and quick action shortcuts (`Book Walk-in`, `New Consultation`, `Collect Payment`).
* **UX Principles:** Instant overlay, zero mouse movement required, highlighted matching text.
* **Success Metrics:** Search result returned in **< 150ms**.
* **Permissions:** Authenticated staff session.
* **Dependencies:** `command-palette.tsx`, `patient-service.ts`, `billing-service.ts`.
* **Edge Cases:** Empty query displays recent searches and quick action triggers.
* **Validation:** Minimum 2 characters required to trigger database search.
* **Error States:** Search failure displays "No matching results found".
* **Audit Events:** None (Search is read-only).
* **Analytics Events:** Telemetry event `platform.command_palette.searched`.
* **Acceptance Criteria:**
  * **Given** a user anywhere in the staff surface,
  * **When** pressing `Cmd+K` and typing "Rajesh",
  * **Then** patient record "Rajesh Kumar (AUR-882910)" appears in dropdown in < 150ms.
* **Out of Scope:** Voice-driven command execution.
* **Future Evolution:** AI-powered natural language query parsing ("Show me unpaid bills from yesterday").

---

### REQ-PLT-003: Design System v2 & Token Standardization
* **Business Problem:** Inconsistent button colors, card border radii, and font sizes across surfaces degrade the premium product feel.
* **Current Workflow:** Mixed Tailwind utilities and ad-hoc color classes across component files.
* **Future Workflow:** Strict adherence to **Auriva Design System v2** in `src/app/globals.css`. Staff efficiency views use **Pine Teal (`#0B4A41`)**; patient views use **Honey Amber (`#E8A24C`)**. Standardized card radiuses (`12px`), borders (`border-border/60`), typography scale (`Outfit` / `Inter`), and shimmer loading skeletons (`Skeleton`).
* **Personas:** All Users.
* **Business Rules:**
  1. Zero hardcoded hex codes in component files; all styling consumes CSS HSL design tokens.
  2. Semantic status colors remain identical across light and dark modes to prevent clinical misinterpretation.
* **UX Principles:** Visual harmony, comfortable density, high contrast readability.
* **Success Metrics:** 100% component compliance with Design System v2 token definitions.
* **Permissions:** All surfaces.
* **Dependencies:** `globals.css`, `tailwind.config.ts`, `components/ui/*`.
* **Edge Cases:** High-contrast accessibility mode overrides token values.
* **Validation:** Verified via automated CSS linter during build.
* **Error States:** Fallback to base design tokens if custom theme fails.
* **Audit Events:** None.
* **Analytics Events:** None.
* **Acceptance Criteria:**
  * **Given** any screen in Auriva,
  * **When** inspected in light or dark theme,
  * **Then** colors, typography, borders, and spacing strictly match Design System v2 specifications.
* **Out of Scope:** Custom clinic-branded theme customization engine.
* **Future Evolution:** Theme accent color selector for clinic customization.

---

# PART D: ENGINEERING CONSTRAINTS & PLATFORM FOUNDATIONS

## D.1 Migration Strategy & Data Integrity
* **Backward Compatibility:** All database migrations in POE-001 must be strictly additive and backward compatible. No columns may be dropped or renamed during deployment.
* **Schema Evolution:** Additive nullable columns (e.g., `StaffProfile.capabilities`, `DoctorTimeBlock.reason`) ensure pre-existing single-clinic data operates without downtime.
* **Zero Data Loss Guarantee:** Financial tables (`Invoice`, `Payment`, `ServiceEvent`, `CreditNote`, `Refund`) maintain foreign key cascades and immutable record flags.

---

## D.2 Feature Flags & Phased Rollout
POE-001 capabilities will be deployed behind server-side feature flags defined in `src/lib/config.ts`:
* `FEATURE_POE_WORKSPACES` — Toggles new adaptive workspace shell and Command Palette.
* `FEATURE_RECEPTION_EXCELLENCE` — Toggles drag-and-drop queue and 1-click cashier checkout drawer.
* `FEATURE_SCHEDULING_LEAVE` — Toggles Doctor Leave & Holiday engine (OPS-002 Lite).
* `FEATURE_OWNER_COMMAND_CENTER` — Toggles morning operational snapshot header and KPI analytics.

---

## D.3 Performance & Non-Functional Requirements (NFRs)
* **API Response Time:** 95% of API requests must complete in **< 200ms**.
* **Page Load Time:** Initial First Contentful Paint (FCP) must complete in **< 1.2 seconds**.
* **Database Queries:** All queue and financial list queries must utilize compound indexes (`clinic_id, scheduled_time` on `Appointments`; `clinic_id, received_at` on `Payments`).
* **Concurrency:** The system must support at least 50 concurrent staff users per clinic branch without queue state locks.

---

## D.4 Security, Accessibility & Compliance
* **Authorization:** Every API route must execute server-side session resolution (`Session`) and capability checking (`authorization.ts`).
* **Data Scoping:** All database queries must be strictly scoped by the authenticated user's `organization_id` and `clinic_id`.
* **Password Hashing:** Staff passwords must utilize scrypt hashing (`scrypt$<salt>$<hash>`).
* **Accessibility (A11y):** All UI components must comply with WCAG 2.1 AA standards, supporting keyboard focus, screen reader ARIA labels, and minimum 4.5:1 color contrast.

---

## D.5 Audit & Observability
* **Audit Trail:** Critical operations (check-in, consultation sign-off, invoice payment, refund, staff invite, capability grant) write structured JSON rows to `AuditLog`.
* **Event Platform Integration:** System events publish to `EventLog` with correlation IDs for transactional traceability and DLQ error inspection (`/admin/events`).

---

# PART E: LAUNCH, QA & PRODUCT ACCEPTANCE

## E.1 Quality Assurance & UAT Strategy
* **Automated Test Suite:** Full suite of Vitest unit and integration tests covering billing calculations (`billing-engine-service.test.ts`), checkout processing (`checkout-service.test.ts`), schedule slot generation (`availability-service.test.ts`), and capability authorization (`authorization.test.ts`).
* **End-to-End Testing:** Automated Playwright/Cypress end-to-end tests validating the complete walk-in ➔ check-in ➔ consult ➔ checkout user flow.
* **User Acceptance Testing (UAT):** Pilot clinic testing with 5 independent outpatient practices in Springfield demo environment.

---

## E.2 Product Acceptance & Sign-off Protocol
Before POE-001 is declared production-ready, it must satisfy all of the following acceptance criteria:
1. All 18 requirement specifications in Part C pass 100% of Acceptance Criteria tests.
2. All 7 quantifiable operational targets in Part A (MET-001 through MET-007) are empirically verified.
3. Automated test suite passes with **0 failing tests**.
4. No console errors or memory leaks during continuous 1-hour receptionist queue operations.
5. Formal sign-off granted by Chief Product Officer, Director of UX, and CTO.

---

> **End of BRD-POE-001.**  
> *This document is the frozen single source of truth for implementation.*
