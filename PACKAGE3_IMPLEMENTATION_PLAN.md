# Package 3 Implementation Plan — Communication Platform & Notification Engine

> **Document Type:** Level 3 Engineering Implementation Plan  
> **Target Release:** Milestone M2 (Release 1.4) — Package 3  
> **Status:** 🟡 WAITING FOR APPROVAL PRIOR TO CODE EXECUTION  
> **Baseline Execution Plan:** `M2_ENGINEERING_EXECUTION_PLAN.md`  
> **Package 2 Status:** ✅ MERGED TO `main` (Tag: `M2-PKG-2-GA`)

---

## 1. CODEBASE ASSESSMENT & GAP ANALYSIS

A thorough audit of the Auriva codebase (`main` branch @ `M2-PKG-2-GA`) was conducted to evaluate existing messaging and event infrastructure.

---

### 1.1 Existing Architecture Audit

| Architectural Domain | Existing Implementation in Codebase | Reusability for Package 3 |
|---|---|---|
| **1. Shared Event Bus** | `publishEvent()` and `eventRegistry` in `src/lib/events.ts`. | **100% Reusable.** Provides decoupled event publishing for all domain actions. |
| **2. SMS Provider Interface** | `SmsSender` interface and `LogSmsSender` in `src/lib/sms/index.ts`. | **Needs Extension.** Generalize into pluggable `NotificationProvider` supporting SMS and WhatsApp. |
| **3. Event Handlers** | `SmsDeliveryHandler`, `AuditLogHandler` in `src/lib/event-handlers.ts`. | **Needs Extension.** Register new handlers for `rescheduled`, `cancelled`, and reminder triggers. |
| **4. Feature Flags** | `Clinic.notifications_enabled` in Prisma schema. | **Needs Extension.** Add channel flags (`whatsapp_enabled`, `sms_enabled`, `reminders_enabled`). |

---

### 1.2 Package 3 Architecture Diagram

```
                              ┌───────────────────────────────────┐
                              │         SHARED EVENT BUS          │
                              │         src/lib/events.ts         │
                              └─────────────────┬─────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
AppointmentBooked                    AppointmentRescheduled                 AppointmentCancelled
         │                                      │                                      │
         └──────────────────────────────────────┼──────────────────────────────────────┘
                                                │
                                                ▼
                              ┌───────────────────────────────────┐
                              │       COMMUNICATION ENGINE        │
                              │ src/services/comm-engine-svc.ts   │
                              ├───────────────────────────────────┤
                              │ 1. Template Interpolator          │
                              │ 2. Preference Engine (Flags)      │
                              │ 3. Provider Registry              │
                              │ 4. Outbox & Retry Engine          │
                              └─────────────────┬─────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌───────────────────┐                  ┌───────────────────┐                  ┌───────────────────┐
│   MockProvider    │                  │  WhatsAppProvider │                  │    SmsProvider    │
│  (Dev Log Outbox) │                  │  (Meta Cloud API) │                  │  (Twilio / MSG91) │
└───────────────────┘                  └───────────────────┘                  └───────────────────┘
```

---

## 2. PACKAGE RELEASE CHECKLIST & DEFINITION OF DONE

Package 3 must satisfy the 10-point Quality Gate:

- [ ] 1. **Communication Engine Core:** Provider registry and template engine implemented.
- [ ] 2. **Provider Abstraction:** `NotificationProvider` interface (`send()`, `validate()`, `healthCheck()`) with `MockProvider` default.
- [ ] 3. **Event Subscribers:** Event bus subscriptions for `booked`, `rescheduled`, and `cancelled`.
- [ ] 4. **Delivery Queue & Outbox:** `NotificationLog` outbox tracking status (`pending`, `sending`, `delivered`, `failed`, `dead_letter`).
- [ ] 5. **Retry Engine:** Exponential backoff retry handler for failed dispatches.
- [ ] 6. **Preference Engine:** Enforces clinic & channel notification flags (`notifications_enabled`, `whatsapp_enabled`, `sms_enabled`).
- [ ] 7. **TypeScript Compilation:** `npx tsc --noEmit` passes with 0 errors.
- [ ] 8. **Automated Tests:** All Vitest unit and integration tests pass cleanly.
- [ ] 9. **Backward Compatibility:** Zero disruption to pre-existing appointment or public booking flows.
- [ ] 10. **Merge Readiness:** Single clean commit tagged `M2-PKG-3-GA`.

---

## 3. RECOMMENDED IMPLEMENTATION ORDER

Package 3 execution will follow a strict **6-Step Vertical Sequence**:

```
Step 1: Database Migration (NotificationLog model & Clinic channel flags)
   │
   ▼
Step 2: Template Engine & Provider Abstraction (comm-templates.ts & comm-providers.ts)
   │
   ▼
Step 3: Communication Engine Service (communication-engine-service.ts)
   │
   ▼
Step 4: Event Subscribers Integration (event-handlers.ts)
   │
   ▼
Step 5: Reminder Calculation Engine & API Endpoint (/api/notifications/dispatch-reminders)
   │
   ▼
Step 6: Automated Vitest Unit & Integration Tests
```

---

## 4. DATABASE MIGRATION SPECIFICATION

The following additive columns and model will be added to `prisma/schema.prisma`:

```prisma
enum NotificationChannel {
  WHATSAPP
  SMS
  EMAIL
  IN_APP
}

enum NotificationStatus {
  PENDING
  SENDING
  DELIVERED
  FAILED
  DEAD_LETTER
}

model Clinic {
  // Additive channel preference flags
  whatsapp_enabled  Boolean  @default(true)
  sms_enabled       Boolean  @default(true)
  reminders_enabled Boolean  @default(true)
}

model NotificationLog {
  id              String              @id @default(uuid())
  appointment_id  String?
  patient_id      String
  clinic_id       String
  channel         NotificationChannel
  status          NotificationStatus  @default(PENDING)
  provider        String              @default("mock")
  recipient       String              // Phone or email
  template_key    String              // 'appointment_booked', 'reminder_24h', etc.
  payload_json    String              // Serialized template variables
  rendered_text   String              // Final rendered message content
  retry_count     Int                 @default(0)
  max_retries     Int                 @default(3)
  error_detail    String?
  scheduled_at    DateTime            @default(now())
  sent_at         DateTime?
  created_at      DateTime            @default(now())
  updated_at      DateTime            @default(now()) @updatedAt

  appointment Appointment? @relation(fields: [appointment_id], references: [id], onDelete: SetNull)
  clinic      Clinic       @relation(fields: [clinic_id], references: [id], onDelete: Cascade)

  @@index([status, scheduled_at])
  @@index([patient_id])
  @@map("Notification_Logs")
}
```

---

## 5. TESTING STRATEGY & VERIFICATION COMMANDS

```bash
# 1. Type check
npx tsc --noEmit

# 2. Run Package 3 Communication Engine Unit Tests
npx vitest run src/services/communication-engine-service.test.ts

# 3. Run Full Test Suite Regression Check
npm run test
```

---

```markdown
# ==============================================================================
# PACKAGE 3 IMPLEMENTATION PLAN SUMMARY
# ==============================================================================

Plan File: PACKAGE3_IMPLEMENTATION_PLAN.md
Status: WAITING FOR USER APPROVAL PRIOR TO CODE EXECUTION
Target Package: Package 3 (Communication Platform & Notification Engine)
```
