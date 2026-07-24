# Auriva Practice Operations Product Specification (POPS-001)

> **Document Classification:** Product Office Product & Experience Specification  
> **Milestone Target:** **Practice Operations Excellence (POE-001)**  
> **Preceding Artifacts:** `PRACTICE_OPERATIONS_BASELINE_REPORT.md`, `POE_SCREEN_FUTURES_DECISION_MATRIX.md`  
> **Succeeding Artifacts:** `EXECUTIVE_PRODUCT_REVIEW_EPR_001.md`, `BRD-POE-001` (Business Requirements), `FRD-POE-001`  
> **Authors:** Institutional Product Discovery Team & Product Office  
> **Status:** 🔒 FROZEN PRODUCT & EXPERIENCE SPECIFICATION

---

## 1. PRODUCT PHILOSOPHY & EXPERIENCE AMBITION

Auriva is a **Healthcare Operating System** designed to give the consultation room and practice operations back to the people in them. The core philosophy of **Practice Operations Excellence (POE-001)** is to evolve, simplify, and premiumize Auriva from a set of well-built operational modules into **one seamless, intuitive practice operating experience**.

### 1.1 Persona Experience Ambitions
* **The Receptionist:** The reception interface must be **stress-free, visual, and self-explanatory**. A newly hired receptionist must be fully productive within **15 minutes of zero-training onboarding**. Moving a patient from walk-in arrival to check-in, consultation, and payment must require **1 tap per stage** with zero button hunting.
* **The Doctor:** The doctor interface must deliver **uninterrupted clinical focus**. A doctor seeing 30 patients a day must never feel like a data-entry clerk. The workbench must present high, comfortable information density with zero clutter, allowing clinical notes, prescriptions, and lab orders to be completed in **under 60 seconds per visit**.
* **The Practice Owner:** The owner interface must instill **complete operational calm**. The morning review must take **less than 2 minutes**, immediately highlighting today's revenue, active appointments, pending collections, and potential room bottlenecks without requiring complex report configuration.
* **The Patient:** The patient interface must communicate **warmth, reassurance, and transparency**. Every interaction should feel like being taken care of, eliminating administrative anxiety and providing instant access to care plans and health records.

---

## 2. WORKSPACE PHILOSOPHY: `Workspace → Role → Task`

Today, Auriva presents five distinct surfaces (`/clinic`, `/doctor`, `/staff`, `/admin`, `/patient`) that can feel like separate applications. POE-001 shifts the architectural paradigm to **`Workspace → Role → Task`**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    UNIFIED CLINIC WORKSPACE                                      │
│                             (Adaptive Conceptual Shell & Hub Model)                              │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
       STAFF & PRACTICE SURFACE                                       PATIENT PORTAL SURFACE
  (Dynamically adapts by Role & Task)                            (Scoped by Health Profile)
  
  Active Context: Springfield Medical Clinic                      Active Identity: Rajesh Kumar (Self)
  
  ┌──────────────────────────────────────────────┐                ┌────────────────────────────────┐
  │ 1. OPERATIONS HUB                            │                │ 1. CARE HUB                    │
  │    (Queue Board, Walk-in, Desk, Calendar)    │                │    (Care Plan, Next Visit)     │
  ├──────────────────────────────────────────────┤                ├────────────────────────────────┤
  │ 2. CLINICAL HUB                              │                │ 2. FIND CARE                   │
  │    (Today Queue, Workbench, Patient Records) │                │    (Search, Slot Booking)      │
  ├──────────────────────────────────────────────┤                ├────────────────────────────────┤
  │ 3. FINANCE HUB                               │                │ 3. RECORDS VAULT               │
  │    (Cashier Checkout, Invoices, Ledger)      │                │    (Prescriptions, Invoices)    │
  ├──────────────────────────────────────────────┤                ├────────────────────────────────┤
  │ 4. MANAGEMENT HUB                            │                │ 4. FAMILY ACCOUNT              │
  │    (Command Center, Team, Reports, Settings) │                │    (Linked Profiles, Settings) │
  └──────────────────────────────────────────────┘                └────────────────────────────────┘
