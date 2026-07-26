# M2 Engineering Execution Plan — Digital Patient Journey & Clinic Growth Platform

> **Document Type:** Level 3 Engineering Architecture & Package Execution Plan  
> **Target Release:** Milestone M2 (Release 1.4)  
> **Status:** 🟡 APPROVED FOR STEP-BY-STEP PACKAGE IMPLEMENTATION  
> **Baseline Requirements:** `BRD-M2.md` | `PATIENT_EXPERIENCE_PLAYBOOK.md`  
> **Scope Adjustment Note:** Teleconsultation/WebRTC and Live Payment Gateway Integrations (Razorpay/Stripe/UPI) are **deferred from M2 implementation**, but full database & architectural extensibility for `visit_type`, `payment_status`, and `channel` delivery is built into all data models and abstractions.

---

## 1. EXECUTIVE SUMMARY

This document specifies the technical architecture, database schema migrations, backend service layer, API routes, UI components, and testing strategy for implementing **Milestone M2 (Digital Patient Journey & Clinic Growth Platform)**.

Implementation is partitioned into **Five Independent, Testable Engineering Packages**. Each package represents a standalone vertical slice that compiles cleanly, passes 100% of automated tests, and adds immediate operational value without breaking pre-existing Release 1.3 functionality.

---

## 2. REVISED MILESTONE SCOPE

