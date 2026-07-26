# BRD-M2: Milestone 2 — Digital Patient Journey & Clinic Growth Platform

> **Document Type:** Level 1 Business Requirements Document (BRD)  
> **Milestone Target:** Milestone 2 (Clinic Growth & Digital Patient Engagement)  
> **Product Governance Level:** LEVEL 1 (Single Milestone Requirement Specification)  
> **Status:** 🟡 APPROVED FOR UX DESIGN & TECHNICAL SPECIFICATION  
> **Baseline Constitution:** `CURRENT_PLATFORM_ASSESSMENT.md` | `MASTER_PRODUCT_BLUEPRINT.md` | `PRODUCT_MILESTONES.md` | `PATIENT_EXPERIENCE_PLAYBOOK.md`

---

## 1. EXECUTIVE SUMMARY

Milestone 2 (**Digital Patient Journey & Clinic Growth Platform**) transforms Auriva from an internal practice management system into a **24/7 digital growth and patient engagement network**.

By combining online patient self-service booking, online payment gateway integration (Razorpay/UPI/Stripe), automated WhatsApp/SMS interactive notifications, and WebRTC teleconsultation video calls, Milestone 2 expands practice revenue, reduces patient no-shows by 70%, and delivers a frictionless experience across all four stakeholder groups (Patient, Receptionist, Doctor, Owner).

---

## 2. BUSINESS OBJECTIVES

1. **24/7 Patient Acquisition:** Enable clinics to capture online bookings directly from Google Search, Maps, WhatsApp links, and website widgets outside clinic operating hours.
2. **Eliminate Patient No-Shows:** Reduce appointment no-shows from 30% to under 8% via automated T-24h/T-2h interactive WhatsApp reminders and deposit/upfront payment enforcement.
3. **Capture Immediate Digital Revenue:** Monetize online bookings with instant payment gateway processing (UPI, Debit/Credit Card, Net Banking).
4. **Expand Care to Teleconsultation:** Provide remote WebRTC video consultations with zero app installation requirements.
5. **Zero Staff Administrative Overhead:** Automatically queue online bookings into front-desk reception boards and doctor clinical queues without duplicate data entry.

---

## 3. SUCCESS METRICS & EXPERIENCE COVERAGE

### 3.1 Experience Coverage Matrix

| Stakeholder Experience | Impact Status | Key Primary Interface |
|---|---|---|
| **1. Patient Experience (PX)** | ✅ **PRIMARY** | Self-Service Web Booking Portal & WhatsApp Interactive Cards |
| **2. Reception Experience (RX)** | ✅ **PRIMARY** | Staff Board Online Booking Filter & Payment Status Badges |
| **3. Doctor Experience (DX)** | ✅ **PRIMARY** | Consultation Workbench Video Call Indicator & Teleconsult Room |
| **4. Owner Experience (OX)** | ✅ **PRIMARY** | Command Center Growth Dashboard & Online Revenue Analytics |

### 3.2 Quantitative Key Performance Indicators (KPIs)

* **Online Booking Conversion Rate:** ≥ 65% of landing page visitors complete a booking.
* **No-Show Rate Reduction:** Decrease no-show rate from 30% to < 8%.
* **Payment Collection Velocity:** 100% of online booking fees settled instantly via payment gateway.
* **WhatsApp Notification Delivery:** ≥ 98% successful delivery for instant confirmations and reminders.
* **Teleconsultation Connection Speed:** WebRTC video call connects within 3 seconds of doctor joining.

---

## 4. EXPERIENCE DESIGN (FOUR INTERLOCKING EXPERIENCES)

---

### 4.1 Patient Experience (PX)
* **Journey Stages:**
  1. **Discovery:** Patient lands on `book.auriva.care/clinic-slug` via QR code, Google Maps, or WhatsApp shared link.
  2. **Selection:** Selects Clinic Branch, Specialty/Service, Doctor, Date, and Real-time Slot.
  3. **Verification:** Enters mobile number -> Instant 6-digit OTP verification -> Selects Self or Family Profile.
  4. **Payment:** Selects payment method (Pay at Desk, Token Deposit, Full Online Pre-Payment) -> Completes gateway transaction.
  5. **Confirmation:** Receives instant WhatsApp card + SMS link with Google Calendar `.ics` invite.
  6. **Reminder:** Receives T-24h and T-2h WhatsApp alerts with 1-click `Confirm Arrival`, `Directions`, or `Reschedule` CTAs.
  7. **Teleconsultation (If Video):** Clicks 1-click WebRTC room link in browser without downloading any application.
  8. **Post-Visit:** Receives digital prescription PDF link, digital payment receipt, and 1-click 5-star rating prompt.

