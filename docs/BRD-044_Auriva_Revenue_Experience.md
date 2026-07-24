# BRD-044 — Auriva Visit & Revenue Experience (Milestone 3B) + Document Engine Foundation

> **Version:** 1.1 — incorporates Product Office approval + refinements (Checkout language, the *Visit* concept, Basic Visit Summary into M3B, reordered checkpoints, M4 renamed, Patient Timeline, D1–D10 resolved).
> **Status:** DESIGN / ANALYSIS ONLY. No implementation authorized by this document.
> **Gate:** BRD approved ✅ → **next deliverable is the checkpointed M3B Engineering Plan** → *then* implementation, one checkpoint at a time. No code until the plan is approved.
> **Builds on:** M3A Revenue Foundation (complete) — `ServiceEvent` → `InvoiceLine` → frozen `items_json`; clinic `billing_policy`; permission-by-kind; deterministic/idempotent settlement engine. **M3B exposes what M3A already made true.**
> **Author role:** Product Office (design) + product guardian.

---

## 0. The organizing concept: the **Visit**

A consultation is only one part of what happens. The unit Auriva orchestrates is the **Visit**:

```
Visit
├── Consultation      (clinical assessment)
├── Prescription      (medicines)
├── Services          (procedures, injections, labs, consumables)
├── Charges           (financial assembly)
├── Checkout          (payment)
└── Documents         (visit summary, invoice, receipt)
```

Everything in M3B belongs to **one Visit**. The doctor's terminal action is **Complete Visit** (not "Complete Consultation") — and completing a visit produces a **document set** (§8), not just an invoice. This language is used everywhere in the product: *Visit*, *Complete Visit*, *Checkout* — never "Billing."

---

## 1. Purpose & framing

M3B is the **daily Visit & Revenue workflow**: doctor captures services → reception reviews charges → **checkout** → payment → the visit's documents (Visit Summary, Invoice, Receipt) → patient leaves. Today that journey does not exist in the UI; the **engine underneath it does** (M3A).

**Design principle for all of M3B:** the UI never invents financial logic. Every amount, line, balance, and state transition is produced by the M3A services. M3B is a **presentation and orchestration layer** over a proven core; a rule the engine lacks is a backend change to raise, not something typed into a screen.

**Pillar alignment (guardrail check):** M3B strengthens Pillar 3 (Financial Operations), Pillar 1 (Clinical Excellence — service capture + Basic Visit Summary), and Pillar 4 (Patient Engagement — the document set feeds the patient timeline). **No red-flag drift.** One deferred item — *communication channels* — depends on Pillar 6 infrastructure that does not yet exist (§9).

---

## 2. What M3A already gives us (so M3B doesn't rebuild it)

| Capability | Already real (M3A) | M3B's job |
|---|---|---|
| Atomic charge fact | `ServiceEvent` (draft→finalized→reversed/removed) | **Capture UI** creates drafts |
| Permission-by-kind | doctor⇒clinical, reception⇒financial | UI shows only the role's allowed actions |
| Invoice generation | `settleInvoiceFromEvents` (deterministic, idempotent, reconciled) | **Checkout** triggers/reads it |
| Outstanding balance | derived (`total − Σ payments`) | **Display** only — never stored |
| Clinic billing policy | stored + audited, **inactive** | **Activate**: policy gates the visit *sequence* |
| Adjustments / credit notes | `InvoiceLine.origin` enum + `discount_amount`/`tax_amount`/`net_amount` columns exist | **Populate** via corrections workflows |
| Reversal (post-payment) | `reverseServiceEvent` (reason mandatory, audited) | **Credit-note** workflow consumes it |
| Patient timeline | `timeline-service.ts` (real) | **Feed** each visit's documents into it |

**Consequence:** M3B is smaller than it looks. Integrity, reconciliation, idempotency are done.

---

## 3. The Visit journey (end-to-end)

```
Reception → Register/Search → Appointment → [Billing policy applied] → Check-in
                                                                           │
                                                                           ▼
Doctor    → Consultation → Diagnosis → Prescription → Add Services → COMPLETE VISIT
                                                                           │
                                                                           ▼
Billing Engine (M3A) → finalize events → InvoiceLines → Invoice → Outstanding
                                                                           │
                                                                           ▼
Reception → CHECKOUT → Review Charges → Discount (if allowed) → Collect Payment
                                                                           │
                                                                           ▼
Document Set → 📄 Visit Summary  🧾 Invoice  💰 Receipt   → feeds Patient Timeline
                                                                           │
                                                                           ▼
Patient   → Printed copy / PDF download   (WhatsApp/Email = deferred, §9)
```

---

