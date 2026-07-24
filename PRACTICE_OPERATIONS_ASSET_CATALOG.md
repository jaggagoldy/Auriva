# Auriva Practice Operations Platform — Asset Catalog

> **Document Classification:** Technical Engineering Inventory  
> **Target Audience:** Software Engineering Team, Technical Architects, Lead Developers  
> **Purpose:** Exhaustive catalog of existing reusable pages, components, hooks, services, APIs, Prisma models, and design-system elements in the Auriva codebase.  
> **Status:** 🔒 FROZEN BASELINE INVENTORY

---

## 1. PAGE ROUTES INVENTORY (`src/app/**`)

### 1.1 Core & Workspace Surface Routes
* `src/app/login/page.tsx` — Unified login screen (Dual mode: Staff Password / Patient OTP).
* `src/app/change-password/page.tsx` — Mandatory password reset on first staff login.
* `src/app/workspace/page.tsx` — Multi-workspace selection and tenant switcher.
* `src/app/start/page.tsx` — Onboarding practice archetype selector and setup wizard.
* `src/app/register-org/page.tsx` — Organization creation and owner signup page.
* `src/app/join/[token]/page.tsx` — Staff invitation acceptance screen.

### 1.2 Practice Owner Surface (`/clinic`)
* `src/app/clinic/page.tsx` — Adaptive Owner Workspace (Home Dashboard, Today Queue, Treatments Catalog, Payments Ledger, Settings Group).

### 1.3 Doctor Surface (`/doctor`)
* `src/app/doctor/page.tsx` — Doctor Today Dashboard & daily appointment list.
* `src/app/doctor/workbench/page.tsx` — Consultation Workbench (Vitals, SOAP notes, Rx editor, Lab ordering).
* `src/app/doctor/patients/page.tsx` — Doctor Patient Directory and search.
* `src/app/doctor/patients/[id]/page.tsx` — Full Patient Medical History & Clinical Timeline.
* `src/app/doctor/schedule/page.tsx` — Weekly Working Hours and Time Block Management.
* `src/app/doctor/profile/page.tsx` — Doctor Personal & Clinical Profile editor.
* `src/app/doctor/practice/page.tsx` — Read-only Practice Policy & Fees reference.

### 1.4 Reception & Front Desk Surface (`/staff`)
* `src/app/staff/page.tsx` — Reception Operational Entry Point.
* `src/app/staff/queue/page.tsx` — Today Kanban Board & Operational Queue.
* `src/app/staff/dashboard/page.tsx` — Operational Metrics & Front-Desk Dashboard.
* `src/app/staff/calendar/page.tsx` — Appointment Calendar Grid view by doctor.
* `src/app/staff/billing/page.tsx` — Billing Desk, Cashier Workspace & Collections Board.
* `src/app/staff/lab/page.tsx` — Diagnostic Lab Orders Worklist.
* `src/app/staff/walkin/page.tsx` — Standalone Walk-in Registration screen.
* `src/app/staff/patients/[id]/page.tsx` — Front-desk Patient Medical Profile view.

### 1.5 Organization Administration Surface (`/admin`)
* `src/app/admin/page.tsx` — Staff Roster & Team Management Hub.
* `src/app/admin/departments/page.tsx` — Department Setup & Staff Assignment.
* `src/app/admin/command-center/page.tsx` — System Health & Active Session Monitor.
* `src/app/admin/events/page.tsx` — Event Log Monitor, Retry Console & DLQ Inspector.
* `src/app/admin/releases/page.tsx` — What's New & Release Notes Authoring Console.
* `src/app/admin/settings/page.tsx` — Organization Configuration.
* `src/app/admin/setup/page.tsx` — Onboarding Checklist & Progress Tracker.

### 1.6 Patient Portal Surface (`/patient`)
* `src/app/patient/page.tsx` — Patient Home & Active Care Hub.
* `src/app/patient/find-care/page.tsx` — Find Care Directory & Doctor Search.
* `src/app/patient/doctors/[id]/page.tsx` — Public Doctor Detail & Slot Booking.
* `src/app/patient/book/page.tsx` — Patient Online Booking Flow.
* `src/app/patient/records/page.tsx` — Health Records Vault (Rx, Labs, Invoices).
* `src/app/patient/family/page.tsx` — Family Profile Linking & Dependent Care.
* `src/app/patient/profile/page.tsx` — Patient Health Summary & Medical Profile.
* `src/app/patient/you/page.tsx` — Account Hub & Family Switcher.
* `src/app/patient/settings/page.tsx` — Patient Contact & Profile Settings.

### 1.7 Public & Document Print Surfaces
* `src/app/book/[doctorId]/page.tsx` — Public Standalone Booking Page.
* `src/app/print/prescription/[id]/page.tsx` — Printable Prescription Layout.
* `src/app/print/document/[id]/page.tsx` — Printable Invoice, Receipt & Summary Layout.
* `src/app/(marketing)/page.tsx` — Public Landing Page.