To ensure rapid time-to-market and high capital efficiency, online video teleconsultation and automated payment gateways are deferred to dedicated follow-on releases, while maintaining 100% forward-compatible schema hooks.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                MILESTONE M2 SCOPE MATRIX                               │
├──────────────────────────────────────────────────────────┬──────────────────────────────┤
│                     IN SCOPE FOR M2                      │     DEFERRED TO M2+ / M3     │
├──────────────────────────────────────────────────────────┼──────────────────────────────┤
│ • Public Patient Online Slot Calendar (/book/[slug])     │ • Live Payment Gateways      │
│ • Patient Phone OTP Auth & Family Profile Selection      │   (Razorpay/Stripe/UPI)      │
│ • Pay-at-Desk & Manual Payment Status Tracking           │ • Automated Gateway Refunds  │
│ • Booking Management (Reschedule, Cancellation, Expiry)  │ • Teleconsultation WebRTC    │
│ • Channel-Abstracted Notification Engine (WhatsApp/SMS)  │   Video Rooms & Signaling    │
│ • Reception Queue Board Online Badges & Filters          │ • Pre-call Video Device      │
│ • Owner Growth Analytics & Source Attribution Cockpit    │   Testing Interface          │
│ • Architectural Extensibility Hooks (visit_type, etc.) │                              │
└──────────────────────────────────────────────────────────┴──────────────────────────────┘
```

### Architectural Extensibility Requirements
1. **`Appointment.visit_type`:** Enum `'in_person' | 'video'`. Default `'in_person'` in M2; schema & API interfaces fully accept `'video'` for future signaling.
2. **`Appointment.payment_status`:** Enum `'pending' | 'partially_paid' | 'paid' | 'waived' | 'refunded'`. M2 defaults to `'pending'` (Pay at Desk), allowing manual cashier settlement or future gateway callbacks.
3. **`Notification.channel`:** Enum `'whatsapp' | 'sms' | 'in_app' | 'email'`. M2 builds a pluggable provider interface (`NotificationProvider`) where WhatsApp/SMS log to unified audit delivery logs.

---

## 3. ENGINEERING PACKAGES

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            FIVE INDEPENDENT ENGINEERING PACKAGES                        │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│  PACKAGE 1      │  PACKAGE 2      │  PACKAGE 3      │  PACKAGE 4      │  PACKAGE 5      │
│  Public Booking │  Booking        │  Notification   │  Reception      │  Owner Analytics│
│  Foundation     │  Management     │  Framework      │  Board & RX     │  & Growth      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

### Package 1: Public Booking Foundation
* **Objective:** Enable patients to browse clinic doctors, select real-time available slots, verify via mobile OTP, and complete an online booking reservation.
* **Deliverables:**
  - Public booking portal at `src/app/book/[clinicSlug]/page.tsx`.
  - Public slot calculation service taking doctor availability, time blocks, and existing bookings.
  - OTP challenge authentication flow for phone verification.
  - Pay-at-Desk booking confirmation screen with calendar `.ics` download link.
* **Extensibility Hooks:** Generates `Appointment` with `visit_type = 'in_person'` and `payment_status = 'pending'`.
* **Testing Criteria:** Vitest test verifying bookable slot calculation and collision prevention across time blocks.

---

### Package 2: Booking Management & Patient Self-Service
* **Objective:** Allow patients to view, manage, reschedule, or cancel their bookings within policy windows.
* **Deliverables:**
  - Patient self-service booking management page at `src/app/book/manage/[token]/page.tsx`.
  - Cancellation policy validation logic (`Clinic.cancellation_window_hours`).
  - Reschedule slot picker releasing old slot and assigning new slot atomically.
  - Instant cancellation trigger updating appointment status to `cancelled` and releasing slot back to public calendar.
* **Testing Criteria:** Vitest test asserting late cancellation enforcement and atomic slot releasing.

---

### Package 3: Abstracted Notification Framework & Messaging Engine
* **Objective:** Build a unified, channel-pluggable notification engine supporting interactive message templates for confirmations, T-24h/T-2h reminders, and Rx sharing.
* **Deliverables:**
  - `NotificationService` interface abstraction supporting `WhatsAppProvider`, `SmsProvider`, and `InAppProvider`.
  - Template Assembly Engine interpolating appointment parameters into structured messaging cards.
  - Notification Outbox & Delivery Log (`NotificationLog`) for tracking delivery status (`pending`, `sent`, `delivered`, `failed`).
  - Automated reminder scheduler job interface (T-24h and T-2h alert dispatch).
* **Testing Criteria:** Unit tests verifying template variable substitution, provider interface fallback, and delivery status tracking.

---

### Package 4: Reception Board Online Integration & RX Controls
* **Objective:** Integrate online bookings seamlessly into the front-desk Reception Board with visual badges, payment indicators, and cancellation reviews.
* **Deliverables:**
  - Updated Reception Queue Board (`src/components/staff/reception-calendar.tsx`) featuring `Online Booking` badge and channel attribution icons (`WhatsApp`, `Direct`, `Google`).
  - Payment Status Filters (`All`, `Pay at Desk`, `Paid`, `Overdue`).
  - Patient Reschedule Request Notification Banner allowing receptionists to approve or modify requested times.
  - Cashier Checkout integration updating `Appointment.payment_status` upon manual collection.
* **Testing Criteria:** Integration tests asserting online booking rendering, badge display, and queue status transitions on front-desk board.

---

### Package 5: Owner Growth Cockpit & Channel Attribution Analytics
* **Objective:** Provide practice owners with real-time operational insights into online booking conversion, channel attribution, and no-show reduction.
* **Deliverables:**
  - Growth Analytics tab in Command Center (`src/app/admin/command-center/page.tsx`).
  - Booking Source Attribution chart (`Direct Web`, `WhatsApp Link`, `Google Search`, `Walk-in`).
  - No-show rate metric comparison (Online vs Walk-in).
  - Messaging Delivery Health summary (Total Sent, Delivered, Click-through Rate).
* **Testing Criteria:** Unit tests for analytics aggregation functions across date ranges and booking channels.

---

## 4. DEPENDENCIES MATRIX

```
┌────────────────────────┐
│  Package 1 (Foundation)│
└────────────────────────┘
            │
            ▼
┌────────────────────────┬────────────────────────┐
│  Package 2 (Management)│  Package 3 (Messaging) │
└────────────────────────┴────────────────────────┘
            │                        │
            └───────────┬────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  Package 4 (Reception RX)                       │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  Package 5 (Owner OX Cockpit)                   │
└─────────────────────────────────────────────────┘
```

---

## 5. DATABASE SCHEMA CHANGES

The following additive columns and models will be added to `prisma/schema.prisma`:

```prisma
// --- M2 Schema Additions ---

