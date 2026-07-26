# Package 1 Implementation Plan — Public Booking Foundation

> **Document Type:** Level 3 Engineering Implementation Plan  
> **Target Release:** Milestone M2 (Release 1.4) — Package 1  
> **Status:** 🟡 WAITING FOR APPROVAL PRIOR TO CODE EXECUTION  
> **Baseline Execution Plan:** `M2_ENGINEERING_EXECUTION_PLAN.md`

---

## 1. CODEBASE ASSESSMENT & GAP ANALYSIS

A thorough audit of the current Auriva codebase (`main` branch @ Release 1.3) was conducted to map existing capabilities against Package 1 requirements and eliminate duplicate code construction.

---

### 1.1 Existing Architecture Audit

| Architectural Domain | Existing Implementation in Codebase | Reusability for Package 1 |
|---|---|---|
| **1. Appointment Architecture** | `Appointment` Prisma model, `appointment-status.ts` state machine, `SLOT_OCCUPYING_STATUSES` conflict window. | **100% Reusable.** `bookPublicAppointment` in `src/services/booking-service.ts` enforces conflict checks and rate limits. |
| **2. Availability Engine** | `getBookableSlots(doctorId, { days })` in `src/services/availability-service.ts`. | **100% Reusable.** Computes real slots honoring working hours, breaks, time blocks, and patient daily caps. |
| **3. Queue System** | Queue position auto-assignment, `checked_in_at`, walk-in tracking in `src/services/queue-service.ts`. | **100% Reusable.** Public bookings land directly in the queue as `status = 'scheduled'`. |
| **4. Patient & OTP Auth** | `PatientProfile`, `OtpChallenge`, `issueOtpChallenge`, `verifyOtpChallenge` in `src/services/otp-service.ts`. | **100% Reusable.** OTP sending and verification endpoints (`/api/auth/otp/*`) are fully functional. |
| **5. Clinic Model & Setup** | `Clinic` operational policies (`working_days`, `opens_at`, `closes_at`, `default_slot_duration_minutes`, `buffer_minutes`, `accepting_bookings`). | **Needs Extension.** Needs `slug` (URL handle) and `online_booking_enabled` columns. |
| **6. Single Doctor Booking Page** | `/book/[doctorId]/page.tsx` (legacy single-doctor booking by UUID). | **Needs Extension.** Package 1 replaces UUID lookup with `/book/[clinicSlug]` supporting multi-doctor & service selection. |
| **7. Notification Engine** | `EventLog`, `Notification` model, `scheduling.appointment.booked` event publishing. | **100% Reusable.** Public booking already triggers event bus publishing. |
| **8. Reusable UI Components** | `Card`, `Button`, `Input`, `Label`, `Select`, `Dialog`, `Toaster` in `src/components/ui/`. | **100% Reusable.** Design system tokens and UI components are mature and consistent. |

---

