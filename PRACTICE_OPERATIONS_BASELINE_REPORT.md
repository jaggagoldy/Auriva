# Auriva Practice Operations Platform — Baseline Product Discovery Report

> **Document Classification:** Product Office Institutional Discovery & Baseline Report  
> **Target Baseline:** Auriva Healthcare Operating System (Release 1.2 Baseline)  
> **Authors:** Institutional Product Discovery Team  
> *(Chief Product Officer, VP Product, Principal UX Designer, Product Designer, Healthcare Workflow Consultant, SaaS Product Strategist, Information Architect, Design System Architect, Business Analyst, Technical Product Manager)*  
> **Status:** 🔒 FROZEN BASELINE (Current State Documentation Only — No Code Modifications / No Redesign Proposals)

---

## SECTION 1: EXECUTIVE SUMMARY

### 1.1 Current Product Maturity
Auriva is positioned as a **Healthcare Operating System** designed primarily for independent outpatient clinics, single-specialty practices, and multi-doctor outpatient clinic groups in India. The current system maturity stands at **Release 1.2 (Sprint 2 Certified with Conditions)**.

* **Core Platform Foundation (OPS-001 / OPS-001C):** Fully implemented parent `Organization` entity supporting multi-clinic grouping, staff memberships, and a Shared Event Bus (`EventLog`/`EventHandlerLog`) with publish, retry, dead-letter queue (DLQ), and replay capabilities. Note: Per `auriva-platform-state-report.md` §19, user-facing announcements and automated external notification preferences do **not** exist in backend services; the platform uses an internal event projection model.
* **Clinical & Encounter Engine (Phase 3 / Release 1.2 Sprint 1 & 2):** Fully realized Consultation Workbench, digital prescription authoring (`Prescription`), lab ordering & test recommendations (`TestRecommendation`), clinical note templates (`ClinicalTemplate`), and multi-session treatment planning (`TreatmentPlan`/`TreatmentPlanSession`).
* **Encounter-to-Cash Ledger (M3A / M3B):** Immutable financial accounting driven by atomic `ServiceEvent` items. Support for draft/issued/paid invoice lifecycles, cash/UPI/card payments, prepaid/postpaid billing policies, multi-invoice settlement, and compensating corrections via `CreditNote` and `Refund` (strictly enforcing zero retro-edits on paid bills).
* **Practice Setup & Operations:** Basic doctor weekly availability grid (`DoctorAvailability`), personal time-blocking (`DoctorTimeBlock`), services catalog (`Service`), and front-desk appointment/walk-in management (`Appointment`).
* **Hold / Pending Scope:** **OPS-002 (Leave & Holiday Management)** is currently on **HOLD** pending Product Roadmap validation. Staff leave requests, holiday calendars, and recurring date-range overrides are not active in business logic.

---

### 1.2 Current Strengths
1. **Unified Appointment Status Machine:** A single state machine (`scheduled` → `checked_in` → `waiting` → `doctor_ready` → `in_consultation` → `completed` / `no_show` / `cancelled`) governs appointments across every role surface (Doctor, Receptionist, Owner, Patient).
2. **Indian OPD Native Workflows:** First-class support for walk-in registrations, token generation, mobile-first phone number patient identity (OTP login, family profile linking), and cash/UPI payment collection.
3. **Atomic Billing & Document Engine (M3A/M3B):** Every billable item generates a snapshotted `ServiceEvent` linked to an appointment, preventing price drift when service catalog pricing changes. Documents (Invoices, Receipts, Visit Summaries) are rendered from immutable JSON snapshots.
4. **Adaptive Surface Scoping:** The `/clinic` workspace dynamically adapts its navigation sidebar and dashboard views based on the caller's server-resolved role (`managing_doctor`, `practice_owner`, `receptionist`, `doctor`), keeping single-doctor solo practices simple while accommodating growing teams.
5. **Zero-Training Front Desk Board:** The `/staff/queue` Kanban board and `/clinic` Today view present clear, one-action stage progression (Check-in → Send in → Complete → Collect).

---

