# C5 — Communication Platform — Engineering Readiness

> **Process v3.0 · Step 1.** Concise readiness for Product-Office approval. **No code until approved.**
> **Customer Promise:** *"Reach every patient on the channel they actually use — automatically."* · Phase 3 · Milestone C5 · ~2–3 sprints.
> **Operational question:** *"What did we tell the patient — and did it reach them?"*
> **Canonical Business Object:** `CommunicationMessage`

## Why now?
- **Why needed now:** C1–C4 built the patient's *record* (plans, procedures, timeline, prescriptions) — but the platform still can't reliably **reach the patient** with it. Today's pieces are **fragmented**: in-app `Notification` rows (one channel), a separate SMS abstraction (`sendMessage`), a separate appointment-reminder sweep. There is **no single record of "what we sent this patient and whether it arrived."** C5 unifies them.
- **Why before the next phase:** it **closes the loop** the whole roadmap has been building toward — *Consultation → Plan → Procedure → Timeline → Prescription → Document → **Communication → Patient***. Every prior milestone produces an artifact; C5 is how it reaches the person.
- **What capability it unlocks:** **no-show reduction** (first-class reminders + confirmations) and **document delivery** (send the patient their prescription/invoice/visit-summary), with a full **auditable communication history**.
- **What future milestone depends on it:** Phase-4 engagement analytics ("delivery/read rates", "reminder → attendance") and any future channel (WhatsApp/Email) plug into the same object.

## Scope (IN)
1. **`CommunicationMessage` — the canonical outbound record.** One first-class row per outbound communication, **across every channel**, carrying: patient, channel, kind/template, the **artifact deep-link** (document / appointment), rendered body, and **delivery status** (queued → sent → delivered/failed). This is the unifying object the platform lacks today.
2. **`communication-service` — one orchestrator.** `sendCommunication(...)` records the message, dispatches through the right channel (reusing the existing in-app `notification-service` and the existing `sms` library — **not** re-implementing them), records status, and **emits a Timeline event**.
3. **Document delivery (Document → Patient).** "Send to patient" for a **Prescription / Invoice / Visit Summary** → a `CommunicationMessage` with the document deep-link (+ the patient's in-app inbox entry). Completes the C1–C4 chain.
4. **First-class reminders & confirmations.** Fold the existing appointment-reminder sweep and booking confirmations into `CommunicationMessage` (no-show metric), so reminders are logged, timeline-visible, and auditable like everything else.
5. **Channel abstraction.** `in_app` + `sms` are **real today** (reused). `whatsapp` + `email` are **declared adapters, integration-gated** (config/flag; a `log`/no-op dev channel) — the abstraction ships; real external transport is a deferred integration.
6. **Timeline integration (C3's reserved slot).** Communications appear on the Clinical Timeline as their own kind ("Prescription shared", "Reminder sent"), deep-linking to the artifact — exactly the Communication category C3 reserved.

## Out of scope (deferred / guardrail)
- **Marketing / campaigns / bulk blasts / segmented promos** — **RED FLAG (generic CRM).** C5 is **transactional, care-anchored** communication (this patient · this artifact · this visit), never marketing. Explicitly excluded.
- **Real WhatsApp / Email transport** — external-provider integrations; ship the abstraction + `log` dev channel now, wire real providers behind config later (same pattern the SMS lib already uses).
- **Two-way / inbound messaging, chat, threads** — post-MVP.
- **Patient communication *preferences* centre / opt-out management** — recorded as a **near-term follow-up** (a real requirement, but its own slice); C5 respects the existing `Contact` verification model and does not build a preferences engine.
- **Provider delivery receipts / read tracking** — the status model *reserves* `delivered`, but true carrier receipts are a later integration.

## Architecture
**Enrich, don't fork — for a fifth milestone.** C5 does **not** build a new notification system; it **wraps the ones that exist** under one canonical object. `CommunicationMessage` is the outbound *record*; each **channel is a delivery mechanism** — the `in_app` channel writes a `Notification` (the patient's existing inbox), the `sms` channel calls the existing `sms` library. So there is **one outbound truth**, not parallel inboxes. Mirrors the platform's established split: a **mutable/event source** (the send) produces an **immutable record** (the message log) and a **Timeline event** (the visible history) — the same discipline as Invoice→Document and Prescription→Document.

## Integrates With
In-app Notifications (`notification-service`) · SMS library (`src/lib/sms`) · Appointment Reminders (`appointment-reminder-service`) · **Documents (B3/C4)** — the artifacts delivered · **Clinical Timeline (C3)** — communications as events (the reserved Communication category) · **Patient App** — the notification centre · Event Platform (OPS-001C) — sends are event-anchored/idempotent · Contact/verification model (patient channels).

## Platform Contracts Introduced
| Contract | Shape / rule | Stability |
|----------|--------------|-----------|
| **`CommunicationMessage`** | `{ id, patient_id, clinic_id, channel, kind, artifact_link?, body, status, sent_at?, source_event_id? }` — the canonical outbound record for **every** channel | Canonical business object |
| **`CommunicationChannel`** | `in_app \| sms \| whatsapp \| email` — abstraction; `in_app`+`sms` real, others integration-gated | Stable enum |
| **`CommunicationStatus`** | `queued \| sent \| delivered \| failed` — one lifecycle for all channels | Stable enum |
| **`sendCommunication()`** | The single entry point: record → dispatch (reuse notification/sms) → status → Timeline event; idempotent via `source_event_id` | Stable function |
| **`communication` Timeline entry** | Extends the C3 `TimelineEntry` + deep-link contracts (Communication category) | Extends existing |

## Canonical Business Object
**`CommunicationMessage`** — a single outbound communication and its delivery status. Joins the platform vocabulary: `TreatmentPlan` (C1) · `TreatmentPlanSession` (C2) · `TimelineEntry` (C3) · `PrescriptionMedicine` (C4) · **`CommunicationMessage` (C5)**.

## Business Rules Preserved (governance)
- Communication is **transactional and care-anchored**, never marketing/bulk (no generic-CRM drift).
- **Every send is recorded** as a `CommunicationMessage` — including failures — so history is always auditable.
- The in-app **`Notification` remains the patient's inbox**; `CommunicationMessage` is the cross-channel record. **No parallel inbox** is created — `in_app` sends write a `Notification`.
- **Real external transport is integration-gated** (config/flag) with a `log` dev channel; a missing provider never blocks the clinical flow.
- **Patient channels reuse the existing `Contact` + verification model** — no new identity/contact store.
- Communications **appear on the Timeline** (C3 taxonomy), deep-linking to their artifact — never a dead-end.
- Sends are **idempotent** (event-anchored via `source_event_id`), consistent with the Event Platform's at-least-once delivery.

## Database
**+1 table — `CommunicationMessage`** (the canonical log; PO-named object). This is the milestone's single schema addition and is justified: no existing store captures "an outbound message across channels with delivery status + artifact link." The in-app `Notification` model is unchanged (it becomes the `in_app` channel's delivery projection). Additive migration, backward compatible.