---

### 4.2 Reception Experience (RX)
* **Staff Board Enhancements:**
  1. **Online Booking Badge:** Online bookings clearly flagged with `Online` badge and channel indicator (`WhatsApp`, `Google`, `Direct`).
  2. **Payment Status Badges:** Visual payment state indicators (`Prepaid (₹500)`, `Deposit Paid (₹100)`, `Pending (Pay at Desk)`).
  3. **Reschedule & Cancellation Queue:** Dedicated notification badge for patient-initiated reschedule requests requiring front-desk review.
  4. **Teleconsultation Waiting Room:** Live indicator showing when a remote video patient has entered the WebRTC waiting room.
  5. **Refund Handling:** Instant refund trigger integrated into appointment cancellation dialog (returns funds via gateway).

---

### 4.3 Doctor Experience (DX)
* **Clinical Workbench Enhancements:**
  1. **Visit Type Indicator:** Clear visual badge distinguishing `In-Person Visit` vs `Video Teleconsultation`.
  2. **Seamless Video Join:** 1-click "Join Video Call" button on Consultation Workbench top header when video patient is waiting.
  3. **Non-Intrusive Payment Status:** Subtle indicator showing `Paid` status without distracting clinical charting focus.
  4. **Integrated Teleconsult Charting:** Full side-by-side view featuring high-definition WebRTC video feed on the left and clinical charting/Rx authoring on the right.
  5. **Auto Follow-up Booking:** Selecting a follow-up date auto-generates a pre-filled booking recommendation sent directly to the patient's WhatsApp.

---

### 4.4 Owner Experience (OX)
* **Command Center Growth Dashboard:**
  1. **Online Revenue Analytics:** Today’s Online Payments Collected vs Pending Cashier Collections.
  2. **Booking Channel Attribution:** Breakdown of patient bookings by source (`Google Search`, `WhatsApp Link`, `Direct Web`, `Walk-in`).
  3. **No-Show & Conversion Trends:** Weekly graphs showing no-show reduction percentage and booking completion rates.
  4. **Teleconsultation Utilization:** Total video consult volume and average call duration.
  5. **WhatsApp Delivery Health:** Messaging volume, delivery success rates, and engagement CTR.

---

## 5. FUNCTIONAL REQUIREMENTS

### 5.1 Patient Booking Engine (PBE)
* **REQ-PBE-001:** Public online booking page (`/book/[clinicSlug]`) rendering real-time bookable slots from doctor availability, time blocks, and existing bookings.
* **REQ-PBE-002:** Support for multi-service selection (Consultation, Dental Cleaning, Vaccination) with dynamic fee calculation.
* **REQ-PBE-003:** Family member profile selection allowing a logged-in account to book for dependents.

### 5.2 Payment Gateway Integration (PGI)
* **REQ-PGI-001:** Integration with Razorpay / UPI / Stripe checkout supporting UPI Intent, Dynamic QR Codes, Net Banking, and Credit/Debit Cards.
* **REQ-PGI-002:** Automated webhook listener updating invoice and appointment payment status upon gateway callback (`payment.captured`, `payment.failed`).
* **REQ-PGI-003:** Refund processing triggering gateway API reversals upon authorized appointment cancellations.

### 5.3 Automated WhatsApp & SMS Communications (WSC)
* **REQ-WSC-001:** Instant interactive WhatsApp message template delivery upon booking creation.
* **REQ-WSC-002:** Scheduled T-24h and T-2h appointment reminders with interactive CTA buttons.
* **REQ-WSC-003:** Digital Prescription PDF delivery link via WhatsApp within 10 seconds of consult sign-off.

### 5.4 Teleconsultation WebRTC Video Engine (TVE)
* **REQ-TVE-001:** Browser-native WebRTC peer-to-peer video room generation with fallback STUN/TURN relay server infrastructure.
* **REQ-TVE-002:** Patient pre-call waiting room with camera/microphone device test.
* **REQ-TVE-003:** Integrated side-by-side video rendering inside Doctor Consultation Workbench.

