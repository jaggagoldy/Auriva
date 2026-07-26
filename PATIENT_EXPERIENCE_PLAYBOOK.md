# Auriva Healthcare Operating System — Patient Experience Playbook

> **Document Type:** 5th Constitutional Artifact — Patient Experience (PX) & Design Constitution  
> **Author Roles:** Chief Product Officer · Patient Experience (PX) Strategist · Healthcare Operations Consultant  
> **Target Mindset:** The Digital Patient Journey  
> **Scope:** Permanent Design & Interaction Principles for All Patient-Facing Workflows

---

## 1. THE PATIENT EXPERIENCE PHILOSOPHY

In traditional healthcare software, patient interactions are treated as isolated transactional events: *Book Appointment*, *Send SMS*, *Visit Desk*, *Doctor Consult*, *Done*.

In **Auriva**, every interaction is designed as **One Continuous Digital Patient Journey**. The patient never feels handed off between disconnected tools. From the moment they decide to seek care until they complete their treatment and return for follow-up care, their experience is unified, transparent, and frictionless.

---

## 2. THE SEVEN CONSTITUTIONAL PX PRINCIPLES

Every patient-facing screen, workflow, notification, and interaction in Auriva must satisfy these seven non-negotiable design principles:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          THE SEVEN CONSTITUTIONAL PX PRINCIPLES                         │
├───────────────────┬───────────────────┬─────────────────┬───────────────┬───────────────┤
│ 1. <30s ACTIONS   │ 2. ZERO DUPLICATE │ 3. INSTANT      │ 4. IMMEDIATE  │ 5. ACTIONABLE │
│    SPEED          │    DATA ENTRY     │    CONFIRMATION │    PROOF      │    REMINDERS  │
├───────────────────┴───────────────────┴─────────────────┴───────────────┴───────────────┤
│ 6. CLEAR NEXT STEPS IN CONSULTATIONS  │ 7. ZERO ANXIETY (PATIENT ALWAYS KNOWS NEXT STEP)│
└───────────────────────────────────────┴─────────────────────────────────────────────────┘
```

1. **Sub-30-Second Actions:** Every patient action (booking a slot, downloading an Rx, checking queue status, paying a fee) must be achievable in less than 30 seconds.
2. **Zero Duplicate Data Entry:** Never ask the patient or front-desk for information already recorded in Auriva. If a phone number or allergy is known, auto-populate it everywhere.
3. **Instant Interactive Confirmations:** Every booking, rescheduling, or cancellation must issue an immediate, interactive confirmation (WhatsApp/SMS with live action link).
4. **Immediate Financial Proof:** Every payment collected (deposit, full payment, cash at desk) must produce instant digital proof (SMS/WhatsApp receipt link & PDF vault entry).
5. **Actionable Smart Reminders:** Reminders are never passive text. Every T-24h and T-2h reminder must include 1-click actions: *Confirm Arrival*, *Get Directions*, *Reschedule*, or *Cancel*.
6. **Clear Next Steps at Consultation End:** Every doctor consultation sign-off must provide an explicit, unambiguous next step (e.g. *Collect Rx at Pharmacy*, *Book Follow-up in 14 Days*, *Upload Lab Report*).
7. **Zero Patient Anxiety:** A patient should never wonder "What do I do next?". The UI and automated notifications must proactively answer: *Where do I go? Who is my doctor? How long is my wait? What is my cost?*

---

## 3. THE NINE STAGES OF THE DIGITAL PATIENT JOURNEY

The complete end-to-end patient experience map powering **Milestone 2 (The Digital Patient Journey)**:

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌──────────────┐     ┌───────────┐
│ 1.SEARCH  │ ──> │ 2.BOOKING │ ──> │ 3.PAYMENT │ ──> │ 4.CONFIRM    │ ──> │ 5.REMIND  │
│ DISCOVERY │     │ SELECTION │     │ & DEPOSIT │     │ NOTIFICATION │     │ & PREP    │
└───────────┘     └───────────┘     └───────────┘     └──────────────┘     └───────────┘
                                                                                 │
                                                                                 ▼
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌──────────────┐     ┌───────────┐
│ 9.RETENTION│ <── │ 8.CHECKOUT│ <── │ 7.CONSULT │ <── │ 6. ARRIVAL   │ <── │ 6a.VIDEO  │
│ CONTINUITY│     │ COMPLETION│     │ PHYSICAL  │     │ & ACCESS     │     │ TELEHEALTH│
└───────────┘     └───────────┘     └───────────┘     └──────────────┘     └───────────┘
```

---

### Stage 1: Discovery & Entry Touchpoints
* **Context:** Patient needs care and seeks a doctor or clinic location.
* **Touchpoint Channels:**
  * Google Search / Maps profile link (`book.auriva.care/clinic-name`)
  * Clinic entrance or reception desk QR code scan
  * Direct SMS / WhatsApp booking link shared by clinic staff
  * Clinic website embedded booking widget
  * Doctor personal digital business card / social media link
* **PX Standard:** Zero login barrier to browse available doctors, specialties, services, consultation fees, and open calendar slots.

---

### Stage 2: Booking Selection
* **Context:** Patient selects provider and time window.
* **Step Flow:**
  1. Select Clinic Branch (if multi-location).
  2. Select Specialty / Service (e.g. *General Consultation*, *Teeth Cleaning*, *Pediatric Checkup*).
  3. Select Attending Doctor (view doctor bio, qualifications, photo, fee, languages).
  4. Select Date & Real-time Available Time Slot.
  5. Enter Patient Phone Number -> Instant OTP verification (or auto-fill if active session).
  6. Select Patient Profile (Self or Family Dependent).
