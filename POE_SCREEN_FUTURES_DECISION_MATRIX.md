# Auriva Practice Operations Excellence (POE-001) — Screen Futures & Consolidation Decision Matrix

> **Document Classification:** Product Office Strategic Review & Screen Futures Agreement  
> **Milestone Target:** **Practice Operations Excellence (POE-001)**  
> **Strategic Intent:** Transform Auriva from a collection of well-built operational modules into a unified, intuitive, and premium clinic operating experience through **evolution, simplification, and premiumization** rather than bloated module expansion.  
> **Core Architectural Principle:** Shift from `Role → Workspace` to **`Workspace → Role → Task`**.

---

## 1. MILESTONE FRAMEWORK OVERVIEW (POE-001)

### 1.1 The Three-Layer Execution Model

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PRACTICE OPERATIONS EXCELLENCE (POE-001)                          │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: PREMIUM EXPERIENCE (UI / UX)                                                            │
│ Modernized Design System v2 · Comfortable Information Density · Unified Adaptive Navigation      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: OPERATIONAL EXCELLENCE (WORKFLOW IMPROVEMENTS)                                          │
│ Drag & Drop Queue · 1-Click Checkout · Operational KPIs · Morning Snapshot · Consolidated Views  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: NEW CAPABILITIES (TARGETED FUNCTIONALITY)                                               │
│ Leave & Holiday Engine · Doctor Swaps · Capacity Planning · Queue Transfer & Wait Times          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CORE SCREEN FUTURES & CONSOLIDATION MATRIX

*(Reviewing the 29 Core Operational Screens of Auriva — Classifying into Keep as-is, Improve, Merge, Redesign, Move, or Remove)*