### 1.3 Current Weaknesses
1. **Dormant Leave & Schedule Overrides:** Doctor availability only supports recurring weekly hours (e.g., Mon–Fri 9:00–17:00). Date-specific leave and multi-day holiday management (OPS-002) are not connected to slot generation.
2. **Disconnected Notification Engine:** While `Notifications` are written to the database via event projections for patient appointment bookings, there is no live external SMS/WhatsApp delivery service active (uses log fallback / mockup).
3. **Manual Queue Re-ordering & Transfer:** The front-desk queue lacks drag-and-drop or automated urgency re-ordering. Transferring a patient between doctors requires multiple screen switches and dropdown selections.
4. **Isolated Patient Portal:** The patient portal (`/patient`) operates as a separate consumer web app rather than an integrated mobile app, limiting real-time push notifications.
5. **Limited Operational Analytics:** Owner analytics are restricted to surface-level metrics (today's revenue, patient count, upcoming appointments). Deeper operational KPIs (doctor utilization, room turnover, average wait times) are absent.

---

### 1.4 Product Architecture from User Perspective

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AURIVA PLATFORM IDENTITY LAYER                                 │
│                           User Account (Phone / OTP or Email + Password)                          │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
       STAFF & PRACTICE SURFACES                                     PATIENT PORTAL SURFACE
   (Scoped by Workspace / Org Member)                               (Scoped by Health Profile)
   
  ┌─────────────────────────────────┐                           ┌─────────────────────────────────┐
  │  Solo Clinic / Owner Workspace  │                           │       Patient Health Vault      │
  │           `/clinic`             │                           │            `/patient`           │
  │  (Dashboard, Today, Practice)   │                           │  (Book, Care, Records, Family)  │
  └─────────────────────────────────┘                           └─────────────────────────────────┘
  ┌─────────────────────────────────┐                           ┌─────────────────────────────────┐
  │    Front Desk Reception Desk    │                           │     Public Clinic Directory     │
  │            `/staff`             │                           │       `/patient/find-care`      │
  │   (Queue Board, Desk, Calendar) │                           │     (Doctor Profiles, Slots)    │
  └─────────────────────────────────┘                           └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │    Doctor Consult Workbench     │
  │           `/doctor`             │
  │  (Today, Workbench, Patients)   │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │     Organization Admin Hub      │
  │            `/admin`             │
  │ (Command Center, Team, Events)  │
  └─────────────────────────────────┘
```

---

### 1.5 Biggest UX Strengths
* **One Question Per Screen:** Every core screen strictly addresses one primary operational query (e.g., Doctor Today: *"Who's next?"*; Reception Board: *"What's the room doing?"*; Patient Home: *"What do I need to do today?"*).
* **Warmth vs. Efficiency Contrast:** Uses two design anchors: **Pine (`#0B4A41`)** for crisp clinical efficiency on staff screens, and **Honey (`#E8A24C`)** for warm, reassuring call-to-actions on patient screens.
* **Resilient State Management:** Standardized UI patterns for empty states, loading skeletons (no generic spinners), and 3-tier error handling ensure staff are never stranded on blank pages.

---

### 1.6 Biggest UX Problems
* **Navigation Overhead for Front-Desk Cashiers:** Moving from checking in a patient to collecting payment requires switching between `/staff/queue`, `/staff/billing`, and modal dialogs.
* **Context Switching in Doctor Workbench:** Reviewing a patient's historical lab recommendations or past treatment plans requires opening secondary side sheets or navigating away from the active prescription form.
* **Mobile Responsiveness Gaps on Complex Workspaces:** The multi-column Consultation Workbench and Queue Kanban board collapse into dense vertical lists on mobile screens, reducing situational awareness for doctors on phones.

---

### 1.7 Biggest Commercial Strengths
* **Encounter-to-Cash Lock-in:** Automatic invoice generation upon consultation completion guarantees zero unbilled visits.
* **Prepaid vs. Postpaid Gate Engine:** Flexible clinic-level billing policy configuration enables practices to mandate pre-consultation payment or soft-warn cashiers based on practice rules.
* **Treatment Plan Subscriptions (`TreatmentPlan`):** Multi-session care courses (physiotherapy, dental) allow clinics to sell high-value packages while billing each session individually upon attendance.

---

### 1.8 Biggest Commercial Gaps
* **Dormant Subscription Tiering:** Plan tiers (`solo`, `professional`, `enterprise`) exist in schema, but seat ceilings and feature locks are not enforced at runtime.
* **Missing Native Payment Gateway:** Payments are logged manually as Cash, UPI, or Card; there is no embedded Razorpay/Stripe web-checkout for online payments.
* **Lack of Multi-Branch Operational Reporting:** Owners with multi-clinic setups cannot compare branch-by-branch financial performance or doctor productivity in a unified command center.

---

## SECTION 2: NAVIGATION ARCHITECTURE

### 2.1 Role-Based Navigation Inventory

#### Role 1: Doctor (`/doctor`)
* **Sidebar Navigation:**
  * **Today** (`/doctor`) — *Question: "Who is waiting for me?"*
  * **Workbench** (`/doctor/workbench`) — *Question: "Who am I consulting right now?"*
  * **Patients** (`/doctor/patients`) — *Question: "What is this patient's medical history?"*
  * **Schedule** (`/doctor/schedule`) — *Question: "What are my bookable hours and blocked times?"*
  * **Practice** (`/doctor/practice`) — *Question: "How is my practice configured?"*
* **Top Navigation:** Organization / Clinic Switcher, Profile & Role Badge, What's New Bell (Release notes counter).
* **Context Navigation:** Today's patient queue list inside `/doctor`, active patient banner inside `/doctor/workbench`.
* **Secondary Navigation:** Consultation Workbench sub-tabs: *Vitals, Subjective/Notes, Diagnosis, Prescription, Labs & Tests, Treatment Plan*.
* **Hidden Navigation:** Direct patient record deep-link (`/doctor/patients/[id]`), Printable Prescription overlay (`/print/prescription/[id]`).
* **Quick Actions:** "Start Consultation", "Sign & Complete Visit", "Block Time", "Search Patient".
* **Mobile Navigation:** Bottom navigation bar displaying *Today, Workbench, Patients, Schedule*.

#### Role 2: Receptionist (`/staff`)
* **Sidebar Navigation:**
  * **Today Board** (`/staff/queue` or `/staff/dashboard`) — *Question: "What is happening in the clinic right now?"*
  * **Calendar** (`/staff/calendar`) — *Question: "What does the appointment book look like?"*
  * **Desk / Billing** (`/staff/billing`) — *Question: "Which invoices need collection?"*
  * **Lab Worklist** (`/staff/lab`) — *Question: "Which diagnostic orders are pending?"*
* **Top Navigation:** Global Search bar (`Search patients by name, mobile, health ID`), Doctor filter dropdown, Clinic Selector.
* **Context Navigation:** Queue stage columns (*Scheduled, Waiting, In Consult, Completed*).
* **Secondary Navigation:** Billing status filters (*All, Draft, Unpaid, Paid*).
* **Hidden Navigation:** Walk-in modal (`/staff/walkin`), Patient detail modal (`/staff/patients/[id]`), Checkout workspace (`/components/shared/checkout`).
* **Quick Actions:** "Register Walk-in", "Check In Patient", "Collect Payment", "Reschedule Visit".
* **Mobile Navigation:** Bottom tab bar mapping to *Board, Calendar, Desk, Search*.

#### Role 3: Practice Owner (`/clinic`)
* **Sidebar Navigation:**
  * **Dashboard** (`/clinic` - Home) — *Question: "What needs my attention today?"*
  * **Today** (`/clinic` - Today) — *Question: "What do I do next?"*
  * **Follow-ups** (`/clinic` - Followups) — *Question: "Who needs care follow-up?"*
  * **Calendar** (`/clinic` - Calendar) — *Question: "When are doctors available?"*
  * **Treatments** (`/clinic` - Treatments) — *Question: "What services and prices are active?"*
  * **Payments** (`/clinic` - Payments) — *Question: "What revenue was collected?"*
  * **Settings Group:**
    * **Practice** (`/clinic` - Practice) — Clinic profile, working hours, billing policy.
    * **Team** (`/clinic` - Team) — Staff roster, invitations, role grants.
    * **Plan** (`/clinic` - Plan) — Subscription details.
* **Top Navigation:** Accepting Bookings toggle switch, Patient Search bar, Demo Reset button (if demo org).
* **Quick Actions:** "Get Clinic Ready", "Copy Booking Link", "Share via WhatsApp", "Add Service".
* **Mobile Navigation:** Adaptive bottom bar with quick switcher for Dashboard, Today, Calendar, Payments, Settings.

#### Role 4: Administrator (`/admin`)
* **Sidebar Navigation:**
  * **Team Roster** (`/admin`) — Staff management, role assignment, status toggles.
  * **Departments** (`/admin/departments`) — Department creation and head assignment.
  * **Command Center** (`/admin/command-center`) — System metrics, active sessions, tenant health.
  * **Event Hub** (`/admin/events`) — Event bus monitor, DLQ inspect, replay triggers.
  * **Release Console** (`/admin/releases`) — Product release notes authoring (Platform Admin only).
  * **Settings** (`/admin/settings`) — Organization profile & timezone.
* **Top Navigation:** Workspace Switcher, Platform Admin Badge, Logout.
* **Quick Actions:** "Invite Staff Member", "Create Department", "Retry Failed Event", "Simulate Event Failure".

#### Role 5: Patient (`/patient`)
* **Sidebar / Bottom Navigation:**
  * **Home / Care Hub** (`/patient`) — *Question: "What is my upcoming care plan?"*
  * **Find Care** (`/patient/find-care`) — *Question: "Which doctor can I book?"*
  * **Health Records** (`/patient/records`) — *Question: "Where are my prescriptions and bills?"*
  * **Family** (`/patient/family`) — *Question: "Who else am I managing care for?"*
  * **Account / You** (`/patient/you`) — *Question: "What are my account settings?"*
* **Top Navigation:** Active Family Profile Switcher ("Acting as: Self / Child"), Notification Bell.
* **Quick Actions:** "Book Appointment", "Upload Report", "Download Prescription", "Add Family Member".

---

### 2.2 Navigation Flow Diagrams

```mermaid
graph TD
    subgraph Doctor Surface [/doctor]
        D_Today[Doctor Today / Dashboard] --> D_WB[Consultation Workbench]
        D_Today --> D_Pat[Patient Directory]
        D_Today --> D_Sched[Schedule & Time Blocks]
        D_WB --> D_Print[Print Prescription]
        D_Pat --> D_Rec[Patient Record View]
    end

    subgraph Reception Surface [/staff]
        R_Queue[Today Queue Board] --> R_Walk[Walk-in Registration]
        R_Queue --> R_Check[Check-in Action]
        R_Queue --> R_Bill[Billing Desk & Checkout]
        R_Queue --> R_Cal[Reception Calendar]
        R_Bill --> R_DocPrint[Print Invoice / Receipt]
    end

    subgraph Owner Surface [/clinic]
        O_Dash[Owner Adaptive Dashboard] --> O_Today[Today Operations]
        O_Dash --> O_Treat[Services & Pricing]
        O_Dash --> O_Pay[Payments Ledger]
        O_Dash --> O_Set[Practice & Team Settings]
    end

    subgraph Patient Surface [/patient]
        P_Home[Patient Home] --> P_Book[Book Appointment]
        P_Home --> P_Rec[Health Records Vault]
        P_Home --> P_Fam[Family Profile Switcher]
        P_Book --> P_Search[Find Care Directory]
    end
```

---

### 2.3 Navigation Flaws & Structural Observations
1. **Duplicate Workspace Surfaces:** High overlap between `/clinic` (Solo Owner view) and `/staff` (Reception Desk view). An owner-doctor must switch routes to access full queue filters.
2. **Confusing Profile Switcher Placement:** The family profile switcher in `/patient` is placed inside both the top navbar and the `/patient/you` screen, creating double navigation paths.
3. **Dead End Settings:** In `/admin/settings`, updating organization preferences lacks feedback toasts on certain sub-forms.
4. **Placeholder Navigation Links:** Navigation items for "Leave Management" and "Analytics Reports" redirect to dormant or partial views with "Coming Soon" indicators.

---

## SECTION 3: SCREEN INVENTORY

*(Documenting every primary screen in the codebase)*

| # | Screen Name | Route | Purpose | Primary User | Current Status | Key Dependencies |
|---|---|---|---|---|---|---|
| 1 | **Login** | `/login` | Dual-mode authentication (Staff password / Patient OTP) | All Users | Complete | `auth-service`, `otp-service` |
| 2 | **Change Password** | `/change-password` | Mandatory initial password update | Staff | Complete | `User.must_change_password` |
| 3 | **Workspace Selector** | `/workspace` | Select active Organization and Clinic | Multi-org Staff | Complete | `membership-service` |
| 4 | **Guided Onboarding** | `/start` | Initial clinic archetype setup | Practice Owner | Complete | `quick-setup-service` |
| 5 | **Register Organization** | `/register-org` | Create new tenant organization | Practice Owner | Complete | `organization-service` |
| 6 | **Solo Owner Dashboard** | `/clinic` (Home) | High-level practice overview & readiness | Owner / Doctor | Complete | `clinic-workspace-service` |
| 7 | **Owner Today View** | `/clinic` (Today) | Operational appointment queue & consultation start | Owner / Doctor | Complete | `appointment-service` |
| 8 | **Treatment Catalog** | `/clinic` (Treatments)| Configure clinic services, duration, and prices | Owner | Complete | `service-catalog-service` |
| 9 | **Owner Payments** | `/clinic` (Payments) | Financial collections and outstanding bills ledger | Owner / Reception | Complete | `billing-service` |
| 10 | **Practice Settings** | `/clinic` (Practice) | Profile, hours, accepting bookings toggle | Owner | Complete | `practice-profile-service` |
| 11 | **Team Panel** | `/clinic` (Team) | Staff roster, invitations, role management | Owner | Complete | `membership-service` |
| 12 | **Plan & Billing** | `/clinic` (Plan) | Tier subscription status and limits | Owner | Partial | `subscription-service` |
| 13 | **Doctor Today** | `/doctor` | Doctor's daily schedule and queue | Doctor | Complete | `doctor-service` |
| 14 | **Consult Workbench** | `/doctor/workbench` | Clinical note, vitals, Rx, lab ordering screen | Doctor | Complete | `consultation-service` |
| 15 | **Doctor Patients** | `/doctor/patients` | Patient directory and clinical lookup | Doctor | Complete | `patient-service` |
| 16 | **Doctor Patient Detail**| `/doctor/patients/[id]`| Complete timeline and medical history of patient | Doctor | Complete | `timeline-service` |
| 17 | **Doctor Schedule** | `/doctor/schedule` | Weekly hours and date-specific time blocks | Doctor | Complete | `availability-service` |
| 18 | **Doctor Profile** | `/doctor/profile` | Personal details, bio, registration number | Doctor | Complete | `doctor-service` |
| 19 | **Doctor Practice** | `/doctor/practice` | Read-only clinic operational policy view | Doctor | Complete | `clinic-service` |
| 20 | **Reception Today Board**| `/staff/queue` | Kanban operational queue for walk-ins & appts | Receptionist | Complete | `reception-service` |
| 21 | **Reception Dashboard** | `/staff/dashboard` | Front-desk metrics and queue summary | Receptionist | Complete | `dashboard-service` |
| 22 | **Reception Calendar** | `/staff/calendar` | Grid view of clinic appointments by doctor | Receptionist | Complete | `clinic-schedule-service` |
| 23 | **Billing Desk** | `/staff/billing` | Invoicing workspace, draft bills, collection | Receptionist | Complete | `checkout-service` |
| 24 | **Lab Worklist** | `/staff/lab` | Pending and resulted diagnostic orders | Receptionist / Lab | Complete | `lab-service` |
| 25 | **Walk-in Modal** | `/staff/walkin` | Quick walk-in patient registration & tokening | Receptionist | Complete | `walkin-service` |
| 26 | **Staff Patient Profile**| `/staff/patients/[id]` | Front-desk view of patient records & invoices | Receptionist | Complete | `patient-service` |
| 27 | **Admin Team Hub** | `/admin` | Organization-wide staff roster & invites | Admin | Complete | `organization-service` |
| 28 | **Admin Departments** | `/admin/departments` | Org department setup and lead staff assignment | Admin | Complete | `department-service` |
| 29 | **Admin Command Center**| `/admin/command-center`| System metrics, audit logs, active users | Admin | Complete | `command-center-service` |
| 30 | **Admin Event Hub** | `/admin/events` | Event log monitor, retry failed handlers, DLQ | Admin | Complete | `event-log-service` |
| 31 | **Admin Release Console**| `/admin/releases` | Draft and publish platform What's New notes | Platform Admin | Complete | `release-service` |
| 32 | **Admin Org Settings** | `/admin/settings` | Organization address, timezone, contact | Admin | Complete | `organization-service` |
| 33 | **Admin Setup Checklist**| `/admin/setup` | Organization onboarding task tracker | Admin | Complete | `quick-setup-service` |
| 34 | **Accept Staff Invite** | `/join/[token]` | Accept email/phone staff invitation | New Staff | Complete | `membership-service` |
| 35 | **Patient Home Hub** | `/patient` | Active care plan, upcoming visits, health alerts | Patient | Complete | `patient-service` |
| 36 | **Find Care Search** | `/patient/find-care` | Search doctors by specialty, location, fee | Patient | Complete | `shared/doctor-directory` |
| 37 | **Doctor Public Profile**| `/patient/doctors/[id]`| View doctor bio, reviews, fee, book slot | Patient | Complete | `booking-service` |
| 38 | **Patient Booking Flow**| `/patient/book` | Multi-step slot selection and booking confirmation | Patient | Complete | `booking-service` |
| 39 | **Patient Records Vault**| `/patient/records` | Access prescriptions, lab reports, invoices | Patient | Complete | `document-service` |
| 40 | **Patient Family** | `/patient/family` | Add/manage linked dependent health profiles | Patient | Complete | `identity-service` |
| 41 | **Patient Profile** | `/patient/profile` | Personal medical summary, allergies, emergency | Patient | Complete | `patient-service` |
| 42 | **Patient Account** | `/patient/you` | Account settings, linked profiles, logout | Patient | Complete | `identity-service` |
| 43 | **Patient Settings** | `/patient/settings` | Contact preferences and profile edit | Patient | Complete | `patient-service` |
| 44 | **Public Direct Booking**| `/book/[doctorId]` | Standalone public booking link for solo doctors | Public | Complete | `booking-service` |
| 45 | **Print Prescription** | `/print/prescription/[id]`| Clean printable layout for visit prescription | All Roles | Complete | `prescription.ts` |
| 46 | **Print Document** | `/print/document/[id]`| Printable layout for invoice/receipt/summary | All Roles | Complete | `document-service` |
| 47 | **Marketing Home** | `/` | Auriva landing page & product value prop | Public | Complete | `(marketing)` |
| 48 | **Marketing Pricing** | `/pricing` | Commercial pricing plans & feature breakdown | Public | Complete | `(marketing)` |
| 49 | **Marketing Solutions** | `/solutions` | Specialty-specific solution pages | Public | Complete | `(marketing)` |
| 50 | **Marketing Security** | `/security` | Compliance and data privacy documentation | Public | Complete | `(marketing)` |
| 51 | **Marketing Book Demo** | `/book-demo` | Demo request form | Public | Complete | `(marketing)` |

---

## SECTION 4: ROLE-BASED WORKFLOWS

### 4.1 Receptionist Workflow: Walk-in Patient to Collection

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. WALK-IN REQ  │────>│ 2. CHECK-IN     │────>│ 3. CONSULTATION │────>│ 4. CHECKOUT     │
│ Quick registration   │ Queue token    │ Doctor Workbench│ Cash/UPI payment│
│ Name + Phone    │     │ assigned        │     │ Rx generated    │     │ Receipt printed │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

* **Current Journey:** Patient arrives → Reception opens Walk-in Modal (`/staff/walkin`) → Inputs name & phone → System matches/creates `PatientProfile` → Queue token assigned → Patient status set to `waiting` → Doctor completes consult → In-consult status changes to `completed` → Invoice drafts automatically → Reception opens Desk (`/staff/billing`) → Collects cash/UPI → Invoice turns `paid` → Receipt printed.
* **Decision Points:** Selecting doctor availability; determining prepaid vs. postpaid gate enforcement.
* **Pain Points:** Cashier must manually switch tabs from queue to billing desk to settle payment.
* **Current Friction:** 4 navigation steps to move from completed consult to payment receipt.
* **Automation Opportunities:** Auto-prompt cashier with a popup checkout modal as soon as doctor signs consultation.

---

### 4.2 Doctor Workflow: Patient Encounter

* **Current Journey:** Doctor opens `/doctor` → Views Today Queue → Selects next patient ("Send In") → Consultation Workbench opens (`/doctor/workbench`) → Reviews past chief complaints & vitals → Records current vitals & diagnosis → Uses `ClinicalTemplate` for quick SOAP note entry → Adds medicines via Rx Editor → Recommends labs (`TestRecommendation`) → Sets follow-up date → Clicks "Sign & Complete".
* **Decision Points:** Prescribing catalog vs. custom medicines; creating follow-up appointment automatically.
* **Pain Points:** Adding new ad-hoc services during consultation requires manual text entry without live price validation.
* **Clicks Required:** ~8 clicks for standard return visit.

---

### 4.3 Patient Workflow: Online Booking & Care Access

* **Current Journey:** Patient receives link or opens `/patient/find-care` → Selects specialty/doctor → Chooses bookable slot → Confirms booking → Receives SMS/In-app notification → Attends visit → Views prescription and invoice instantly in `/patient/records`.
* **Friction:** No direct online payment gateway at time of booking; requires desk settlement.

---

## SECTION 5: FEATURE CAPABILITY MATRIX

| Module | Feature | Implementation Status | Notes / Limitations |
|---|---|---|---|
| **Queue** | Patient Search | ✅ Implemented | By name, mobile, Health ID |
| | Walk-in Registration | ✅ Implemented | Instant token generation |
| | Queue Reorder | 🟡 Partial | Priority weight scalar; drag-and-drop missing |
| | Status Machine | ✅ Implemented | Scheduled → Waiting → In Consult → Complete |
| **Doctor** | Consultation Workbench | ✅ Implemented | SOAP notes, vitals, Rx editor |
| | Doctor Availability Grid | ✅ Implemented | Weekly recurring hours + lunch break |
| | Time Blocking | ✅ Implemented | Date-specific slot block |
| | Clinical Templates | ✅ Implemented | Reusable note presets |
| **Billing** | Atomic Service Events | ✅ Implemented | Snapshotted service items (`ServiceEvent`) |
| | Invoicing | ✅ Implemented | Draft → Issued → Paid |
| | Payments | ✅ Implemented | Cash, UPI, Card recording |
| | Credit Notes & Refunds | ✅ Implemented | Compensating financial corrections |
| **Patient** | Health Vault | ✅ Implemented | Document storage & Rx downloads |
| | Family Profile Linking | ✅ Implemented | Dependent management under one phone |
| | Online Booking | ✅ Implemented | Real-time bookable slot engine |
| **Platform**| Event Bus | ✅ Implemented | Publish, DLQ, replay via `EventLog` |
| | Multi-Clinic Org | ✅ Implemented | Parent `Organization` entity |
| | Leave Management | 🔴 On Hold (OPS-002) | Pending roadmap validation |
| | SMS Provider | 🟡 Partial | Fallback log logger active; Twilio/MSG91 wired |

---

## SECTION 6: UI & DESIGN SYSTEM INVENTORY

### 6.1 Design Tokens (`src/app/globals.css`)
* **Pine Teal (Staff Efficiency Anchor):**
  * `Primary`: `hsl(170, 75%, 16%)` (`#0B4A41`)
  * `Primary Dark`: `hsl(172, 77%, 14%)` (`#083F37`)
  * `Primary Soft`: `hsl(164, 28%, 88%)` (`#CFE3DC`)
* **Honey Amber (Patient Warmth Anchor):**
  * `Honey`: `hsl(35, 78%, 60%)` (`#E8A24C`)
  * `Honey Deep`: `hsl(32, 81%, 29%)` (`#854A0B`)
  * `Honey Soft`: `hsl(38, 92%, 92%)` (`#FDF4E7`)
* **Typography:** `Inter`, `Roboto`, `Outfit` (Headings via Google Fonts).
* **Borders & Radii:** Standardized rounded corners (`rounded-lg` = `0.5rem`, `rounded-xl` = `0.75rem`).

---

### 6.2 Component Inventory
* **Buttons (`components/ui/button.tsx`):** Variants for `default` (Pine), `honey` (Amber CTA), `outline`, `ghost`, `destructive`.
* **Cards (`components/ui/card.tsx`):** Standard container with subtle borders and shadows (`shadow-sm`).
* **Tables (`components/ui/table.tsx`):** Clean tabular data view used in Admin staff rosters and Payments ledgers.
* **Dialogs / Sheets (`components/ui/dialog.tsx`, `sheet.tsx`):** Side panels for appointment drawers and checkout workspaces.
* **States (`components/ui/states.tsx`):** Standardized empty, loading skeleton, error, and success state displays.

---

## SECTION 7: SCREENSHOT & VISUAL LAYOUT CATALOG

### 7.1 Consultation Workbench Layout (`/doctor/workbench`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [← Back to Today]  PATIENT: Rajesh Kumar (34M) · ID: AUR-882910 · BP: 120/80 · Pulse: 72 bpm    │
├────────────────────────────────────────────────────────┬─────────────────────────────────────────┤
│ CLINICAL NOTES & EXAMINATION                           │ PRESCRIPTION EDITOR                     │
│ ┌────────────────────────────────────────────────────┐ │ ┌─────────────────────────────────────┐ │
│ │ Chief Complaint: Fever & dry cough x 3 days        │ │ │ Rx 1: Paracetamol 650mg              │ │
│ │ History: No known drug allergies                   │ │ │ 1-0-1 after food · 5 days             │ │
│ └────────────────────────────────────────────────────┘ │ └─────────────────────────────────────┘ │
│ DIAGNOSIS                                              │ LABS & TEST RECOMMENDATIONS             │
│ ┌────────────────────────────────────────────────────┐ │ ┌─────────────────────────────────────┐ │
│ │ Acute Upper Respiratory Tract Infection            │ │ │ [ ] Complete Blood Count (CBC)        │ │
│ └────────────────────────────────────────────────────┘ │ └─────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┴─────────────────────────────────────────┤
│  [Save Draft]                                                [ SIGN & COMPLETE CONSULTATION ]   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.2 Reception Today Queue Board (`/staff/queue`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  RECEPTION BOARD · Clinic: Springfield Medical · Doctor: All Doctors                             │
├───────────────────┬───────────────────┬───────────────────┬──────────────────────────────────────┤
│ SCHEDULED (3)     │ WAITING (2)       │ IN CONSULT (1)    │ COMPLETED (8)                        │
├───────────────────┼───────────────────┼───────────────────┼──────────────────────────────────────┤
│ [10:30 AM]        │ [Token #4]        │ [Token #3]        │ [Token #1]                           │
│ Anita Roy         │ Vikram Singh      │ Meera Patel       │ Sunita Rao                           │
│ Dr. Sharma        │ Dr. Sharma        │ Dr. Kapoor        │ Paid ₹500                            │
│ [Check In]        │ [Send In]         │ (In progress)     │ [View Receipt]                       │
└───────────────────┴───────────────────┴───────────────────┴──────────────────────────────────────┘
```

---

## SECTION 8: INFORMATION ARCHITECTURE

```
┌─────────────────┐       creates       ┌─────────────────┐       generates       ┌─────────────────┐
│ Patient Profile │────────────────────>│   Appointment   │──────────────────────>│  Service Event  │
└─────────────────┘                     └─────────────────┘                       └─────────────────┘
         │                                       │                                         │
         │ linked to                             │ referenced in                           │ builds
         ▼                                       ▼                                         ▼
┌─────────────────┐                     ┌─────────────────┐                       ┌─────────────────┐
│ Prescription /  │                     │ Clinical Record │                       │     Invoice     │
│ Lab Order       │                     │ (SOAP / Vitals) │                       │ (Draft / Paid)  │
└─────────────────┘                     └─────────────────┘                       └─────────────────┘
         │                                                                                 │
         └───────────────────────────────────────┬─────────────────────────────────────────┘
                                                 ▼
                                      ┌─────────────────────┐
                                      │ Document Renderer   │
                                      │ (Immutable Snapshot)│
                                      └─────────────────────┘
```

---

## SECTION 9: PRODUCT CAPABILITY MAP

| Capability Domain | Sub-domain | Current Maturity | Rating |
|---|---|---|---|
| **Clinical** | EMR & Consultation Notes | Complete SOAP, Vitals, Rx | 🟢 Strong |
| | Diagnostic Ordering | Referral recommendations active | 🟡 Medium |
| | Clinical Decision AI | Deferred on purpose (safety rules active) | 🔴 Missing |
| **Operations** | Appointments & Queue | Walk-in tokens, status machine | 🟢 Strong |
| | Staff Schedule & Leave | Weekly hours grid active; leave on hold | 🟡 Medium |
| **Finance** | Billing & Invoicing | Atomic `ServiceEvents`, draft/paid | 🟢 Strong |
| | Financial Corrections | Immutable ledger + Credit Notes | 🟢 Strong |
| | Online Payment Gateway | Manual Cash/UPI recording only | 🔴 Missing |
| **Patient** | Health Vault & Records | Rx and document downloads | 🟢 Strong |
| | Family Account Link | Multi-profile linked to one mobile | 🟢 Strong |
| **Platform** | Event Bus & Audit | Publish, DLQ, audit logging | 🟢 Strong |
| | Multi-Tenant Architecture| Real parent Organization entity | 🟢 Strong |

---

## SECTION 10: PRACTICE OPERATIONS READINESS

### 10.1 Evaluation for Independent Outpatient Clinics
* **Reception Readiness:** **High.** Front desk can handle walk-ins, phone bookings, queue tokens, and checkout payments efficiently.
* **Doctor Readiness:** **High.** Consultation Workbench offers low-friction charting, template dropping, and quick prescription generation.
* **Owner Operational Oversight:** **Medium.** Basic daily revenue and volume figures are clear, but multi-doctor commission tracking and detailed inventory management are absent.
* **Critical Blockers:**
  1. Lack of date-specific holiday/leave management (OPS-002 on hold).
  2. Manual payment recording without native UPI QR code display at desk.

---

## SECTION 11: TECHNICAL FEASIBILITY NOTES

### 11.1 Reusable Foundations & Services
* **State Machine:** `src/domain/appointment-status.ts` enforces legal state transitions across all API routes.
* **Billing Engine:** `src/services/billing-engine-service.ts` converts consultation events into relational invoice lines cleanly.
* **Document Platform (B3/B5):** `src/services/document-service.ts` renders unified JSON snapshots for print/PDF generation.
* **Event Platform:** `src/services/event-log-service.ts` handles idempotent event processing and DLQ management.

---

## SECTION 12: PRODUCT OFFICE OBSERVATIONS

*(Top 100 Objective Observations on Current Product Capabilities and User Experience)*

1. The Queue screen currently requires 4 navigation steps to transition a patient from completed consultation to payment collection.
2. The Doctor Workbench is currently optimized for desktop viewports and requires vertical scrolling on tablet displays.
3. The Owner currently lacks a dedicated operational dashboard on mobile viewports.
4. The Reception flow depends on manual doctor selection during walk-in registration.
5. Patient identity is strictly tied to phone numbers via OTP challenges.
6. Patients with no mobile phone can be registered by reception without creating an account.
7. An Account can link to multiple Healthcare Profiles under a single mobile number for family management.
8. The Appointment status state machine is strictly enforced server-side in `appointment-status.ts`.
9. Invoices cannot be edited after reaching the `paid` status; corrections require issuing a `CreditNote`.
10. Refunds are recorded against `CreditNote` entities to maintain financial compliance.
11. Atomic charges are snapshotted in `ServiceEvent` rows at the time of consultation.
12. Updating prices in the `Service` catalog does not mutate historical `ServiceEvent` prices.
13. Clinic operating hours are stored as weekly scalar strings (`opens_at`, `closes_at`).
14. Doctor availability supports single within-day break windows (e.g., lunch breaks).
15. Date-specific doctor time blocks (`DoctorTimeBlock`) prevent online patient bookings during blocked hours.
16. Multi-day leave requests (OPS-002) are currently on hold and dormant in schema.
17. The public booking page can be paused clinic-wide using the `accepting_bookings` flag.
18. Staff telephone-in bookings remain operational even when public online bookings are paused.
19. Organization members are explicitly assigned roles (`owner`, `doctor`, `receptionist`).
20. Platform administrative actions (release notes authoring) are gated by `is_platform_admin`.
21. Organization owners hold `super_admin` application roles by historical convention.
22. Multiple clinics can belong to a single parent `Organization`.
23. Each `Clinic` branch maintains independent service catalog pricing.
24. Staff profiles belong to specific clinic branches via `clinic_id`.
25. Departments group staff members within an organization and optional head staff.
26. Clinical note templates (`ClinicalTemplate`) allow doctors to pre-fill SOAP fields.
27. Diagnostic test recommendations (`TestRecommendation`) snapshot prep instructions from the catalog.
28. Patients can mark test recommendations as booked or upload external PDF reports.
29. Diagnostic test catalog contains 50+ pre-seeded common lab tests with preparation guidelines.
30. Treatment plans (`TreatmentPlan`) group multiple care sessions under a single title.
31. Each treatment plan session links to an appointment and generates a `ServiceEvent` when performed.
32. Unattended treatment plan sessions do not generate charges on the patient ledger.
33. Invoices support multi-invoice settlement against a single appointment encounter.
34. Invoices generated from appointments include frozen JSON representations of line items.
35. The Event Platform logs events with correlation IDs for transactional traceability.
36. Event handlers support automatic retries with exponential backoff before moving to DLQ.
37. Failed event handlers can be manually replayed from the Admin Event Hub (`/admin/events`).
38. Notifications are stored as patient-facing projections of system events.
39. The patient notification center supports unread counter badges.
40. What's New release announcements are tracked per-user via `ReleaseView` records.
41. What's New announcements display semver versions and bulleted highlight categories.
42. Password authentication for staff uses scrypt hashing (`scrypt$<salt>$<hash>`).
43. Staff initial logins require mandatory password rotation when `must_change_password` is set.
44. OTP challenges expire after a set time limit and cap verification attempts at 3 tries.
45. Development environments echo OTP codes in API responses when no SMS gateway is connected.
46. The platform integrates with Twilio, MSG91, and Exotel via driver interfaces.
47. Log fallback logger prints SMS payloads to stdout when live providers are unconfigured.
48. System health status is exposed via the `/api/health` endpoint.
49. Database readiness is checked via the `/api/ready` endpoint.
50. Clinic search calculates distance using Haversine formulas based on latitude/longitude coordinates.
51. Doctor ratings are calculated by aggregating individual completed visit reviews.
52. Patients can write at most one review per completed appointment.
53. Patients can favorite doctors to construct a personal care network.
54. Patient medical summary fields (allergies, chronic conditions) are stored as free-text.
55. Prescription medicines are stored as structured JSON arrays containing name, dosage, frequency, and duration.
56. Follow-up dates set during consultation auto-generate pending follow-up appointments.
57. Auto-scheduled follow-up appointments link back to their source appointment via `follow_up_source_appointment_id`.
58. Pre-consultation payment gates can soft-warn or hard-block consultation start based on clinic policy.
59. Billing policies support `prepaid`, `postpaid`, and `hybrid` operational modes.
60. Ad-hoc service events created during consultation flag `needs_catalog_review` for administrator cleanup.
61. Documents generated by the system are assigned unified human-readable numbers (e.g., `INV-2026-0003`).
62. Document regeneration increments the document version and marks prior documents as `superseded`.
63. Reprints of clinical documents always render the original saved JSON snapshot.
64. Demo mode operates on a sandboxed organization flagged with `is_demo = true`.
65. Demo reset wipes volatile appointments and re-seeds sample patients without touching customer orgs.
66. The `/start` onboarding wizard presents 6 clinic archetype choices.
67. Quick setup initializes clinic hours, default fees, and primary service catalog items.
68. The guided clinic readiness checklist tracks 5 onboarding milestones.
69. Sharing the clinic booking link updates `booking_shared_at` timestamp.
70. Global patient search searches across name, mobile, and Health ID fields simultaneously.
71. Search results return patient phone arrays and Health ID strings.
72. Active workspace selection is stored in session states.
73. Staff workspace switching updates the active membership context without re-authenticating.
74. The header navbar displays a visual warning badge when online bookings are paused.
75. Reception calendar supports filtering viewable appointments by specific staff doctor.
76. Reception calendar displays day, week, and agenda view representations.
77. Walk-in registration dialog defaults patient priority weight to zero.
78. Front-desk staff can mark appointments as `no_show` directly from the queue card.
79. Doctor Workbench displays patient age, gender, and blood group in the top header.
80. Doctor Workbench features a side drawer for quick access to past medical visit records.
81. Vitals input fields include Blood Pressure, Pulse, Temperature, SpO2, and Weight.
82. Prescriptions can be printed directly from the workbench using browser print stylesheets.
83. Printable prescription layouts include clinic logo, doctor registration number, and signature block.
84. Admin Command Center displays real-time counts of active users, total orgs, and total appointments.
85. Admin Department management allows re-assigning department head staff profiles.
86. Staff invitation creation generates a unique secure token with a 72-hour expiry window.
87. Revoking an invitation invalidates the invitation token immediately.
88. Accepting an invitation creates the `User`, `StaffProfile`, and `OrganizationMember` in a single transaction.
89. Deactivating a staff member sets `is_active = false` on both `User` and `StaffProfile` records.
90. Deactivated staff members are blocked from logging in at the authentication gate.
91. Patient Find Care directory allows filtering doctors by fee range and specialty.
92. Patient booking flow displays available time slots in 15-minute increments based on doctor schedule.
93. Patients can view past and upcoming appointments in separate tabbed views inside `/patient`.
94. Patient Health Records vault categorizes documents into Prescriptions, Lab Reports, and Invoices.
95. Emergency contacts stored in patient profiles include contact name and phone number.
96. The application uses Next.js App Router layout hierarchy for surface separation.
97. Global CSS styling relies on Tailwind utilities combined with custom HSL CSS variables.
98. Iconography is standardized across all surfaces using `lucide-react`.
99. Toast notifications are rendered globally using `sonner`.
100. Offline status is detected client-side and surfaces an `OfflineBanner` component across all pages.

---

> **End of Baseline Report.**  
> *Prepared for the Auriva Product Office review prior to Practice Operations BRD drafting.*