---

## 6. NON-FUNCTIONAL REQUIREMENTS

* **Performance:** Public slot calendar loads in < 300ms; payment gateway modal opens in < 200ms.
* **Scalability:** Handles up to 1,000 concurrent online booking sessions per clinic without degradation.
* **Security & Compliance:** 100% TLS 1.3 encryption for video streams; payment PCI-DSS compliance via tokenized gateway handles; zero storage of raw card/UPI credentials.
* **Availability:** 99.9% uptime SLA for public booking endpoints and webhook processors.

---

## 7. BUSINESS RULES

1. **Slot Lock Rule:** Selecting a time slot holds it exclusively for 5 minutes during payment processing; if payment is unconfirmed after 5 minutes, the slot is released back to the public calendar.
2. **Cancellation Window Rule:** Patient cancellations allowed up to `Clinic.cancellation_window_hours` prior to appointment; late cancellations forfeit upfront deposit.
3. **Refund Policy Rule:** Approved cancellations within policy window trigger 100% gateway refund minus fixed processing fee.
4. **Emergency Priority Rule:** Front-desk emergency bypass (`priority: 100`) automatically adjusts outpatient queue order without disrupting scheduled video call appointments.

---

## 8. DATA MODEL CHANGES

The following additive schema modifications are required in `prisma/schema.prisma`:

1. **`Appointment` Model Additions:**
   - `booking_channel`: `String` (`'direct' | 'whatsapp' | 'google' | 'walk_in'`)
   - `video_room_id`: `String?` (WebRTC room identifier)
   - `video_room_token`: `String?` (Encrypted join token)

2. **`Payment` Model Additions:**
   - `gateway_provider`: `String?` (`'razorpay' | 'stripe' | 'upi'`)
   - `gateway_transaction_id`: `String?`
   - `gateway_payment_status`: `String` (`'pending' | 'captured' | 'failed' | 'refunded'`)

3. **`Clinic` Model Additions:**
   - `online_booking_enabled`: `Boolean @default(true)`
   - `require_upfront_payment`: `String @default("postpaid")` (`'postpaid' | 'deposit' | 'prepaid'`)
   - `booking_deposit_amount`: `Int?`

---

## 9. INTEGRATIONS

* **Payment Gateways:** Razorpay API / Stripe Connect / UPI Intent.
* **WhatsApp Business API:** Meta WhatsApp Business Cloud API / Twilio WhatsApp.
* **WebRTC Video Signaling:** LiveKit / Daily.co / OpenWebRTC Infrastructure.

---

## 10. ACCEPTANCE CRITERIA

1. Patient can search for a doctor, select a slot, pay online, and receive a WhatsApp confirmation in under 30 seconds.
2. Front-desk staff can see online bookings with payment badges live on the reception board.
3. Doctor can start a video consultation with 1 click from the Consultation Workbench.
4. Practice owner can view online revenue, booking conversion rates, and no-show reductions in the Command Center.
5. All 634 existing automated tests continue to pass with 0 regressions.

---

## 11. RELEASE SCOPE

* **In-Scope:**
  - Public Patient Online Booking Web Interface (`/book/[clinicSlug]`)
  - Razorpay / UPI Payment Gateway Integration
  - Meta WhatsApp Business Cloud API Integration
  - WebRTC Peer-to-Peer Teleconsultation Video Engine
  - Front-Desk Online Booking Queue Badges & Filters
  - Doctor Workbench Teleconsult Video Side-Rail
  - Owner Command Center Online Revenue Analytics

---

## 12. OUT OF SCOPE

* **Explicitly Deferred to Future Milestones:**
  - In-house Pharmacy Dispensing & Stock Inventory (Milestone 3)
  - Laboratory LIS Machine Interfacing (Milestone 3)
  - Specialty Dental Odontograms & Pediatric Growth Charts (Milestone 4)
  - Inter-Branch Inventory Stock Transfer (Milestone 5)
  - Hospital Inpatient Bed Grid & Admission (Milestone 6)

---

```markdown
# ==============================================================================
# BRD-M2 ACCEPTANCE SUMMARY
# ==============================================================================

Document File: BRD-M2.md
Status: APPROVED & FROZEN FOR IMPLEMENTATION
Next Phase: Level 2 Experience Design & Technical Architecture Specification
```