---

## 2. REUSABLE UI PRIMITIVES (`src/components/ui/*`)

| Primitive Component | Location | Description / Purpose |
|---|---|---|
| `Button` | `src/components/ui/button.tsx` | Standardized button with `default`, `honey`, `outline`, `ghost`, `destructive` variants. |
| `Card` | `src/components/ui/card.tsx` | Surface card container with header, content, footer sections. |
| `Input` | `src/components/ui/input.tsx` | Form text input with focus ring & token styling. |
| `Textarea` | `src/components/ui/textarea.tsx` | Multi-line text input for clinical notes. |
| `Select` | `src/components/ui/select.tsx` | Accessible dropdown select component (Radix UI wrapper). |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal dialog primitive for popups. |
| `Sheet` | `src/components/ui/sheet.tsx` | Side sheet drawer for secondary workspaces. |
| `Table` | `src/components/ui/table.tsx` | Data table with header, body, row, cell primitives. |
| `Badge` | `src/components/ui/badge.tsx` | Status pill badge (pine, honey, success, warning, destructive). |
| `Avatar` | `src/components/ui/avatar.tsx` | User profile avatar with initials fallback. |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Animated loading placeholder block. |
| `Toaster / Sonner` | `src/components/ui/sonner.tsx` | Global toast notification handler. |
| `Tooltip` | `src/components/ui/tooltip.tsx` | Hover information tooltip. |
| `States` | `src/components/ui/states.tsx` | Standardized Empty, Loading, Error, and Success state UI blocks. |
| `OfflineBanner` | `src/components/ui/offline-banner.tsx` | Banner alerting user of offline network state. |

---

## 3. FEATURE DOMAIN COMPONENTS

### 3.1 Shared & Cross-Cutting Components (`src/components/shared/*`)
* `CheckoutWorkspace` (`src/components/shared/checkout/checkout-workspace.tsx`) — Instant cashier payment collection, cash/UPI/card handler, bill split, receipt generator.
* `ServiceCapture` (`src/components/shared/service-capture.tsx`) — Add ad-hoc or catalog services to an active consultation.
* `TreatmentPlan` (`src/components/shared/treatment-plan/treatment-plan.tsx`) — Multi-session treatment plan creator and session tracker.
* `ClinicalArtifacts` (`src/components/shared/documents/clinical-artifacts.tsx`) — Document history drawer for invoices, receipts, and visit summaries.
* `DocumentRenderer` (`src/components/shared/documents/document-renderer.tsx`) — Renders immutable JSON document snapshots for view/print.
* `AppointmentDrawer` (`src/components/shared/appointment-drawer.tsx`) — Side drawer displaying full details of a selected appointment.
* `CommandPalette` (`src/components/shared/command-palette.tsx`) — Keyboard-driven global search and action palette (`Cmd+K`).
* `WhatsNew` (`src/components/shared/whats-new.tsx`) — Release notes popover and unread badge handler.
* `WorkspaceSwitcher` (`src/components/shared/workspace-switcher.tsx`) — Dropdown to change active clinic branch.

### 3.2 Doctor Components (`src/components/doctor/*`)
* `ConsultWorkbenchView` (`src/components/doctor/doctor-workbench-view.tsx`) — Primary consultation layout.
* `PrescriptionEditor` (`src/components/doctor/prescription-editor.tsx`) — Structured medication authoring form.
* `ConsultationCompleteModal` (`src/components/doctor/consultation-complete-modal.tsx`) — Visit sign-off and follow-up prompt.
* `DoctorSchedule` (`src/components/doctor/doctor-schedule.tsx`) — Availability hours editor and date time-blocker.
* `DoctorToday` (`src/components/doctor/doctor-today.tsx`) — Doctor's daily queue view.
* `QueueSidebar` (`src/components/doctor/queue-sidebar.tsx`) — Side queue list inside workbench.

### 3.3 Reception & Staff Components (`src/components/staff/*`)
* `QueueBoard` (`src/components/staff/queue-board.tsx`) — Today operational Kanban board.
* `QueueColumn` (`src/components/staff/queue-column.tsx`) — Stage column inside Kanban board.
* `QueueCard` (`src/components/staff/queue-card.tsx`) — Appointment card in queue.
* `WalkinModal` (`src/components/staff/walkin-modal.tsx`) — Walk-in patient registration modal.
* `BillingBoard` (`src/components/staff/billing-board.tsx`) — Desk checkout and unpaid bill list.
* `ReceptionCalendar` (`src/components/staff/reception-calendar.tsx`) — Doctor schedule grid view.
* `LabWorklist` (`src/components/staff/lab-worklist.tsx`) — Diagnostic test worklist manager.
* `GlobalSearch` (`src/components/staff/global-search.tsx`) — Universal patient lookup input.