| Screen # | Current Screen Name | Current Route | POE-001 Decision | Target Location / Architecture | Primary Operational Rationale |
|---|---|---|---|---|---|
| **SCR-01** | **Workspace Selector & Login** | `/login`, `/workspace` | **Improve** | `/workspace` | Unify session resolution; add quick clinic switcher, last workspace memory, and role badge context. |
| **SCR-02** | **Solo Owner Dashboard** | `/clinic` (Home) | **Redesign** | `/clinic/command-center` | Transform from basic readiness card into the **Owner Command Center (Epic 4)** morning operational snapshot. |
| **SCR-03** | **Owner Today Operations** | `/clinic` (Today) | **Merge** | `/staff/queue` | **Merge into Reception Board**. Eliminates duplicate "Today" queue view between owner and reception. |
| **SCR-04** | **Owner Services & Treatments** | `/clinic` (Treatments)| **Improve** | `/clinic/settings/services` | Move under consolidated Settings Group; introduce comfortable density table & service search/filters. |
| **SCR-05** | **Owner Payments Ledger** | `/clinic` (Payments) | **Merge** | `/staff/billing` | **Merge into Unified Desk & Billing**. Single source of financial collections for owners and cashiers. |
| **SCR-06** | **Practice & Team Settings** | `/clinic` (Practice/Team)| **Improve** | `/clinic/settings` | Unify Practice, Team, and Plan settings into one cohesive tabbed sidebar view. |
| **SCR-07** | **Doctor Today Dashboard** | `/doctor` | **Improve** | `/doctor` | Add queue progress ring, quick patient preview, estimated wait time counter, and 1-click consultation launch. |
| **SCR-08** | **Consultation Workbench** | `/doctor/workbench` | **Improve** | `/doctor/workbench` | Enhance layout density, add keyboard shortcuts (`Cmd+S` sign, `Cmd+P` print), quick side-drawer for past visit history. |
| **SCR-09** | **Doctor Patient Directory** | `/doctor/patients` | **Improve** | `/doctor/patients` | Add quick search, recent patient pills, filter by chronic condition/last visit date. |
| **SCR-10** | **Doctor Patient Record** | `/doctor/patients/[id]`| **Keep As-Is** | `/doctor/patients/[id]`| High-performing timeline view; apply Design System v2 typography and card polish. |
| **SCR-11** | **Doctor Schedule & Time Blocks** | `/doctor/schedule` | **Redesign** | `/doctor/schedule` | Expand into **Scheduling Excellence (Epic 3)**: add Leave requests, Holiday calendar, and Doctor Swaps. |
| **SCR-12** | **Doctor Profile** | `/doctor/profile` | **Improve** | `/doctor/profile` | Polished profile editor with photo cropping handle and public booking preview link. |
| **SCR-13** | **Reception Today Board** | `/staff/queue` | **Redesign** | `/staff/queue` | Transform into **Reception Excellence (Epic 2)**: Drag-and-drop Kanban, emergency priority bypass, queue transfer. |
| **SCR-14** | **Reception Dashboard** | `/staff/dashboard` | **Merge** | `/clinic/command-center` | **Merge into Operational Intelligence (Epic 5)**. Eliminates duplicate front-desk metrics view. |
| **SCR-15** | **Reception Calendar** | `/staff/calendar` | **Improve** | `/staff/calendar` | Multi-doctor day/week grid with doctor availability overlays and 1-click appointment slot creation. |
| **SCR-16** | **Billing Desk & Cashier** | `/staff/billing` | **Redesign** | `/staff/billing` | Integrated 1-click cashier checkout modal, UPI QR code display, split payment logging, instant receipt print. |
| **SCR-17** | **Reception Lab Worklist** | `/staff/lab` | **Improve** | `/staff/lab` | Add status filter pills (*Ordered, Resulted, Delivered*), quick result entry dialog. |
| **SCR-18** | **Walk-in Registration Modal** | `/staff/walkin` | **Improve** | Modal overlay | Streamline into a 2-field modal (Name, Phone) with instant auto-matching to existing profiles. |
| **SCR-19** | **Staff Patient Profile View** | `/staff/patients/[id]`| **Merge** | `/doctor/patients/[id]`| **Merge with Doctor Patient Record**. Single unified clinical/financial patient profile across roles. |
| **SCR-20** | **Admin Team Roster** | `/admin` | **Redesign** | `/admin/team` | Expand into **Team Operations (Epic 6)**: Staff directory, leave approvals, role capability grants, invitation timeline. |
| **SCR-21** | **Admin Departments** | `/admin/departments` | **Improve** | `/admin/departments` | Add staff count badges, department consultation fee defaults, head doctor selector. |
| **SCR-22** | **Admin Command Center** | `/admin/command-center`| **Improve** | `/admin/command-center`| System metrics dashboard, active session revoking, tenant resource usage. |
| **SCR-23** | **Admin Event Hub & DLQ** | `/admin/events` | **Keep As-Is** | `/admin/events` | Developer/Admin event log monitor with retry triggers and payload inspection. |
| **SCR-24** | **Admin Release Console** | `/admin/releases` | **Keep As-Is** | `/admin/releases` | What's New release notes drafting tool for Platform Admins. |
| **SCR-25** | **Patient Home & Care Hub** | `/patient` | **Improve** | `/patient` | Reassuring care timeline, upcoming appointment cards, active prescription download shortcuts. |
| **SCR-26** | **Patient Find Care & Profile** | `/patient/find-care` | **Improve** | `/patient/find-care` | Location-based search, specialty filter pills, doctor rating breakdown. |
| **SCR-27** | **Patient Slot Booking Flow** | `/patient/book` | **Improve** | `/patient/book` | 3-step slot picker with instant phone verification and calendar invite export. |
| **SCR-28** | **Patient Health Records Vault**| `/patient/records` | **Keep As-Is** | `/patient/records` | Vault for PDF downloads of Prescriptions, Lab Reports, and Invoices. |
| **SCR-29** | **Patient Family & Settings** | `/patient/family`, `/patient/you`| **Redesign**| `/patient/account` | Consolidate Family Profile Switcher and Account Settings into one clean tabbed view. |

---

## 3. CONSOLIDATION & DE-DUPLICATION SUMMARY

