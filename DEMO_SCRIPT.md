# Auriva 1.3 End-to-End Product Demonstration Script

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Demonstration Target:** Certified Workstreams B1 (Reception), B2 (Doctor), and C1 (Owner)  
> **Total Demo Duration:** ~15 Minutes

---

## 🎬 DEMO OVERVIEW & PRECONDITIONS

### User Personas & Validated Credentials
1. **Front-Desk Receptionist:** `staff@aegiscare.com` / `password123` (`/staff`)
2. **Attending Doctor:** `dr.smith@aegiscare.com` / `password123` (`/doctor`)
3. **Practice Owner:** `admin@aegiscare.com` / `password123` (`/admin`)

---

## 📋 SCENARIO WALKTHROUGH

### Part 1: Front-Desk Reception Excellence (5 Minutes)
1. **Step 1 — Rapid Walk-in Registration (`REQ-REC-002`)**:
   - Open `http://localhost:3000/login` and sign in as `staff@aegiscare.com` / `password123`.
   - Open Reception Surface (`/staff`). Click **"New Patient"** (`Cmd+W`).
   - Enter mobile number `+1 555-019-9999` and Patient Name `Anita Roy`.
   - Select Doctor `Dr. Sarah Smith`. Click **"Add to Queue"**.
   - *Result:* Patient is registered and assigned sequential Token `#1` in < 30 seconds.

2. **Step 2 — 1-Click Check-in (`REQ-REC-001`)**:
   - Locate scheduled appointment on the Queue Board.
   - Click the green **"Check In"** button on the Queue Card.
   - *Result:* Appointment status transitions to `waiting`, and check-in timestamp is logged.

3. **Step 3 — Emergency Patient Queue Bypass (`REQ-REC-003`)**:
   - Click **"Actions (•••)"** on an arriving emergency patient's Queue Card.
   - Select **"Set Emergency Priority"**.
   - *Result:* Red **`[ EMERGENCY ]`** badge renders on the card, and patient is bumped to position #1 in doctor's queue.

4. **Step 4 — Doctor Queue Transfer (`REQ-REC-004`)**:
   - Click **"Actions (•••)"** ➔ **"Reassign Doctor"**.
   - Pick `Dr. Elena Patel`.
   - *Result:* Patient is transferred to target doctor with a fresh sequential queue token.

---

### Part 2: Doctor Clinical Workbench (5 Minutes)
1. **Step 1 — Uninterrupted Consultation Charting (`REQ-DOC-001`)**:
   - Sign in as `dr.smith@aegiscare.com` / `password123` (`/doctor`). Select active patient from queue rail.
   - Click **"Start Consultation"**.
   - Record Chief Complaint ("Acute migraine & fever"), Vitals (BP 120/80, Temp 99.4°F), and Diagnosis ("Acute Tension Headache").

2. **Step 2 — Structured Prescription Authoring (`REQ-DOC-002`)**:
   - Scroll to Prescription Section. Type `Paracetamol` in medicine search.
   - Select dosage `500mg`, frequency `1-0-1 (After meals)`, duration `5 days`.
   - Click **"Save Draft Rx"**.

3. **Step 3 — 1-Click Sign-off & Automated Invoicing (`REQ-DOC-003`)**:
   - Click **"Sign & Complete Visit"**.
   - *Result:* Consultation completes, consultation fee invoice drafts automatically, and printable Visit Summary (`VS-` numbered) and Prescription PDF (`RX-` numbered) are snapshot-generated.

---

### Part 3: Instant Cashier Checkout & Owner Command Center (5 Minutes)
1. **Step 1 — 1-Click Cashier Checkout (`REQ-REC-005`)**:
   - Switch back to Reception (`/staff/billing`). Select completed visit invoice.
   - Apply authorized concession (₹100 discount, reason: "Senior Citizen").
   - Select payment method **Cash / UPI**. Click **"Collect Payment & Complete"**.
   - *Result:* Invoice transitions to `paid`, visit settles, and receipt PDF (`RC-` numbered) is generated.

2. **Step 2 — Owner Command Center & KPIs (`REQ-OWN-001`, `REQ-OWN-002`, `REQ-OWN-003`)**:
   - Sign in as `admin@aegiscare.com` / `password123` (`/admin`).
   - Observe morning operational snapshot: Today's Revenue, Active Waiting Queue, and Doctor Productivity.
   - Navigate to **"Service Catalog"** (`REQ-OWN-003`) to manage procedure prices and categories.