model Appointment {
  // Existing fields...
  
  // M2 Architectural Extensibility Columns
  visit_type          String   @default("in_person") // 'in_person' | 'video'
  booking_channel     String   @default("direct")    // 'direct' | 'whatsapp' | 'google' | 'walk_in'
  booking_source_ref  String?                        // UTM parameter or referral link code
  manage_token        String?  @unique               // Secure UUID for patient self-service management
  
  // Extensible Payment & Video Hooks (Dormant until M2+/M3)
  payment_status      String   @default("pending")   // 'pending' | 'partially_paid' | 'paid' | 'waived' | 'refunded'
  video_room_id       String?                        // Reserved for WebRTC signaling
  video_room_token    String?                        // Reserved for WebRTC signaling
}

model Clinic {
  // Existing fields...
  
  // M2 Booking & Policy Settings
  slug                        String?  @unique // Custom URL handle e.g. "aegis-family-clinic"
  online_booking_enabled      Boolean  @default(true)
  require_upfront_payment     String   @default("postpaid") // 'postpaid' | 'deposit' | 'prepaid' (Dormant gateway switch)
  booking_deposit_amount      Int?
}

// M2 Notification Outbox & Messaging Log
model NotificationLog {
  id              String   @id @default(uuid())
  appointment_id  String?
  patient_id      String
  channel         String   // 'whatsapp' | 'sms' | 'email' | 'in_app'
  recipient       String   // Phone number or email
  template_key    String   // 'booking_confirmed' | 'reminder_24h' | 'reminder_2h' | 'rx_issued'
  payload_json    String   // Serialized message parameters
  status          String   @default("pending") // 'pending' | 'sent' | 'delivered' | 'failed'
  error_detail    String?
  sent_at         DateTime?
  created_at      DateTime @default(now())

  appointment Appointment? @relation(fields: [appointment_id], references: [id], onDelete: SetNull)

  @@index([patient_id, created_at])
  @@index([status])
  @@map("Notification_Logs")
}
```

---

## 6. BACKEND SERVICES

The following new or updated services will be placed in `src/services/`:

1. **`public-booking-service.ts`:**
   - `getPublicClinicProfile(slug: string)`: Resolves clinic details and active doctor directory for public view.
   - `getPublicBookableSlots(clinicId: string, doctorId: string, date: string)`: Calculates open slots taking working hours, breaks, time blocks, and existing appointments into account.
   - `createPublicBooking(input: PublicBookingInput)`: Creates appointment row, generates `manage_token`, assigns queue position, and triggers confirmation notification.

2. **`booking-management-service.ts`:**
   - `getBookingByManageToken(token: string)`: Retrieves booking details for patient self-service portal.
   - `rescheduleBooking(token: string, newTime: Date)`: Validates cancellation window and updates scheduled time atomically.
   - `cancelBooking(token: string, reason?: string)`: Sets status to `cancelled` and releases slot back to public pool.

3. **`notification-engine-service.ts`:**
   - `sendNotification(input: NotificationInput)`: Dispatches message via configured provider interface (`WhatsAppProvider` / `SmsProvider`).
   - `renderTemplate(templateKey: string, data: Record<string, unknown>)`: Interpolates parameters into formatted message strings.
   - `dispatchScheduledReminders()`: Cron/scheduled task querying upcoming appointments requiring T-24h or T-2h alerts.

4. **`growth-analytics-service.ts`:**
   - `getGrowthMetrics(clinicId: string, startDate: Date, endDate: Date)`: Aggregates online vs walk-in visit volumes, channel attribution, conversion rates, and no-show statistics.

---

## 7. API ENDPOINTS

The following API routes will be implemented under `src/app/api/`:

| HTTP Method | Route Path | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/public/clinics/[slug]` | Public | Resolves clinic profile, doctors, and operating hours |
| `GET` | `/api/public/slots` | Public | Calculates available slots for a doctor on a given date |
| `POST` | `/api/public/bookings` | Public / OTP | Creates a new patient online booking reservation |
| `GET` | `/api/public/manage/[token]` | Public (Token) | Fetches booking details for patient self-service |
| `POST` | `/api/public/manage/[token]/reschedule` | Public (Token) | Reschedules an existing appointment |
| `POST` | `/api/public/manage/[token]/cancel` | Public (Token) | Cancels an existing appointment |
| `POST` | `/api/notifications/dispatch-reminders` | Admin / System | Triggers scheduled T-24h / T-2h reminder dispatch |
| `GET` | `/api/admin/analytics/growth` | Staff (Owner) | Returns online booking growth & channel attribution metrics |