### 3.4 Clinic Owner Components (`src/components/clinic/*`)
* `DashboardView` (`src/components/clinic/dashboard-view.tsx`) — Adaptive operational metrics dashboard.
* `PracticeSetup` (`src/components/clinic/practice-setup.tsx`) — Clinic profile, logo upload, facilities configuration.
* `BillingPolicySettings` (`src/components/clinic/billing-policy-settings.tsx`) — Prepaid/postpaid gate rules configuration.
* `ConsultationGateDialog` (`src/components/clinic/consultation-gate-dialog.tsx`) — Warning/block dialog for unpaid prepaid consultations.
* `TeamRoster` (`src/components/clinic/team-roster.tsx`) — Staff list, role grants, invite triggers.
* `ConsultTemplates` (`src/components/clinic/consult-templates.tsx`) — SOAP note template manager.

---

## 4. APPLICATION & DOMAIN SERVICES (`src/services/*`)

| Service Module | File Location | Key Responsibilities |
|---|---|---|
| **Appointment Service** | `src/services/appointment-service.ts` | Appointment creation, status machine transitions, queue numbers. |
| **Reception Service** | `src/services/reception-service.ts` | Front-desk queue queries, check-in actions, today's metrics. |
| **Walkin Service** | `src/services/walkin-service.ts` | Rapid walk-in registration, patient lookup/creation, tokening. |
| **Consultation Service** | `src/services/consultation-service.ts` | Vitals logging, diagnosis recording, visit sign-and-complete. |
| **Billing Service** | `src/services/billing-service.ts` | Invoice generation, line item aggregation, payment recording. |
| **Billing Engine Service** | `src/services/billing-engine-service.ts` | Converts `ServiceEvents` to `InvoiceLines`, handles taxes/discounts. |
| **Checkout Service** | `src/services/checkout-service.ts` | Instant cashier checkout processing, receipts, payment balances. |
| **Corrections Service** | `src/services/corrections-service.ts` | Credit Notes generation and Refund processing against paid bills. |
| **Service Event Service** | `src/services/service-event-service.ts` | Atomic charge lifecycle (`draft` → `finalized` → `reversed`). |
| **Service Catalog Service**| `src/services/service-catalog-service.ts` | Manage treatments catalog, pricing, durations, categories. |
| **Document Service** | `src/services/document-service.ts` | Immutable document snapshot assembly (Invoices, Receipts, Summaries). |
| **Availability Service** | `src/services/availability-service.ts` | Slot generation math, doctor hours, break hours, time blocks. |
| **Clinic Schedule Service** | `src/services/clinic-schedule-service.ts` | Calendar grid aggregation by doctor and date. |
| **Treatment Plan Service** | `src/services/treatment-plan-service.ts` | Care course setup, session sequencing, appointment linkage. |
| **Test Recommendation Service**| `src/services/test-recommendation-service.ts` | Referral diagnostic test ordering and report upload tracking. |
| **Clinical Template Service**| `src/services/clinical-template-service.ts` | SOAP note preset storage and retrieval. |
| **Identity Service** | `src/services/identity-service.ts` | Health ID generation, family profile linking, OTP auth. |
| **Patient Service** | `src/services/patient-service.ts` | Patient record lookup, medical history, emergency contacts. |
| **Doctor Resolution** | `src/services/doctor-resolution.ts` | Resolves active bookable doctors per clinic. |
| **Organization Service** | `src/services/organization-service.ts` | Org creation, tenant configuration, clinic management. |
| **Membership Service** | `src/services/membership-service.ts` | Staff role assignments, invitations, multi-clinic grants. |
| **Department Service** | `src/services/department-service.ts` | Department creation and head staff profile assignments. |
| **Event Log Service** | `src/services/event-log-service.ts` | Shared event bus publishing, retry loops, DLQ operations. |
| **Release Service** | `src/services/release-service.ts` | What's New release note drafting and publishing logic. |
| **OTP Service** | `src/services/otp-service.ts` | Secure patient OTP challenge issue, hashing, verification. |
| **Storage Service** | `src/services/storage/storage-service.ts` | File upload handle generation and binary file storage. |

---

## 5. API ENDPOINTS INVENTORY (`src/app/api/**`)

### 5.1 Authentication & Workspace APIs
* `POST /api/auth/login` — Staff password authentication & session creation.
* `POST /api/auth/logout` — Terminate active user session.
* `POST /api/auth/otp/send` — Issue fresh patient OTP challenge.
* `POST /api/auth/otp/verify` — Verify OTP and initiate patient session.
* `POST /api/auth/password/change` — Execute staff mandatory password update.
* `POST /api/auth/switch-profile` — Switch active patient family profile.
* `POST /api/workspace/switch` — Change active staff clinic workspace.

