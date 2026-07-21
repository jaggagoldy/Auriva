# Milestone 3B · Checkpoint B3 — Document Engine Foundation
## Engineering Readiness & UX Specification

> **Status:** SPEC for Product-Office approval. **No B3 code until approved.**
> **Mission (PO):** not a printing feature — the **foundation of Auriva's Clinical Document Platform.** Visit Summary / Invoice / Receipt are the first **document types**, not three reports.
> **Build in B3:** the Document foundation + **Visit Summary · Invoice · Receipt**, with View / Print / Download-PDF, reprint, clinic branding, and Patient Timeline attachment.
> **Architected for (not built):** Prescription, Medical Certificate, Referral, Lab/Radiology Request, Procedure Notes (Clinical Documentation Platform); Share/WhatsApp/Email (Communication Platform); server-side PDF.

---

## 0. New Principle 7 — a document is a permanent clinical artifact
Not "something to print." Every document should *eventually* support **View · Print · Download · Share · Timeline attachment · Audit history**. **B3 implements View · Print · Download-PDF · Timeline · Audit**; the architecture must *allow* Share (and more types) without redesign. This principle drives the persisted-snapshot model below.

---

## 1. Product

### 1a. User journey
```
Checkout Completion (B2)  →  "Documents" becomes real (was a B3 stub)
   ✓ Invoice        [View] [Print] [PDF]
   ✓ Receipt        [View] [Print] [PDF]
   ✓ Visit Summary  [View] [Print] [PDF]
        │
        ▼
Patient Timeline (visit entry) → lists the visit's Document Set → reopen any document later (reprint identical)
```
- **Reception** (checkout) and **Doctor/Owner** can view/print a visit's documents.
- **Patient** (mobile) can view/download their own Invoice/Receipt/Visit Summary from Records/Timeline (read-only).

### 1b. Document lifecycle
```
generate → issued → (regenerate → new version; prior = superseded) → [void with the invoice, if applicable]
```
- Generated at **checkout completion** (Invoice + Receipt + Visit Summary) and **on demand** (reprint = render the existing snapshot; regenerate only if the source materially changed).
- **Immutable snapshot** per version — a reprint is byte-identical; corrections create a new version (never edit a past artifact). Mirrors the invoice `items_json` philosophy.

### 1c. Ownership & permissions
| Document | Owned by (pillar) | Generate/Regenerate | View/Print | Patient view |
|---|---|---|---|---|
| Invoice | Financial | reception/owner | reception, doctor, owner | ✅ own |
| Receipt | Financial | reception/owner (on payment) | same | ✅ own |
| Visit Summary | Clinical | doctor/owner (clinical authority) | same | ✅ own |
- Reuses the existing `/print` authorization (reception ∪ doctor ∪ admin); patient sees only their own via the patient session.
- **Principle 6 stands:** reception can view/print the Visit Summary but never edit its clinical content.

---

## 2. UX Specification

### 2a. Document Viewer (screen) — shared shell
```
┌───────────────────────────── Document Viewer ─────────────────────────────┐
│  [Clinic logo]  Auriva Family Clinic            Invoice · INV-2026-0007     │
│  123 MG Road, Bengaluru · +91 …                 v1 · 21 Jul 2026            │
│  ──────────────────────────────────────────────────────────────────────    │
│  Patient: John Doe · Token 12 · Dr Ananya Iyer                             │
│                                                                            │
│  << document-type body (Invoice lines / Receipt payments / Summary) >>     │
│                                                                            │
│  ──────────────────────────────────────────────────────────────────────    │
│  [footer: clinic reg / thank-you / signature slot]                         │
├────────────────────────────────────────────────────────────────────────────┤
│  Actions:  [ Print ]   [ Download PDF ]   [ Close ]        (Share → future) │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2b. Print layout (A4/thermal-friendly)
Reuse the existing bare `/print` route tree (max-width, `print:` CSS, no shell chrome). Each type renders the **same snapshot** as the screen viewer through a print stylesheet. Header/footer = shared **DocumentBranding** (logo, clinic name/address/phone from `Clinic`, signature slot). Page-break-safe line tables.

### 2c. Mobile (patient) layout
Single-column, full-width document card in the patient app (Records/Timeline). **Download PDF** via the browser; Print available on desktop. No new patient paradigm.

### 2d. Timeline presentation
A visit's timeline entry gains a **Documents** affordance listing the Document Set (Invoice · Receipt · Visit Summary) with view/download — reusing `getPatientTimeline`. New `TimelineKind: "document"` or documents nested under the visit entry (decision D-B3-4).

### 2e. Print vs screen
One renderer per type; screen = interactive viewer chrome, print = `@media print` bare. **No divergence** — both consume `content_json`, so reprint always matches the on-screen document.

---

## 3. Backend Readiness

### 3a. Document model (new)
```
Document
  id, clinic_id, patient_id, appointment_id?, invoice_id?
  type          "visit_summary" | "invoice" | "receipt" | (future types)
  number        human id per type (e.g. RCPT-2026-0003) — invoice reuses invoice_number
  version       Int  (regenerate → version+1)
  status        "issued" | "superseded" | "void"
  content_json  immutable rendered snapshot (the single render input)
  generated_at, generated_by_user_id
  @@index([appointment_id]) · @@index([clinic_id, type])