---

## 8. FRONTEND PAGES & COMPONENTS

The following UI routes and components will be implemented under `src/app/` and `src/components/`:

1. **Public Patient Booking Portal (`/book/[slug]`):**
   - Doctor & specialty picker tabs.
   - Interactive date strip and slot grid picker.
   - Phone OTP modal dialog.
   - Confirmation pass card with `.ics` Google Calendar export button.

2. **Patient Self-Service Management Portal (`/book/manage/[token]`):**
   - Appointment details card with clinic map directions.
   - 1-click "Reschedule Appointment" modal.
   - 1-click "Cancel Appointment" confirmation dialog.

3. **Reception Board Upgrades (`src/components/staff/reception-calendar.tsx`):**
   - `Online` badge tag on appointment cards.
   - Channel attribution icon tooltips (`WhatsApp`, `Direct Web`, `Google`).
   - Payment status filter dropdown (`All`, `Pay at Desk`, `Paid`).

4. **Owner Growth Cockpit (`src/components/admin/growth-cockpit.tsx`):**
   - Key metric cards: Online Bookings Today, No-Show Rate %, Conversion Rate %.
   - Channel Attribution pie chart.
   - Notification delivery health table.

---

## 9. TESTING STRATEGY

Every package will be validated using Vitest and TypeScript compilation checks prior to merging:

### 1. Unit Tests (`npm run test`)
* **Slot Calculation Tests:** Verify slot generation with breaks, time blocks, and existing bookings (`src/services/public-booking-service.test.ts`).
* **Cancellation Policy Tests:** Verify cancellation window enforcement and late fee rules (`src/services/booking-management-service.test.ts`).
* **Template Interpolation Tests:** Verify variable substitution in WhatsApp/SMS templates (`src/services/notification-engine-service.test.ts`).

### 2. Integration Tests
* **Public Booking Flow E2E Integration:** Test complete endpoint pipeline from slot lookup to DB insertion and `manage_token` generation (`src/app/api/public/bookings/route.test.ts`).
* **Reschedule & Cancellation Pipeline:** Test slot release and appointment state transitions (`src/app/api/public/manage/route.test.ts`).

### 3. Verification Commands
```bash
# Type check 
npx tsc --noEmit

# Run full test suite
npm run test

# Target M2 specific service tests
npx vitest run src/services/public-booking-service.test.ts
```

---

## 10. RELEASE PLAN & PACKAGE GATING

```
Package 1 (Public Booking) ──> Vitest Pass ──> TypeCheck Pass ──> Commit & Merge PKG-1
                                                                         │
Package 2 (Booking Mgmt)   ──> Vitest Pass ──> TypeCheck Pass ──> Commit & Merge PKG-2
                                                                         │
Package 3 (Notifications)  ──> Vitest Pass ──> TypeCheck Pass ──> Commit & Merge PKG-3
                                                                         │
Package 4 (Reception Board)──> Vitest Pass ──> TypeCheck Pass ──> Commit & Merge PKG-4
                                                                         │
Package 5 (Owner Analytics)──> Vitest Pass ──> TypeCheck Pass ──> Commit & Merge PKG-5
                                                                         │
                                                                         ▼
                                                          M2 Milestone QA Certification & GA Tag
```

---

```markdown
# ==============================================================================
# M2 ENGINEERING EXECUTION PLAN SUMMARY
# ==============================================================================

Plan File: M2_ENGINEERING_EXECUTION_PLAN.md
Status: APPROVED & EXECUTION READY
Next Step: Begin implementation on Package 1 (Public Booking Foundation).
```