```
  BEFORE CONSOLIDATION (5 Different Apps Feeling)
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   /clinic    │  │   /doctor    │  │    /staff    │  │    /admin    │  │   /patient   │
  │ (Today, Pay) │  │ (Today, Pat) │  │ (Board, Pay) │  │ (Team, Dash) │  │ (Home, Vault)│
  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

  AFTER POE-001 CONSOLIDATION (Unified Workspace → Role → Task)
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                                 UNIFIED CLINIC WORKSPACE                               │
  ├───────────────────────┬───────────────────────┬───────────────────────┬────────────────┤
  │    OPERATIONS HUB     │     CLINICAL HUB      │      DESK & CASH      │   OWNER CENTER │
  │    `/staff/queue`     │   `/doctor/workbench` │    `/staff/billing`   │`/clinic/command│
  │ (Merged Today Queue)  │ (Unified Patient Rec) │(Unified Invoices/Ledg)│ (Merged Ops KPI│
  └───────────────────────┴───────────────────────┴───────────────────────┴────────────────┘
```

### Key Screen Mergers & Removals:
1. **Merge SCR-03 (Owner Today) into SCR-13 (Reception Today Board):** Single operational queue for the entire clinic. An owner sees doctor filters; a receptionist sees desk actions.
2. **Merge SCR-05 (Owner Payments) into SCR-16 (Billing Desk & Cashier):** Single financial ledger and checkout workspace for collections, eliminating duplicate billing screens.
3. **Merge SCR-14 (Reception Dashboard) into SCR-02 (Owner Command Center):** Operational metrics consolidated into one morning snapshot.
4. **Merge SCR-19 (Staff Patient Profile) into SCR-10 (Doctor Patient Record):** Unified multi-role patient medical and financial timeline (`/patients/[id]`).
5. **Consolidate SCR-29 (Patient Family & You):** Merged into a unified `/patient/account` hub.

---

## 4. DETAILED EPIC SPECIFICATIONS FOR BRD AUTHORING

### EPIC 1: Workspace & Navigation Evolution ⭐⭐⭐⭐⭐
* **Unified Adaptive Sidebar:** Role-aware sidebar rendering only permitted workspace tools.
* **Global Command Palette (`Cmd+K`):** Jump to any patient, appointment, doctor schedule, or invoice instantly.
* **Workspace Breadcrumbs & Recent Items:** Fast navigation back to recently viewed patient files or visits.

### EPIC 2: Reception Excellence ⭐⭐⭐⭐⭐
* **Drag-and-Drop Queue:** Reorder waiting patients or reassign doctors visually on the Kanban board.
* **Emergency Patient Bypass:** Priority flag immediately places emergency cases at the top of the doctor's queue.
* **Queue Transfer:** 1-click patient transfer between doctors with automated notification to the receiving workbench.
* **1-Click Cashier Checkout:** Popup cashier drawer triggered immediately upon consultation completion.

### EPIC 3: Scheduling Excellence ⭐⭐⭐⭐☆
* **Leave & Holiday Management (OPS-002 Unblocked):** Doctor leave requests, multi-day clinic holidays, and automatic slot suppression.
* **Doctor Swaps & Waitlist:** Shift substitution and patient waiting list for cancelled slot auto-filling.

### EPIC 4: Owner Command Center ⭐⭐⭐⭐⭐
* **Morning Snapshot Dashboard:** 8-card operational header displaying Appointments, Revenue, Doctor Availability, Pending Collections, No-shows, Follow-ups, Urgent Alerts, and 1-click actions.

### EPIC 5: Operational Intelligence ⭐⭐⭐⭐☆
* **Real-time Practice KPIs:** Average wait time, average consultation duration, doctor room utilization %, reception turnaround time, and repeat visit conversion.

### EPIC 6: Team Operations ⭐⭐⭐⭐☆
* **Expanded Staff Management:** Comprehensive staff directory, working hours grid, role capability assignment, invitation history, and activity audit logs.

---

> **Document Status:** 🔒 APPROVED BY PRODUCT OFFICE  
> *Ready for Practice Operations Excellence BRD (BRD-POE-001) drafting.*