```
- **DocumentSet** = the Documents for an appointment (a query, not a table).
- Additive migration; no change to existing invoice/appointment flows.

### 3b. Metadata & versioning
- Snapshot frozen at generation; **regenerate** supersedes the prior version (kept for audit), never mutates it.
- Reprint = read latest `issued` snapshot. Corrections (B5 credit notes etc.) create new documents/versions.

### 3c. Generation pipeline
`document-service.generateDocument(type, { appointmentId | invoiceId }, actor)`:
1. Assemble `content_json` from the source (invoice → lines + `items_json`; receipt → payments; visit summary → diagnosis/prescription/services/investigations/follow-up).
2. Create the `Document` (version+1, supersede prior of same type for the appointment).
3. Attach to the timeline; `recordAudit("document_generated")`.
- Called at **checkout completion** (B2 hook) for the three, and on demand.

### 3d. Template architecture
- One **renderer per type** (`InvoiceDocument`, `ReceiptDocument`, `VisitSummaryDocument`) consuming `content_json` + `DocumentBranding`. Screen + print share the component; only the wrapper differs.
- A **type registry** (`DOCUMENT_TYPES`) so a new type = a new renderer + a content assembler — **no engine change** (the extensibility the PO wants).

### 3e. Timeline integration
Documents surface on the patient timeline via the existing service; the visit entry exposes its Document Set.

### 3f. APIs
`/api/clinic/documents` — GET `?appointment_id=` (set) / `?id=` (one) · POST `{action:"generate", type, …}`. Patient read via the patient-scoped records endpoint. Reuse `/print/[type]/[id]` for the bare print pages (now Document-backed).

---

## 4. Frontend Readiness
- **Shared Document Viewer** (`components/shared/documents/document-viewer.tsx`) — chrome + actions (Print, Download-PDF, Close; Share stub).
- **Shared Print components** — `DocumentBranding` (header/footer/logo/signature), `DocumentShell`, per-type bodies; the `/print/*` routes render these.
- **Shared Timeline components** — a `DocumentSet` chip/list reused in staff, doctor, and patient timelines.
- **Download/Print actions** — browser print-to-PDF (D8); `window.print()` on the bare route; a "Download PDF" affordance using the same route.
- **Responsive** — viewer + print scale from A4 desktop to mobile single-column; `print:` CSS isolates the artifact.

---

## 5. Future-proofing map (architecture guidance, not build)
| Future | Plugs in as |
|---|---|
| Prescription / Certificate / Referral / Lab / Radiology / Procedure Notes | new `type` + renderer + content assembler in the registry — **no engine change** |
| Share (WhatsApp/Email) | a `DeliveryChannel` on the viewer (stub now) → Communication Platform later |
| Server-side PDF | swap the PDF action's implementation; snapshot already immutable |
| e-sign / signature | the footer signature slot + a `signed_by` metadata field |
| GST/tax invoice | a Document `content_json` field + branding — no new table |

---

## 6. Scope — IN / OUT
**IN (B3):** Document model + generation pipeline + type registry · **Visit Summary · Invoice · Receipt** renderers (screen + print) · View / Print / Download-PDF · reprint (immutable snapshot + versioning) · clinic branding · Timeline attachment · audit · wire the B2 Completion "Documents" slot to real documents.
**OUT:** other document types (Clinical Documentation Platform) · Share/WhatsApp/Email (Communication Platform) · server-side PDF · e-sign · billing-policy/corrections (B4/B5).

---

## 7. Decisions to confirm before build
| # | Decision | Recommendation |
|---|---|---|
| **D-B3-1** | Persist an immutable `content_json` snapshot per document (vs render live + metadata only)? | **Persist** — required by Principle 7 (permanent artifact, versioning, identical reprint). |
| **D-B3-2** | Generate the three at checkout completion, on-demand, or both? | **Both** — auto at completion, regenerate/reprint on demand. |
| **D-B3-3** | Reuse the existing `/print/*` routes as Document renderers (vs new routes)? | **Reuse** (Document-backed) — no new route tree. |
| **D-B3-4** | Timeline: new `TimelineKind:"document"` vs documents nested under the visit entry? | **Nested under the visit entry** (a visit owns its Document Set). |
| **D-B3-5** | PDF: browser print-to-PDF now? | **Yes** (D8 stands); server renderer only when Share needs it. |

---

## 8. Deliverables & gate
On approval I build B3 (Document foundation + the three types, View/Print/PDF, reprint, branding, timeline), then: **Engineering Completion Report · Browser QA (staff/doctor/patient) · Regression Matrix · UX Consistency Review · Architecture Update · Decision Log · Technical Debt Register**, and **STOP**. No auto-continue; no scope beyond B3.

**Awaiting approval of this spec (and D-B3-1…5) to begin implementation.**
