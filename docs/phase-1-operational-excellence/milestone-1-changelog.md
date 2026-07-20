# Operational Excellence — Milestone 1 Changelog

**Milestone:** Phase 1 · Operational Excellence · **Wave 1 (P0)**
**Status:** ✅ Implemented · ✅ Product Office approved · ✅ Data/logic QA passed · ⏳ Human UI QA pending
**Commit:** `9d9c684`
**Scope shipped:** Universal Search (2.1 + 2.2) · Amount on Collect (1.2) · Outstanding Balance (1.6) · Reception Context Flags (4.4)
**Guardrail honoured:** display/search only — **no** business-rule, workflow, invoice-lifecycle, status-machine, or schema change.

---

## Feature 1 — Universal (Global) Patient Search

### What changed
The ⌘K command palette — previously **admin-only** and name-only — is now a **shared** component on **Reception, Doctor, and Admin**, searching by **name, phone, or Auriva Health ID**, **scoped to the caller's organization**, on the *existing* `/api/patients` endpoint.

### Before → After
```
BEFORE                                   AFTER
• ⌘K on /admin only                      • ⌘K on /staff, /doctor, /admin
• Search: name only                      • Search: name · phone · AUR-ID (auto-detected)
• Cross-org results (isolation gap)      • Org-scoped (tenant-isolated)
• Reception/Doctor: no global lookup     • One shared palette; one search UX
• 3 duplicate searches never built       • 4/5 items reuse existing backend; 0 new APIs
```

### Screenshot (wireframe — 📸 placeholder: ⌘K on `/staff` and `/doctor`)
```
┌ ⌘K ─────────────────────────────────────────────┐
│  Search patients (name · phone · AUR-ID) or jump… │
├───────────────────────────────────────────────────┤
│  PATIENTS                                          │
│   👤 Amit Patel                      AUR-ACDTJB    │
│  ─────────────────────────────────────────────    │
│  JUMP TO                                           │
│   🩺 Today   📋 Workbench   📅 Schedule  …         │
└───────────────────────────────────────────────────┘
```

### User journey
`⌘K → type "Amit" / "9876500101" / "AUR-…" → select → patient record (/staff/patients/[id] or /doctor/patients/[id])`

### Business benefit
Removes a daily friction — staff find any patient (across time, not just today's board) in one keystroke, enabling history lookup, balance collection, and re-booking without detours. One shared component means **future search upgrades happen once**.

### Engineering notes
- Reused `resolveHealthcareProfile`; added an optional `organizationId` filter + `scope=org` param (additive; walk-in/book stay cross-org by design).
- Doctor result target: new `/doctor/patients/[id]` **reuses** `PatientTimeline` (its endpoint already allows the doctor capability and is clinic-scoped).
- Input-pattern detection routes to the right identity param.

---

## Feature 2 — Amount on Collect (1.2)

### What changed
The reception board's **Done · to collect** card now shows the **exact amount owed** — "Collect ₹600" — or "Collected" when nothing is due.

### Before → After
```
BEFORE                          AFTER
[ ₹ Collect ]  → open Desk       [ ₹ Collect ₹600 ]   (owed)
(amount unknown until Desk)      [ ₹ Collected ]      (paid)
```

### Screenshot (wireframe — 📸 placeholder: `/staff/queue` Done lane)
```
┌ Kiran Rao ───────────┐   ┌ Mohammed Farooq ─────┐
│ 🩺 Dr Arjun          │   │ 🩺 Dr Vikram         │
│ [Completed]          │   │ [Completed]          │
│ [ ₹ Collect ₹600 ]   │   │  ₹ Collected         │
└──────────────────────┘   └──────────────────────┘
```

### User journey
`Doctor completes → card flips to Done · Collect ₹X → reception sees the amount → Collect → Desk`

### Business benefit
Reception knows what to ask for at a glance — faster, more confident collection; fewer "let me check" moments at the highest-frequency money action.

### Engineering notes
Amount is `invoice_balance` on the queue payload, computed as `total − Σpayments` over the appointment's open invoice — **the same Invoice rows the Desk reads**, so the numbers can never disagree (QA-verified).

---

## Feature 3 — Reception Context Flags (1.6 + 4.4)

### What changed
Queue cards now carry read-only, glanceable context: **Returning / New**, **⚠ Allergy** (only when on file), and **₹X due** (prior outstanding balance).

### Before → After
```
BEFORE                          AFTER
Name · #token · time            Name · #token · time
🩺 Doctor                        🩺 Doctor
(no context)                    [Returning] [⚠ Allergy] [₹300 due]
```

### Screenshot (wireframe — 📸 placeholder: `/staff/queue` Waiting/Consult lanes)
```
┌ Amit Patel ──────────────────┐
│ #1 · 4:50 PM                  │
│ 🩺 Dr Ananya Iyer            │
│ [Returning] [⚠ Allergy]      │
└───────────────────────────────┘
```

### User journey
`Patient checks in → reception sees Returning + Allergy + any prior due at a glance → handles appropriately (collect old dues, note allergy) without opening anything`

### Business benefit
- **Returning/New** → right level of registration care.
- **⚠ Allergy** → safety, surfaced where the eye already is.
- **₹ due** → recovers leaked revenue at the only reliable moment (patient physically present).

### Engineering notes
All three derive from the **enriched queue payload** — `patient.allergies` (projection), `is_returning` (prior completed visit at this clinic), `patient_outstanding_balance` (open invoices). **Batched (2 extra queries per board load, independent of queue size)** — no N+1. Chips use the shared `Badge`; colour + icon + label (never colour alone).

---

## QA status

### ✅ Data / logic layer — verified against the live DB (12/12)
| Check | Result |
|---|---|
| Search by Health ID / phone / name → same patient | ✅ |
| Amit belongs to Sunrise org (scoped search keeps him) | ✅ |
| Amit does **not** belong to a foreign org ("My Clinic") — **isolation** | ✅ |
| Kiran Collect = invoice balance ₹600 (SUN-0002, issued) | ✅ |
| Farooq (paid) → balance 0 → "Collected" | ✅ |
| Amit is Returning (1 prior completed) | ✅ |
| Amit allergy chip shows (Penicillin); Lakshmi's hidden | ✅ |
| New patient immediately searchable + org-scoped | ✅ |

### ⏳ Human UI pass — remaining (requires a browser; steps provided)
- ⌘K / Esc / arrows / Enter / mouse on all three surfaces.
- Board → Desk → Invoice amounts identical on screen.
- Doctor: search → timeline → previous visit → prescription → Back (no broken nav).
- Multi-clinic: log into Clinic A, confirm Clinic B patients never appear.

---

## Known limitations
- Search org-scoping applies to the **global palette** only; walk-in/book identity resolution stays cross-org **by design** (patient portability).
- Doctor's patient timeline is **clinic-scoped** (other-clinic visits not shown to that doctor).
- **"Returning"** = prior completed **at this clinic** (not org-wide).
- Context flags + Collect amount are **reception-board only** (doctor board / patient app untouched — as scoped).
- Collect still routes to the **Desk** (no inline checkout sheet — deliberately out of scope).
- **No new automated tests** were added this milestone (verified via the full suite + this data QA). Adding unit coverage for `enrichQueue` + `scopeProfilesToOrg` is the top M2 hygiene item.

---

## Engineering summary
- **Files:** 11 changed (2 new: shared palette, `/doctor/patients/[id]`).
- **APIs:** `/api/patients` gains additive `scope=org`; **no new endpoints**.
- **DB:** none.
- **Verification:** tsc clean · 522/522 tests · `next build` clean · 12/12 data QA · no new lint over baseline.