## 4. The modules

### Module — Clinical Service Capture (Doctor)

**Where:** inside the existing Consultation Workbench (`consultation-workbench.tsx`) — a new "Services" section beneath Diagnosis/Prescription. **Not a new screen.**

**What:** the doctor adds clinical `ServiceEvent`s (status `draft`):
- Categories: Consultation, Procedure, Injection, Therapy, Lab, Radiology, Vaccination, Consumable (`kind = clinical`).
- Source: pick from the clinic **service catalog** (snapshotted) or **ad-hoc** (flagged `needs_catalog_review`).
- Permission: `canActorAddKind("doctor","clinical")` — the doctor cannot add financial charges (Registration etc.).
- Doctor **sees prices** (transparency, D2) but cannot collect. Edits **quantity only**; catalog price locked; ad-hoc may set a price (D1).
- On **Complete Visit**: `completeVisitInvoicing` finalizes these drafts and settles them (built). None added → today's consultation-fee auto-draft (unchanged).

### Module — Reception **Checkout Workspace**

*(Renamed from "Billing Workspace" per PO — reception thinks "I'm checking out today's patient," not "I'm doing billing." Evolves the existing `billing-board.tsx`.)*

**What:** reception opens a visit and sees charges **assembled automatically** — no manual amount typing:
```
Checkout · Visit #… · Dr …
  Consultation      ₹500
  Injection         ₹150
  ECG               ₹300
  Registration      ₹100   ← reception-added (financial)
  ────────────────────────
  Subtotal        ₹1,050
  Discount           —
  Outstanding     ₹1,050   (derived: total − Σ payments)
```
- Reception may add **financial** `ServiceEvent`s (Registration, Administrative, Consumable) — `kind = financial`.
- Read from `InvoiceLine`s + snapshot; **outstanding always derived**, never stored.
- Defaults to one visit = one invoice (multi-invoice engine-ready but UI-hidden, D7).

### Module — Checkout (payment)

Deliberately **separate** from consultation — money never lives inside the clinical surface.
```
Outstanding  ₹1,050
Payment:  ○ Cash  ○ Card  ○ UPI  ○ Split
[ Collect ₹1,050 ]  → Receipt
```
- Uses `recordPayment` (many-payments-per-invoice already supported → **partial + split are just multiple `Payment` rows**).
- **Split** = several methods in one checkout → multiple `Payment` rows, one invoice.
- Full settlement → invoice `paid` → produce **Receipt** (§8) → close visit.
- Partial → invoice `issued`, outstanding recalculated, checkout resumable.

### Module — Billing Policy behavior (the one real behavior change)

M3A stores the policy; M3B **activates its effect on the visit sequence** (screens unchanged; the *order* differs):

| Policy | Sequence |
|---|---|
| **Postpaid** (default today) | Doctor → Checkout → Payment. **= current behavior.** |
| **Prepaid** | Consultation fee collected **before the doctor**; additional services at checkout. |
| **Hybrid** | Consultation up front; **additional** services at checkout. |

**Prepaid gate (D3): soft by default, hard configurable.** Soft = warn + audited override with reason; hard (opt-in per clinic) = block check-in/consult until the consultation fee is collected. A hard, unconditional block reintroduces the friction Phase 1 exists to remove.

### Module — Financial Corrections (its own workspace)

**Iron rule:** *reception never edits a paid invoice.* Corrections are **append-only, audited counter-documents.**

| Correction | Before payment | After payment |
|---|---|---|
| **Discount** | Adjustment line (`origin = ManualAdjustment`) on the draft invoice — reception up to a clinic-set cap, above → owner (D4) | Not an edit — issue a **Credit Note** |
| **Credit Note** | — | Immutable document (`origin = CreditNote`), owner/manager authorized (D5); links reversed `ServiceEvent`(s) |
| **Refund** | — | Refund Payment against a Credit Note; **owner approval always**, fully audited (D6) |

---

## 5. Cross-cutting concerns

### 5.1 Permissions (visibility ≥ authority)
| Action | Doctor | Reception | Owner / Managing Doctor |
|---|---|---|---|
| Add clinical service | ✅ | ❌ | ✅ (if consulting) |
| Add financial charge | ❌ | ✅ | ✅ |
| Collect payment | ❌ | ✅ | ✅ |
| Apply discount | ❌ | ✅ up to cap (D4) | ✅ |
| Credit note | ❌ | request | ✅ (D5) |
| Refund | ❌ | request | ✅ approve (D6) |
| Change billing policy | ❌ | ❌ | ✅ (audited, M3A) |
| **View** financial picture | ✅ prices (D2) | ✅ | ✅ |