```

> **IMPORTANT ARCHITECTURAL GOVERNANCE NOTE (URL Decoupling):**  
> The 4 functional hubs (Operations, Clinical, Finance, Management) define the **conceptual and visual information architecture**. Physical URL routing (e.g., whether pages live at `/staff/queue`, `/doctor/workbench`, `/clinic`, or new unified route trees) remains an **engineering implementation decision**. Engineering is free to preserve low-risk existing route paths while mounting the new unified adaptive shell.

---

## 3. NAVIGATION PHILOSOPHY

Navigation in POE-001 is built around answering four fundamental user questions at all times:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                THE 4 NAVIGATIONAL ANCHORS                                        │
├───────────────────────────────┬───────────────────────────────┬──────────────────────────────────┤
│ 1. "Where am I?"              │ 2. "What should I do next?"   │ 3. "What changed?"               │
│ Clear breadcrumbs & header    │ Single obvious primary button │ Subtle toast & status indicators │
├───────────────────────────────┴───────────────────────────────┴──────────────────────────────────┤
│ 4. "What needs attention?"                                                                       │
│ Urgent alert banners & badge counters for uncollected bills or waiting bottlenecks               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Core Navigation Rules
* **The Global Command Palette (`Cmd+K`):** Accessible anywhere in the staff surface. Allows instantaneous jumping to any patient file, appointment slot, doctor schedule, or billing invoice within 3 keystrokes.
* **Breadcrumb Hierarchy:** Persistent breadcrumbs at the top of secondary views (e.g., `Operations > Queue > Patient: Rajesh Kumar`).
* **Recent Items & Favorites:** The sidebar provides a quick dropdown for recently viewed patient files and frequent clinical templates.
* **No Hidden Primary Actions:** Every screen features **exactly one prominent primary CTA** (e.g., "Check In", "Start Consultation", "Collect ₹500").

---

## 4. RESTRUCTURED INFORMATION ARCHITECTURE (IA)

POE-001 consolidates fragmented screens into **four clean functional hubs**:

```
                       ┌─────────────────────────────────────────┐
                       │          AURIVA INFORMATION IA          │
                       └────────────────────┬────────────────────┘
                                            │
        ┌──────────────────┬────────────────┴──────────────────┬──────────────────┐
        ▼                  ▼                                   ▼                  ▼
┌──────────────┐   ┌──────────────┐                    ┌──────────────┐   ┌──────────────┐
│  OPERATIONS  │   │   CLINICAL   │                    │   FINANCE    │   │  MANAGEMENT  │
├──────────────┤   ├──────────────┤                    ├──────────────┤   ├──────────────┤
│ • Queue      │   │ • Today      │                    │ • Desk & Cash│   │ • Command Ctr│
│ • Walk-in    │   │ • Workbench  │                    │ • Invoices   │   │ • Team & Roles│
│ • Calendar   │   │ • Patients   │                    │ • Payments   │   │ • Practice   │
│ • Lab Orders │   │ • Schedules  │                    │ • Services   │   │ • Insights   │
└──────────────┘   └──────────────┘                    └──────────────┘   └──────────────┘
```

---

## 5. EXPERIENCE PRINCIPLES

Every screen, interaction, and component in POE-001 must adhere to seven foundational experience principles:

1. **Calm:** Software in a healthcare setting must reduce anxiety. Use generous whitespace, soft warm ground tones, rounded container cards, and zero aggressive error walls.
2. **Premium:** Aesthetics inspire trust. High visual polish, curated color tokens, crisp typography, and refined micro-animations demonstrate high product quality.
3. **Fast:** Zero perceptible UI lag. Actions update optimistically on the client, zero full-page reloads, keyboard shortcuts for all repetitive actions.
4. **Human:** Copy should feel like a supportive clinical colleague ("Good morning, Dr. Sharma", "All caught up — no patients waiting").
5. **Modern:** Contemporary design patterns, clean border radii (`12px`), subtle backdrop blurs, and semantic status tags.
6. **Trustworthy:** Healthcare data requires absolute reliability. Every mutation is audited, financial records are immutable, and undo is supported for accidental state changes.
7. **Never Overwhelming:** Information is presented with **comfortable density** and progressive disclosure. Advanced fields are revealed only when needed.

---

## 6. DESIGN PRINCIPLES: THE "ONE QUESTION PER SCREEN" RULE

To maintain absolute clarity, **no primary screen in Auriva may answer more than ONE operational question**:

| Primary Screen | Single Operational Question Answered | Primary Call-to-Action |
|---|---|---|
| **Today Queue Board** | *"Who needs attention right now in the clinic?"* | **[ Check In ]** / **[ Send In ]** |
| **Consultation Workbench** | *"Who am I consulting right now and what is their clinical state?"* | **[ Sign & Complete ]** |
| **Billing Desk** | *"Who owes money and how do I collect it?"* | **[ Collect Payment ]** |
| **Owner Command Center** | *"What is happening across my practice today?"* | **[ View Alerts ]** |
| **Doctor Schedule** | *"When am I available to see patients and when am I taking leave?"*| **[ Block Time / Request Leave ]** |
| **Patient Care Hub** | *"What is my active care plan and when is my next appointment?"* | **[ Book Appointment ]** |

---

## 7. OPERATIONAL PRINCIPLES

1. **One-Click Progression:** Advancing a patient through the visit lifecycle must be achievable in a single click at each stage (`Check In` ➔ `Send In` ➔ `Complete` ➔ `Collect`).
2. **Context Preservation:** Never force a user to abandon their current view to look up background context. Use non-modal side drawers (e.g., patient past history drawer inside the workbench).
3. **Zero Duplicate Workspaces:** Single cashier checkout interface used by both dedicated receptionists and solo owner-doctors.
4. **Instant Reversible Actions:** Status changes (e.g., accidental check-in or cancellation) present an instant 5-second "Undo" toast.

---

## 8. PREMIUM GUIDELINES (DESIGN SYSTEM V2 SPECIFICATIONS)

### 8.1 Color System & Semantic Tokens
* **Pine Teal (`#0B4A41` / `#083F37`):** Anchors staff productivity, headers, primary action buttons, and active navigation states.
* **Honey Amber (`#E8A24C` / `#854A0B`):** Anchors patient warmth, primary patient call-to-actions, highlight badges, and readiness indicators.
* **Neutral Ground (`bg-muted/30` / `#FAFAFA`):** Warm paper background giving cards clear breathing room.
* **Semantic Status Palette:**
  * `Success`: `hsl(142, 72%, 29%)` (Completed, Paid)
  * `Warning`: `hsl(38, 92%, 50%)` (Waiting, Payment Due)
  * `Destructive`: `hsl(0, 84%, 60%)` (Cancelled, Blocked, Emergency)