## Backend
- `domain/communication.ts` (new): `CommunicationChannel`, `CommunicationStatus`, `CommunicationKind`, and body/templating helpers (patient-language, reusing C4's tone).
- `services/communication-service.ts` (new): `sendCommunication()` orchestrator (record → dispatch via existing channels → status → Timeline event); `getPatientCommunications()`.
- Reuse (not replace): `notification-service` (in_app), `src/lib/sms` (sms), `appointment-reminder-service` (folded into first-class messages).
- `timeline-service`: add the `communication` kind (from `CommunicationMessage`), deep-linking to the artifact — the C3-reserved slot.

## Frontend
- **"Send to patient"** affordance on a Document (Prescription/Invoice/Visit Summary) in staff/doctor surfaces → `sendCommunication`.
- **Patient app**: the existing **notification centre** renders delivered communications (reused, not rebuilt); the document deep-link opens the artifact.
- **Timeline**: communication entries visible across `/doctor`, `/staff`, patient — reusing the C3 component.

## Risks
- **Scope creep toward CRM/marketing** — top risk. Mitigation: the transactional/care-anchored guardrail is explicit; no segments, no campaigns, no bulk.
- **Duplicate notification systems** — mitigation: `CommunicationMessage` *wraps* the existing notification/SMS pieces; `in_app` = a `Notification` row, not a second inbox.
- **External transport reliability** (SMS/WhatsApp/Email) — mitigation: pluggable providers (already the SMS pattern) + `log` dev channel + recorded `failed` status; delivery never blocks the clinical workflow.
- **Patient consent / channel correctness** — mitigation: reuse the verified `Contact`; preferences centre is a recorded follow-up.

## Demo Story
> A doctor completes a visit and issues **Prescription RX-2026-0042**. They tap **Send to patient** → a `CommunicationMessage` is recorded, the patient gets it in their **notification centre** with a one-tap link to the prescription, and the **Timeline** shows *"Prescription shared · SMS · delivered"*. The next morning, the **appointment-reminder** goes out as a first-class message — logged, timeline-visible, and (Phase-4) measurable against attendance. Every outbound touch, one auditable history.

---
**STOP — awaiting Product Office approval of this readiness before implementation.** On approval I build the entire C5 milestone, then deliver the full Process v3.0 package (Completion Report · Demo · QA · Known Limitations · "What's New in C5" · Platform Contracts Introduced · Canonical Business Object · **Business Rules Preserved** · Milestone Summary Card · Release Dashboard update) and stop for review.
