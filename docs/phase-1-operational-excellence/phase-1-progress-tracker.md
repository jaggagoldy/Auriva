# Phase 1 — Operational Excellence · Progress Tracker

**Purpose:** the single at-a-glance status of Phase 1, milestone by milestone. Updated at the close of each milestone.

## Milestones

| Milestone | Scope | Status |
|---|---|---|
| **M1** | Universal Search (2.1/2.2) · Amount on Collect (1.2) · Outstanding Balance (1.6) · Reception Context Flags (4.4) | ✅ **Shipped & QA-passed** |
| **M2** | Doctor Filter Model (3.1) · Availability (3.2) · Doctor Picker (3.3) · Reassignment (3.4) · Quick Peek (4.1) · Reschedule (4.2) · Walk-in Speed (4.3) | ✅ **Shipped & QA-passed** |
| **M3** | Configurable Billing Policy (1.1) + Services Catalog (5.1) | ⏳ Not started |
| **M4** | Consultation Enhancements & Clinical Depth (5.2–5.6) | ⏳ Not started |

## Roadmap item status (from the Phase 1 epics)

| ID | Item | Milestone | Status |
|---|---|---|---|
| 1.2 | Amount on Collect | M1 | ✅ |
| 1.6 | Outstanding-balance flag | M1 | ✅ |
| 2.1 | Global patient search | M1 | ✅ |
| 2.2 | Health-ID search | M1 | ✅ |
| 4.4 | Reception context flags | M1 | ✅ |
| 3.1 | Consistent doctor-filter model | M2 | ✅ |
| 3.2 | Availability-aware discovery | M2 | ✅ |
| 3.3 | Unified doctor picker (+ load + slot) | M2 | ✅ |
| 3.4 | Doctor reassignment (+ audit) | M2 | ✅ |
| 4.1 | Patient quick peek | M2 | ✅ |
| 4.2 | Reschedule on the board | M2 | ✅ |
| 4.3 | Walk-in speed | M2 | ✅ |
| 1.1 | Configurable payment-timing policy | M3 | ⏳ (needs PO design) |
| 5.1 | Services catalog → invoice | M3 | ⏳ (needs ownership decision) |
| 2.3 | One search component | later | ◑ partial (shared palette shipped) |
| 2.4 | Server-side doctor search | later | ⏳ |
| 2.5 | Records search (patient) | later | ⏳ |
| 4.5 | Unified board + calendar view | M4+ | ⏳ (deferred, decision D) |
| 5.2–5.6 | Investigations/lab depth · SOAP · structured data | M4 | ⏳ |
| 1.5 / 5.7 | Receipt + follow-up delivery | blocked | 🔒 needs notification platform (TD-04) |

## Product Office backlog (logged, not scheduled)

| Item | When | Note |
|---|---|---|
| Doctor-card **rating + fee** on the picker | before Phase 1 ends | Patients/reception decide on specialty · availability · **fee** · reputation |
| Doctor-card **languages + gender** | later | Future picker enhancement |
| `/patient/find-care` cleanup | anytime | Legacy route; separate ticket — never mixed with operational work |
| Reassign-with-time (if desired) | TBD | Currently doctor-only by design; reschedule handles time |

## Gate compliance (every milestone)

| Gate | M1 | M2 |
|---|---|---|
| 1. Engineering (tsc · build · tests · lint) | ✅ | ✅ |
| 2. Product Office (scope · vision) | ✅ | ✅ |
| 3. QA (data + human UI) | ✅ | ✅ |
| 4. Documentation (changelog + bundle) | ✅ (bundled here) | ✅ |
| 5. Go/No-Go (explicit approval) | ✅ | ✅ |

## Next decision (before M3)
The Product Office must settle the two M3 design questions before engineering starts:
1. **Payment-timing policy** (before / after / hybrid) — the one business-rule change.
2. **Services-in-consult ownership** — doctor at consult, reception at checkout, or both.
