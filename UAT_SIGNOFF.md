# User Acceptance Testing (UAT) Sign-off Matrix

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Release Target:** Release 1.3 / POE-001  
> **Gate Status:** 🟡 CONDITIONALLY APPROVED (Awaiting Human UAT Execution)  
> **Document Purpose:** Formal acceptance sign-off document for human stakeholders (Receptionist, Doctor, Owner) to perform manual validation of end-to-end clinical and operational workflows.

---

## 1. HUMAN UAT TESTER ASSIGNMENTS

| Role Persona | Tester Name / Title | Verification Date | Surface URL | Target Workstream | Sign-off Verdict |
|---|---|---|---|---|---|
| **Front-Desk Receptionist** | [ Tester Name ] | [ Date ] | `http://localhost:3000/staff` | Workstream B1 (Reception) | 🟡 PENDING UAT |
| **Attending Doctor** | [ Tester Name ] | [ Date ] | `http://localhost:3000/doctor` | Workstream B2 (Doctor) | 🟡 PENDING UAT |
| **Practice Owner** | [ Tester Name ] | [ Date ] | `http://localhost:3000/admin` | Workstream C1 (Owner) | 🟡 PENDING UAT |

---

## 2. UAT SCENARIO VALIDATION MATRIX

### Scenario 1: Front-Desk Receptionist Journey
* **Goal:** Verify walk-in registration, 1-click check-in, emergency priority bypass, doctor transfer, and cashier checkout without leaving `/staff`.
* **Prerequisite Account:** `reception@test.local` / `password123`

| Test Step | Action Required | Expected Result | Human Tester Observed Result | Verdict |
|---|---|---|---|---|
| **1.1 Walk-in Registration** | Click **"New Patient"** (`Cmd+W`), enter mobile `+1 555-019-9999` & name `Anita Roy`, select doctor, submit. | Patient registered in < 30s, token `#1` assigned, profile auto-matched. | [ Tester Comments ] | 🟡 PENDING |
| **1.2 1-Click Check-in** | Click green **"Check In"** on arriving patient's Queue Card. | Status transitions to `waiting`, check-in timestamp logged in timeline. | [ Tester Comments ] | 🟡 PENDING |
| **1.3 Emergency Bypass** | Click **"Actions (•••)"** ➔ **"Set Emergency Priority"**. | Red `[ EMERGENCY ]` badge renders, patient bumped to position #1 in queue. | [ Tester Comments ] | 🟡 PENDING |
| **1.4 Doctor Transfer** | Click **"Actions (•••)"** ➔ **"Reassign Doctor"**, select target doctor. | Patient transferred to target doctor's list, token re-indexed sequentially. | [ Tester Comments ] | 🟡 PENDING |
| **1.5 Cashier Checkout** | Open `/staff/billing`, select invoice, apply ₹100 concession, collect cash, complete. | Invoice status `paid`, receipt PDF generated, visit settled instantly. | [ Tester Comments ] | 🟡 PENDING |

---

### Scenario 2: Attending Doctor Clinical Journey
* **Goal:** Verify uninterrupted consultation charting, structured prescription authoring, and 1-click sign-off on `/doctor`.
* **Prerequisite Account:** `doctor@test.local` / `password123`

| Test Step | Action Required | Expected Result | Human Tester Observed Result | Verdict |
|---|---|---|---|---|
| **2.1 Consult Charting** | Open `/doctor`, select waiting patient from queue rail, click **"Start Consultation"**. | Workbench loads in < 60s, patient medical history & allergy warnings visible. | [ Tester Comments ] | 🟡 PENDING |
| **2.2 Record Vitals & Notes**| Record Chief Complaint, BP `120/80`, Temp `99.4°F`, and Diagnosis `Tension Headache`. | Draft auto-saves locally without page reloads or tab navigation. | [ Tester Comments ] | 🟡 PENDING |
| **2.3 Author Prescription** | Search medicine `Paracetamol`, select `500mg`, frequency `1-0-1`, duration `5 days`, save. | Prescription items stored as structured JSON payload. | [ Tester Comments ] | 🟡 PENDING |
| **2.4 1-Click Sign-off** | Click **"Sign & Complete Visit"**. | Visit completes, fee invoice auto-drafted, `VS-` summary & `RX-` PDF generated. | [ Tester Comments ] | 🟡 PENDING |

---

### Scenario 3: Practice Owner Operational Journey
* **Goal:** Verify morning operational snapshot, real-time KPIs, and service catalog management on `/admin`.
* **Prerequisite Account:** `owner@test.local` / `password123`

| Test Step | Action Required | Expected Result | Human Tester Observed Result | Verdict |
|---|---|---|---|---|
| **3.1 Morning Snapshot** | Open `/admin`, inspect morning summary cards. | Today's revenue, active waiting queue, and doctor availability load accurately. | [ Tester Comments ] | 🟡 PENDING |
| **3.2 Real-Time KPIs** | Inspect practice intelligence graphs & doctor volume breakdowns. | Real-time ledger numbers match collected checkout fees exactly. | [ Tester Comments ] | 🟡 PENDING |
| **3.3 Service Catalog** | Open **"Service Catalog"**, edit consultation fee price or add new procedure. | Updated pricing applies immediately to new consultation invoices. | [ Tester Comments ] | 🟡 PENDING |

---

## 3. HUMAN UAT DEFECT LOG & CORRECTION TRACKER

| Defect ID | Severity (Low/Med/High/Critical) | Workflow Affected | Description | Resolution Status | Verified By |
|---|---|---|---|---|---|
| *None* | — | — | No defects reported during initial test run | 🟢 CLEAN | QA Lead |

---

## 4. FINAL HUMAN UAT SIGN-OFF DECLARATION

```
I hereby confirm that I have executed the User Acceptance Test scenarios detailed above.
The application workflows meet all clinical, operational, and commercial requirements.

Receptionist Sign-off: _______________________ Date: ______________
Doctor Sign-off:       _______________________ Date: ______________
Owner Sign-off:        _______________________ Date: ______________
```