### 5.2 Audit trail
Every money-affecting action writes an `AuditLog` via `recordAudit`: `service_added`, `service_finalized`, `service_reversed`, `payment_collected`, `discount_applied`, `credit_note_issued`, `refund_issued`, `billing_policy_changed` (exists). Reversal/discount reasons in `detail`.

### 5.3 State machines touched
- `ServiceEvent`: unchanged (M3A); reversal drives credit notes.
- `Invoice`: `draft → issued → paid → void` (existing). Checkout drives `issued`/`paid`. **Void** = full cancellation only; credit notes (partial) do **not** void.
- **Appointment** status machine: unchanged.

---

## 6. Multi-invoice behavior
Engine supports N invoices/visit (1:N relaxation, M3A). **Default UX: one visit = one invoice**, the only thing reception sees. Multi-invoice stays **engine-ready but UI-hidden** until a clear business need appears (D7).

---

## 7. Edge cases (designed, not discovered later)

| Case | Behavior |
|---|---|
| **Cancelled visit** | No settlement; prepaid consultation fee → refundable Credit Note (per policy); draft events removed. |
| **Unpaid balance at close** | Visit may close with outstanding > 0; balance persists on the invoice, visible in patient Bills. No forced collection. |
| **Partial payment** | Multiple `Payment` rows; outstanding re-derived; checkout resumable. |
| **Reprint** | Any document reprintable from visit history — same frozen snapshot, stamped "REPRINT" + timestamp. |
| **Reversed event after payment** | `reverseServiceEvent` (reason) → Credit Note; original invoice/receipt immutable. |
| **Ad-hoc service** | Billed normally, flagged `needs_catalog_review`; admin reconciles later; no billing block. |
| **Policy changed mid-visit** | Policy in force = the one **at settlement time**; change is audited, applies forward, no retroactive re-gating. |
| **Zero-charge visit** | Allowed (free follow-up); invoice total ₹0, no checkout required, **still produces a Visit Summary**. |

---

## 8. Document Engine (platform capability) — with the **Visit Summary in M3B**

**Reframe:** outputs are a *managed platform capability*, not one-off print buttons. But the full engine (many doc types, versioning, branding, channels) is larger than one milestone. **Split by what a completed visit immediately needs.**

**A completed visit produces three documents — all three ship in M3B**, because all three come from the same Visit:

| Document | Pillar | Ships in |
|---|---|---|
| 📄 **Basic Visit Summary** | Clinical | **M3B** |
| 🧾 **Invoice** | Financial | **M3B** (print route exists) |
| 💰 **Payment Receipt** | Financial | **M3B** (new) |

**Basic Visit Summary (M3B)** — generated automatically on Complete Visit, deliberately simple: clinic, doctor, date, **diagnosis, medicines (prescription), procedures/services, investigations, follow-up**. It reuses existing clinical data (the visit-summary print route already exists at `/print/visit-summary/[id]`) — M3B makes it a first-class, auto-produced member of the document set, not just a print page. This ensures M3B ends with a **clinical** output, not only financial ones: when a patient asks "can I get today's report?", Auriva already has it.

**Advanced clinical documents → M4 (Clinical Documentation Platform):** Prescription (as a standalone branded document), Medical/Sick-Leave/Fitness Certificates, Referral Letter, Lab Request, Radiology Request, Procedure Notes — plus templates, versioning, richer branding.

**Document Engine foundation (M3B):** a `Document` / `DocumentSet` abstraction — every completed visit owns a document set; each document has a type, an immutable snapshot, a version, and clinic branding (logo/header/footer/signature). M3B implements the foundation + the three visit documents; M4 expands from it. Each document supports **Print, Download PDF, Reprint from history, Versioning** (where clinically appropriate), **Branding**. Email/WhatsApp/Share → §9.

### 8.1 Patient Timeline (new, but grounded)
Every visit **automatically contributes** its document set to the patient's timeline (which already exists — `timeline-service.ts`):
```
Visit → Summary → Prescription → Invoice → Receipt   (one timeline entry, expandable)
```
M3B's job is to ensure the visit's documents attach to the timeline entry so the future patient app surfaces a coherent visit history. No new timeline engine — we feed the one we have.

### 8.2 PDF & rendering approach (D8)
Print today is **browser-native HTML routes**. **Keep HTML/CSS as the single source of truth**; produce PDFs via browser print-to-PDF (zero new infra, on-palette, shippable now). A **server-side renderer** is warranted only when unattended generation for Email/WhatsApp attachments is needed — itself gated on §9. Decide the *trigger*, not new tech, now.

---

## 9. ⚠️ Communication channels — deferred behind a Communication Platform (D10)