* **PX Standard:** Full slot selection completed in under 4 clicks without navigating away.

---

### Stage 3: Flexible Payment & Deposit Capture
* **Context:** Booking policy enforcement based on clinic configuration.
* **Payment Models:**
  * **Model A (Pay at Desk):** Zero upfront payment; reservation held with post-paid billing.
  * **Model B (Nominal Deposit):** Token commitment fee (e.g. ₹100 / $10) to block slot and prevent no-shows.
  * **Model C (Full Pre-Payment):** Full consultation fee collected online via UPI, Razorpay, or Credit Card.
* **PX Standard:** Instant payment gateway checkout with automated fallback if transaction is interrupted.

---

### Stage 4: Multi-Channel Instant Confirmation
* **Context:** Booking is secured in clinic queue system.
* **Instant Delivery Channels:**
  * **WhatsApp Message:** Interactive card showing Doctor Name, Time, Address, Directions Link, and Manage Booking CTA.
  * **SMS Notification:** Concise text confirmation with direct web link (`m.auriva.care/b/XYZ123`).
  * **Calendar Invite (.ics):** 1-click Google Calendar / Apple Calendar event addition.
  * **Web Portal Confirmation:** Printable digital pass with live appointment status.
* **PX Standard:** Delivery within 5 seconds of booking completion.

---

### Stage 5: Proactive Smart Reminders & Preparation
* **Context:** Pre-appointment communication phase.
* **Cadence & Content:**
  * **T-24 Hours Reminder:** WhatsApp/SMS alert -> Action buttons: `Confirm Arrival`, `Reschedule`, `Cancel`.
  * **T-2 Hours Reminder:** Final alert -> Action buttons: `Get Directions`, `Check Live Queue`.
  * **Preparation Notes:** Automated clinical prep instructions (e.g. *"Fasting required for 8 hours prior to lab test"*).
* **PX Standard:** 1-click cancellation or rescheduling releases the slot back to the live public calendar instantly.

---

### Stage 6: Arrival, GPS & Digital Self-Check-in (Physical Visit)
* **Context:** Patient arrives at physical clinic building.
* **Arrival Assistance:**
  * **Navigation:** 1-click Google Maps / Apple Maps route guidance.
  * **Parking & Entrance Note:** Clinic landmark instructions.
  * **Digital Self Check-in:** Patient scans reception desk QR code or taps "I Have Arrived" on mobile web link -> Status changes to `checked_in` -> Queue number assigned automatically.
  * **Live Queue Status:** Patient sees live queue position on phone (*"You are #2 in line. Estimated consult time: 10 mins"*).
* **PX Standard:** Eliminates reception desk congestion and removes uncertainty about wait times.

---

### Stage 6a: Video Teleconsultation Access (Remote Visit)
* **Context:** Patient booked a remote video consultation.
* **Access Flow:**
  1. WhatsApp/SMS reminder contains secure 1-click WebRTC room link.
  2. Patient clicks link -> Opens browser WebRTC video room (zero software download required).
  3. Pre-call device check (Camera, Microphone, Speaker test).
  4. Waiting Room status (*"Dr. Sarah Smith will join shortly"*).
  5. Doctor joins call from Consultation Workbench -> High-definition video call with in-call chat and screen sharing.
* **PX Standard:** Works natively on iOS Safari, Android Chrome, and Desktop without installing apps.

---

### Stage 7: In-Consultation Patient Experience
* **Context:** Doctor examines patient and authors chart.
* **Patient Visibility:**
  * Doctor reviews past medical timeline transparently.
  * Doctor explains diagnosis and walks patient through prescribed medications.
  * Instant digital generation of Prescription & Visit Summary upon consult sign-off.
* **PX Standard:** Respectful, clinical focus; doctor spends time engaging patient rather than typing blindly into a screen.

---

### Stage 8: Unified Completion, Prescription & Receipt
* **Context:** Consultation finishes and patient exits consult room.
* **Post-Consult Deliverables:**
  * **Digital Prescription:** Delivered via WhatsApp PDF link within 10 seconds of sign-off.
  * **Cashier Checkout (If Pending):** Itemized digital receipt generated upon payment.
  * **Diagnostic & Pharmacy Instructions:** Proactive guidance on where to pick up medicines or perform recommended lab tests.
  * **Feedback Prompt:** Automated 1-question rating prompt (*"How was your visit with Dr. Sarah Smith today? 1-5 Stars"*).
* **PX Standard:** Zero waiting at reception counter for physical paper printouts unless explicitly requested.

---

### Stage 9: Retention & Care Continuity
* **Context:** Post-visit health tracking and recurring care loop.
* **Continuity Automated Actions:**
  * **Follow-up Reminder:** Automated WhatsApp alert 3 days prior to recommended follow-up date (*"Dr. Smith recommended a follow-up visit on Aug 10. Click to reserve your slot"*).
  * **Chronic Care & Vaccination Trackers:** Automated reminders for recurring pediatric immunizations or diabetes checkups.
  * **Permanent Health Vault:** All historical Rx PDFs, invoices, and lab reports stored permanently in patient's self-service portal (`/patient/you`).
* **PX Standard:** Long-term patient relationship retention, moving from episodic treatment to continuous health partnership.

---

```markdown
# ==============================================================================
# PATIENT EXPERIENCE PLAYBOOK SUMMARY
# ==============================================================================

Playbook File: PATIENT_EXPERIENCE_PLAYBOOK.md
Status: CONSTITUTIONAL & FROZEN
Governance Rule: All Milestone 2 requirements, UX wireframes, and code must strictly adhere to the Seven PX Principles and Nine Patient Journey Stages defined here.
```