### 1.2 Package 1 Gap Analysis Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               PACKAGE 1 GAP ANALYSIS MATRIX                             │
├────────────────────────────────┬───────────────────────────────┬────────────────────────┤
│ ALREADY IMPLEMENTED (REUSE)    │ NEEDS EXTENSION (MODIFY)      │ MISSING COMPLETELY (NEW│
├────────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ • Doctor slot calculation      │ • Clinic Model: Add `slug`    │ • `/book/[clinicSlug]` │
│   engine (getBookableSlots)    │   and `online_booking_enabled`│   multi-doctor booking │
│ • Appointment DB model &       │ • Appointment Model: Add      │   page & service grid  │
│   conflict checking            │   `booking_channel`,          │ • Public clinic lookup │
│ • OTP generation & hash        │   `visit_type`,               │   endpoint:            │
│   verification service         │   `payment_status`, and       │   `/api/public/clinics/│
│ • Event bus notification       │   `manage_token` columns      │   [slug]`              │
│   publisher                    │ • Public booking response:    │ • Google Calendar .ics │
│ • Reusable Shadcn UI & icons   │   Return `manage_token` &     │   export button        │
│                                │   Pay-at-Desk confirmation    │                        │
└────────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

---

## 2. DEPENDENCY VALIDATION

Package 1 has **zero blocking external dependencies**:
* **Database:** Migration adds 5 additive columns (`slug`, `online_booking_enabled`, `booking_channel`, `visit_type`, `manage_token`). All existing rows backfill seamlessly.
* **APIs:** Reuses existing `/api/auth/otp/*` endpoints for patient phone verification.
* **Services:** Extends `src/services/booking-service.ts` to populate `manage_token` (UUID) and `booking_channel`.

---

## 3. RISKS & MITIGATION STRATEGIES

1. **Risk: Public URL Slug Collision**
   * *Mitigation:* `Clinic.slug` will be enforced with a `@unique` index in PostgreSQL. Slug creation during practice setup will sanitize string inputs and append a unique suffix if a duplicate exists.
2. **Risk: Double-Booking During Simultaneous Public Submissions**
   * *Mitigation:* `scheduleAppointment()` uses database transaction locks and `assertNoDoctorSlotConflict()` buffer checks, rejecting overlapping bookings even if submitted simultaneously.
3. **Risk: Unauthenticated Booking Spam / Botnet Flooding**
   * *Mitigation:* Reuses existing `checkRateLimit()` throttling source IP (10/15min), target phone (5/hr), and target doctor (20/hr).

---

## 4. RECOMMENDED IMPLEMENTATION ORDER

Package 1 execution will follow a strict **6-Step Vertical Sequence**:

```
Step 1: Database Migration (Schema Additions)
   │
   ▼
Step 2: Service Layer Extensions (public-booking-service.ts)
   │
   ▼
Step 3: Public Clinic & Slot Lookup API (/api/public/clinics/[slug])
   │
   ▼
Step 4: Public Booking Creation API Extension (/api/public/bookings)
   │
   ▼
Step 5: Public Multi-Doctor Booking UI Page (/book/[clinicSlug])
   │
   ▼
Step 6: Automated Vitest Unit & Integration Tests
```

---

## 5. DATABASE MIGRATION IMPACT

The following additive migration will be executed via Prisma:

```prisma
// --- Package 1 Additive Schema Changes ---

model Clinic {
  // Additive columns (nullable/defaulted)
  slug                   String?  @unique // e.g., "aegis-family-clinic"
  online_booking_enabled Boolean  @default(true)
}

model Appointment {
  // Additive columns (nullable/defaulted)
  booking_channel String  @default("direct")   // 'direct' | 'whatsapp' | 'google' | 'walk_in'
  visit_type      String  @default("in_person")// 'in_person' | 'video' (Extensibility hook)
  payment_status  String  @default("pending")  // 'pending' | 'paid' (Extensibility hook)
  manage_token    String? @unique              // Secure UUID for patient self-service portal
}
```

*Migration Impact:* **Zero downtime, 100% backward-compatible.** Pre-existing clinic and appointment records are untouched and default safely.

---

## 6. API IMPACT

1. **`GET /api/public/clinics/[slug]` (NEW):**
   - Returns public clinic details, address, operating hours, active doctor directory, and service catalog.
2. **`GET /api/public/slots?doctor_id=...&date=...` (NEW):**
   - Returns available time slots for a specific doctor on a target date.
3. **`POST /api/public/bookings` (EXTENDED):**
   - Accepts optional `service_id` and `booking_channel`. Returns `manage_token` and confirmation pass details.

---

## 7. UI IMPACT

* **New Page:** `/src/app/book/[clinicSlug]/page.tsx`
  - Public clinic header with address, operating hours, and directions map button.
  - Doctor & Specialty picker tabs.
  - Date strip and real-time available slot grid.
  - Patient Phone OTP verification dialog.
  - Pay-at-Desk Confirmation Pass Card with `.ics` Google Calendar export button.

---

## 8. TESTING STRATEGY & VERIFICATION COMMANDS

Package 1 will be validated using Vitest and TypeScript compilation checks:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Run Package 1 Service Unit Tests
npx vitest run src/services/public-booking-service.test.ts

# 3. Run Full Test Suite Regression Check
npm run test
```

---

```markdown
# ==============================================================================
# PACKAGE 1 IMPLEMENTATION PLAN SUMMARY
# ==============================================================================

Plan File: PACKAGE1_IMPLEMENTATION_PLAN.md
Status: WAITING FOR USER APPROVAL PRIOR TO CODE EXECUTION
Target Package: Package 1 (Public Booking Foundation)
```