Per the OPS-001 correction (APS-032), Auriva's **notification / communication platform does not exist** — only event *publishing* + audit hooks are real. There is **no built channel** to send WhatsApp/email/SMS.

- **In scope (M3B/M4):** Print + Download PDF + reprint from history — self-contained, no new infra.
- **Deferred behind a dedicated Communication Platform:** "Share via WhatsApp," "Email receipt," SMS links — these need provider integration, templating, consent/opt-in, delivery tracking, cost controls: a **platform build, not a button.**
- **Seam only:** the Document Engine declares a `DeliveryChannel` interface (`print`, `pdf` implemented; `email`, `whatsapp`, `sms` declared, not implemented), so the comms platform plugs in later — same "design the seam, defer the wiring" pattern as M3A's `BillingPolicyChanged`.

---

## 10. Patient-side (mobile-first) behavior
Patient document access aligns with the existing mobile-first phone app (Records/Bills/Lab + timeline tabs): the patient can **view/download** Visit Summary, Invoice, and Receipt (PDF) for a visit. No new patient paradigm; no multi-clinic. WhatsApp/Email delivery = §9 (deferred).

---

## 11. Checkpoint phasing (revised order, PO-directed)

The visit must be **completable end-to-end — including its essential documents — before advanced corrections**. Each checkpoint: plan → approve → build → STOP.

| Checkpoint | Scope |
|---|---|
| **B1 — Doctor Service Capture** | Clinical `ServiceEvent` drafts in the workbench; Complete Visit finalizes + settles |
| **B2 — Checkout Workspace** | Reception's auto-assembled charges + financial adds; payment (cash/UPI/card/split/partial) |
| **B3 — Visit Documents + Document Engine foundation** | `DocumentSet`; **Visit Summary + Invoice + Receipt** (Print + PDF, branding, reprint); feed Patient Timeline |
| **B4 — Billing Policy activation** | Prepaid/postpaid/hybrid sequence gating (soft/hard per D3) |
| **B5 — Financial Corrections** | Discounts / credit notes / refunds; paid-invoice immutability |

*(Documents fold into B3 — no separate B6. A patient can complete and walk out with all three documents after B3, before corrections exist.)*

**M4 — Clinical Documentation Platform:** advanced clinical documents (prescription-as-document, certificates, referrals, lab/radiology requests), templates, versioning, richer branding — built on B3's foundation. Communication channels → Communication Platform initiative.

---

## 12. Product-Office decisions — **RESOLVED**

| # | Decision | Ruling |
|---|---|---|
| **D1** | Doctor price editing | Quantity only; catalog price **locked**; ad-hoc service may define a price. |
| **D2** | Doctor sees amounts? | **Yes** (transparency); cannot change collected amounts. |
| **D3** | Prepaid gate | **Soft by default**, configurable **hard** gate per clinic. |
| **D4** | Discount authority | Reception within a **clinic-defined limit**; above → **owner approval**. |
| **D5** | Credit-note authority | **Owner/manager** authorization required. |
| **D6** | Refund authority | **Owner approval always**, fully audited. |
| **D7** | Multi-invoice | **Backend-ready, UI-hidden** until a clear business need. |
| **D8** | PDF rendering | **Browser print/PDF now**; defer server-side until automated delivery is required. |
| **D9** | Document Engine split | **Approved — with Basic Visit Summary moved into M3B.** |
| **D10** | Comms channels | **Deferred** to a future Communication Platform. |

---

## 13. Definition of Done (M3B) & out-of-scope

**Done when:** a real Visit flows end-to-end in the UI — doctor captures services → **Complete Visit** → reception's Checkout Workspace shows auto-assembled charges → checkout collects (incl. split/partial) → the visit produces **all three documents (Visit Summary, Invoice, Receipt)**, printable + PDF, on the timeline → corrections work → billing policy gates the sequence — all on the M3A engine, all audited, zero invented financial logic, full test coverage + per-role browser QA.

**The three documents every completed visit produces (the completeness bar):**
1. 📄 **Visit Summary** — clinical record for the patient
2. 🧾 **Invoice** — financial charges
3. 💰 **Payment Receipt** — proof of payment

**Out of scope (M3B):** advanced clinical documents (M4); WhatsApp/Email/SMS (Communication Platform); tax/GST activation (post-3B); server-side PDF (unless D8 changes); insurance/TPA; accounting/ledger export (red-flag — not Auriva).

---

## 14. Next step

BRD approved. The next deliverable is the **M3B Engineering Plan** — checkpointed **B1–B5** with acceptance criteria per the 5-gate process — **then** implementation begins, one checkpoint at a time. No code until the plan is approved.