### 8.2 Typography & Spacing Scale
* **Font Family:** `Outfit` for brand headings; `Inter` for crisp body text and data tables.
* **Type Scale:** `text-xs` (12px), `text-sm` (14px body), `text-base` (16px titles), `text-xl` (20px section headers), `text-2xl` (24px hero stats).
* **Spacing Scale:** Standard 4px grid (`gap-1.5`, `gap-3`, `gap-4`, `p-4`, `p-6`).

### 8.3 Components Polish & Micro-Interactions
* **Cards:** Border radius `rounded-xl` (`12px`), subtle border `border-border/60`, elevation `shadow-xs`.
* **Tables:** Comfortable density (`py-2.5`), sticky headers, alternate row background shading, hover highlight.
* **Loading States:** Shimmer skeletons matching exact card layout shapes (no generic spinners).

---

## 9. SUCCESS METRICS & QUANTIFIABLE TARGETS

The success of **Practice Operations Excellence (POE-001)** will be measured against strict operational key performance indicators:

| Operational Metric | Current Baseline | POE-001 Target | Business Impact |
|---|---|---|---|
| **Patient Check-in Duration** | 90 seconds | **< 20 seconds** | 77% reduction in front-desk bottleneck |
| **Walk-in Registration Time** | 120 seconds | **< 30 seconds** | Rapid queue entry during peak OPD hours |
| **Consultation Sign-off to Invoice Draft** | 4 clicks (Manual) | **0 clicks (Automated)**| 100% elimination of unbilled visits |
| **Cashier Payment Collection** | 45 seconds | **< 15 seconds** | Instant 1-click cashier checkout modal |
| **Owner Morning Practice Review** | 10 minutes | **< 2 minutes** | Immediate operational clarity for owners |
| **New Staff Onboarding Time** | 3 days | **< 15 minutes** | Zero-training reception board design |
| **Context-Switching Nav Overhead** | 4 route changes | **0 route changes** | Side-drawer history & 1-click checkout |

---

## 10. WORKSTREAM SEQUENCING STRUCTURE

To ensure flawless collaboration between Design, Product Office, and Engineering, POE-001 is structured into **three sequential workstreams**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   POE-001 WORKSTREAM STRUCTURE                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ WORKSTREAM A: EXPERIENCE FOUNDATION                                                              │
│ • Epic 1: Workspace & Navigation Evolution                                                       │
│ • Design System v2 & Token Architecture                                                          │
│ • Information Architecture Consolidation (4 Core Hubs)                                           │
│ • Global Command Palette (`Cmd+K`) & Breadcrumb Engine                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ WORKSTREAM B: OPERATIONAL EXCELLENCE                                                             │
│ • Epic 2: Reception Excellence (Drag & Drop Queue, Emergency Bypass, 1-Click Checkout)           │
│ • Epic 3: Scheduling Excellence (Leave Engine OPS-002, Doctor Swaps, Capacity Planning)          │
│ • Epic 6: Team Operations (Expanded Staff Directory, Leave Approvals, Capability Grants)         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ WORKSTREAM C: MANAGEMENT INTELLIGENCE                                                            │
│ • Epic 4: Owner Command Center (Morning Operational Snapshot Dashboard)                          │
│ • Epic 5: Operational Intelligence (Real-time Practice KPIs, Doctor Utilization, Wait Times)     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

> **Document Status:** 🔒 APPROVED BY PRODUCT OFFICE  
> *This specification is the authoritative bridge for drafting `BRD-POE-001`.*
