# Package 2 Implementation Plan — Booking Management & Patient Self-Service

> **Document Type:** Level 3 Engineering Implementation Plan  
> **Target Release:** Milestone M2 (Release 1.4) — Package 2  
> **Status:** 🟡 WAITING FOR APPROVAL PRIOR TO CODE EXECUTION  
> **Baseline Execution Plan:** `M2_ENGINEERING_EXECUTION_PLAN.md`  
> **Package 1 Status:** ✅ MERGED TO `main` (Tag: `M2-PKG-1-GA`)

---

## 1. CODEBASE ASSESSMENT & GAP ANALYSIS

---

### 1.1 Existing Architecture Audit

| Architectural Domain | Existing Implementation in Codebase | Reusability for Package 2 |
|---|---|---|
| **1. Reschedule & Cancel Logic** | `rescheduleAppointment()` and `cancelAppointment()` in `src/services/appointment-service.ts`. | **100% Reusable.** Provides baseline status transitions and event logging. |
| **2. Cancellation Window Policy** | `Clinic.cancellation_window_hours` column in Prisma schema. | **100% Reusable.** Policy column exists; validation logic will be added to the service layer. |
| **3. Clinic Feature Flags** | `Clinic.self_service_enabled` feature flag. | **100% Reusable.** Added in Package 1; controls whether self-service cancel/reschedule is allowed. |
| **4. Appointment Token Lookup** | `Appointment.manage_token` (`@unique` UUID). | **100% Reusable.** Populated on all public bookings created in Package 1. |
| **5. Patient Portal Architecture** | `/patient` portal routes and patient session authentication. | **Needs Extension.** Patient Portal will invoke the unified `booking-management-service.ts`. |

---

### 1.2 Package 2 Unified Service Architecture

```
                               ┌─────────────────────────────────────────┐
                               │     UNIFIED BACKEND SERVICE LAYER       │
                               │   src/services/booking-mgmt-service.ts  │
                               └────────────────────┬────────────────────┘
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   │                                                                 │
                   ▼                                                                 ▼
┌─────────────────────────────────────┐                           ┌─────────────────────────────────────┐
│    PUBLIC TOKEN-BASED SURFACE       │                           │     AUTHENTICATED PATIENT PORTAL    │
│    GET/POST /api/public/manage/[token] │                           │    GET/POST /api/patient/appointments│
│    UI: /book/manage/[token]         │                           │    UI: /patient/appointments        │
└─────────────────────────────────────┘                           └─────────────────────────────────────┘
```

Both surfaces share 100% of policy validation rules:
1. **Feature Flag Check:** `Clinic.self_service_enabled` must be `true`.
2. **Cancellation Policy Enforcement:** `Clinic.cancellation_window_hours` checks if current time is before the allowed policy window.
3. **Slot Conflict Verification:** Rescheduling validates `assertNoDoctorSlotConflict()` and updates the slot atomically.

---

## 2. PACKAGE RELEASE CHECKLIST FOR PACKAGE 2

Every deliverable in Package 2 must satisfy the standard 10-point release gate:

- [ ] 1. **TypeScript Compilation:** `npx tsc --noEmit` passes with 0 errors.
- [ ] 2. **Automated Tests:** All Vitest unit and integration tests pass cleanly.
- [ ] 3. **Lint & Style:** Code conforms to project conventions and formatting rules.
- [ ] 4. **Schema Review:** All migrations are 100% additive and non-destructive.
- [ ] 5. **Backward Compatibility:** Pre-existing Release 1.3/M2-PKG1 endpoints remain unaffected.
- [ ] 6. **Feature Flags:** Enforces `Clinic.self_service_enabled` flag.
- [ ] 7. **Documentation:** OpenAPI/Service docstrings updated.
- [ ] 8. **Clean Code:** Zero `TODO` or `FIXME` comments remaining.
- [ ] 9. **QA Approval:** End-to-end self-service flow verified.
- [ ] 10. **Merge Readiness:** Single clean commit tagged `M2-PKG-2-GA`.

---

## 3. RECOMMENDED IMPLEMENTATION ORDER

Package 2 execution will follow a strict **5-Step Vertical Sequence**:

```
Step 1: Unified Service Layer (booking-management-service.ts)
   │
   ▼
Step 2: Public Self-Service APIs (/api/public/manage/[token])
   │
   ▼
Step 3: Authenticated Patient Portal API Extensions (/api/patient/appointments)
   │
   ▼
Step 4: Public Self-Service UI (/book/manage/[token]/page.tsx)
   │
   ▼
Step 5: Automated Vitest Unit & Integration Tests
```

---

## 4. API & UI DELIVERABLES

### 4.1 API Endpoints
1. **`GET /api/public/manage/[token]` (NEW):** Resolves appointment details, doctor, clinic address, and policy flags for a manage token.
2. **`POST /api/public/manage/[token]/reschedule` (NEW):** Validates policy and updates scheduled time.
3. **`POST /api/public/manage/[token]/cancel` (NEW):** Validates policy, sets status to `cancelled`, and releases slot.
4. **`GET /api/patient/appointments` (EXTENDED):** Lists active patient bookings with 1-click cancel/reschedule actions calling unified service.

### 4.2 Frontend UI
* **Public Self-Service Management Portal (`/book/manage/[token]`):**
  - Interactive appointment card with date/time, doctor photo, clinic address, and Google Maps directions link.
  - 1-click **Reschedule Appointment** dialog with interactive slot picker.
  - 1-click **Cancel Appointment** dialog with policy notice and cancellation reason input.

---

## 5. TESTING STRATEGY & VERIFICATION COMMANDS

```bash
# 1. Type check
npx tsc --noEmit

# 2. Run Package 2 Service Unit Tests
npx vitest run src/services/booking-management-service.test.ts

# 3. Run Full Test Suite Regression Check
npm run test
```

---

```markdown
# ==============================================================================
# PACKAGE 2 IMPLEMENTATION PLAN SUMMARY
# ==============================================================================

Plan File: PACKAGE2_IMPLEMENTATION_PLAN.md
Status: WAITING FOR USER APPROVAL PRIOR TO CODE EXECUTION
Target Package: Package 2 (Booking Management & Patient Self-Service)
```