### 5.2 Appointments & Reception APIs
* `GET/POST /api/appointments` — List appointments or book new visit.
* `GET/PATCH /api/appointments/[id]` — Fetch appointment or update status.
* `POST /api/reception/walkin` — Register walk-in patient & issue queue token.
* `POST /api/reception/checkin` — Check in patient and assign queue number.
* `GET /api/reception/queue` — Fetch today's operational queue by stage.
* `GET /api/reception/dashboard` — Fetch front-desk metrics summary.

### 5.3 Clinical & Consultation APIs
* `POST /api/clinic/consultation` — Save consultation notes, vitals, Rx.
* `POST /api/clinic/consultation-gate` — Verify prepaid billing gate before consult start.
* `GET/POST /api/clinic/templates` — List or create clinical note templates.
* `GET/POST /api/clinic/treatment-plans` — Manage multi-session treatment plans.
* `GET/POST /api/lab-orders` — Create or resulted lab orders.

### 5.4 Billing & Payments APIs
* `GET/POST /api/billing/invoices` — List or generate patient invoices.
* `POST /api/billing/invoices/[id]/payments` — Record payment against invoice.
* `POST /api/clinic/checkout` — Execute instant cashier checkout.
* `GET/POST /api/clinic/service-events` — Manage atomic billing service events.
* `POST /api/clinic/corrections` — Generate Credit Note or issue Refund.
* `GET/POST /api/clinic/documents` — Retrieve generated JSON clinical documents.

### 5.5 Organization & Staff Admin APIs
* `GET/POST /api/organizations` — Org management.
* `GET/POST /api/organizations/[id]/staff` — Manage staff profiles.
* `GET/POST /api/organizations/[id]/departments` — Manage departments.
* `GET/POST /api/organizations/[id]/invitations` — Issue or revoke staff invites.
* `POST /api/invitations/[token]/accept` — Accept invitation and provision account.
* `GET/POST /api/organizations/[id]/events` — Inspect system event logs.
* `POST /api/organizations/[id]/events/[eventId]/retry` — Replay failed event.

---

## 6. DATABASE MODELS & PRISMA ENTITIES (`prisma/schema.prisma`)

* **Identity & Membership:** `User`, `Organization`, `OrganizationMember`, `Session`, `Clinic`, `Department`, `StaffProfile`, `Invitation`.
* **Clinical & Encounter:** `PatientProfile`, `Contact`, `AccountProfileLink`, `Appointment`, `Prescription`, `TestRecommendation`, `ClinicalTemplate`, `LabOrder`.
* **Billing & Ledger:** `Service`, `ServiceEvent`, `Invoice`, `InvoiceLine`, `Payment`, `CreditNote`, `Refund`, `Document`.
* **Practice Setup & Schedule:** `DoctorAvailability`, `DoctorTimeBlock`, `TreatmentPlan`, `TreatmentPlanSession`.
* **Platform & Audit:** `AuditLog`, `AppointmentEvent`, `EventLog`, `EventHandlerLog`, `Release`, `ReleaseHighlight`, `ReleaseView`, `Sprint`, `Notification`, `OtpChallenge`, `Review`, `PatientFavoriteDoctor`.

---

## 7. CUSTOM HOOKS & UTILITIES

* `useDoctorDirectory` (`src/components/shared/use-doctor-directory.ts`) — Hook to fetch active doctor roster by clinic.
* `requirePasswordChanged` (`src/lib/require-password-changed.ts`) — Server-side guard checking mandatory password status.
* `rateLimit` (`src/lib/rate-limit.ts`) — In-memory rate limiter for auth & OTP endpoints.
* `audit` (`src/lib/audit.ts`) — Writes transactional audit logs to `AuditLog`.
* `events` (`src/lib/events.ts`) — Helper to publish events to `EventLog`.

---

## 8. DOMAIN CONSTANTS & HELPERS

* `src/domain/appointment-status.ts` — Legal appointment status state machine definitions.
* `src/domain/service-event-status.ts` — Charge lifecycle status definitions.
* `src/domain/billing-policy.ts` — Prepaid/postpaid gate validation logic.
* `src/domain/authorization.ts` — Role capability definitions and permission rules.
* `src/domain/diagnostics-catalog.ts` — Pre-seeded diagnostic test catalog.
* `src/shared/medicine-catalog.ts` — Pre-seeded medicine catalog for prescription editor.
* `src/domain/health-id.ts` — Format generator for unique Health IDs (`AUR-XXXXXX`).

---

> **End of Asset Catalog.**  
> *Prepared for Engineering Team reference during Practice Operations Platform implementation.*
