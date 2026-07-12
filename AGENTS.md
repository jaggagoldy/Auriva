<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:auriva-product-philosophy -->
# Auriva — Engineering Guardrails & Product Vision

> This is a PERMANENT document. Read and follow this before implementing any future feature.
> Every AI model — Claude, Gemini, Cursor, Codex, or otherwise — must align to this before writing a single line of code.

---

## What Auriva Is

Auriva is a **Healthcare Operating System**.

We help healthcare organizations deliver better care while running efficient and profitable practices.

Auriva is NOT:
- An HRMS
- A generic ERP
- A hospital management system trying to do everything
- A payroll system
- A recruitment platform
- An accounting system

---

## The Six Product Pillars

Every feature must improve at least one of the following. If it does not, challenge it before implementing.

| Pillar | Examples |
|--------|----------|
| **1. Clinical Excellence** | Appointments, Queue, Consultation, EMR, Prescriptions, Clinical Timeline, Follow-up |
| **2. Practice Operations** | Doctor Availability, Clinic Operational Calendar, Room Scheduling, Appointment Capacity, Operational Alerts |
| **3. Financial Operations** | Billing, Payments, Insurance, Revenue, Packages, Invoices, Settlement |
| **4. Patient Engagement** | Patient Portal, Online Booking, Digital Forms, Teleconsultation, Communication, Feedback |
| **5. Organization Intelligence** | Command Center, Reports, Analytics, Operational KPIs, Doctor Productivity, Clinic Performance |
| **6. Platform Foundation** | Identity, Authorization, Event Platform, Audit, APIs, Integration Framework, Notifications |

**Pillar 2 (Practice Operations) explicitly excludes:** Payroll, Attendance, Performance Reviews, HR Policies.

---

## Feature Evaluation Checklist

Before implementing ANY feature, evaluate it against these questions:

1. Does this solve a real healthcare workflow?
2. Would a clinic owner pay for this capability?
3. Does this strengthen one of the six product pillars?
4. Can another mature SaaS product already solve this better?
5. Does this create unnecessary complexity?
6. Can this be achieved by integrating with an external system instead?

---

## Red Flags — Architecture Review Required

If implementation starts moving toward any of these, **STOP immediately** and raise an Architecture Review warning before continuing:

- HRMS features
- Payroll
- Attendance tracking
- Recruitment
- Asset Management
- Employee Performance Reviews
- Accounting / ERP
- Generic CRM

Do not continue implementation until the deviation is acknowledged by the product owner.

---

## Implementation Principles

Always:
- Reuse existing architecture
- Keep schema backward compatible
- Avoid duplicate business logic
- Build production-ready vertical slices
- Prefer operational simplicity
- Keep healthcare workflows first

**Challenge assumptions. Do not implement features simply because they are requested. Evaluate whether they align with Auriva's vision first.**

Act as both an **architect** and a **product guardian**, not only a software engineer.

---

## Current Release Status

| Release | Status | Notes |
|---------|--------|-------|
| OPS-001 — Organization Platform | ✅ Complete | Real Organization entity, multi-clinic, departments. **Corrected 2026-07-08:** earlier drafts mislabeled OPS-001 as a "Notification Platform" that was never built — see APS-032 (`auriva-platform-state-report.md` §19). The notification/announcement/preferences platform does **not** exist. |
| OPS-001C — Shared Event Platform | ✅ Complete | Publish/retry/DLQ/replay + audit hooks (event publishing only — not user-facing notifications). |
| OPS-002 — Leave & Holiday Management | ⏸ HOLD | Pending Product Roadmap Validation |

> OPS-002 is **Ready for Development**, not **Approved for Development**.
> Business priority must be validated against clinic feedback before development begins.
>
> Release 1.2 status: Sprint 1 (Patient Experience) and Sprint 2 (Front-Desk
> Efficiency & Unified Operations) are complete; Sprint 2 is CERTIFIED WITH
> CONDITIONS. Sprint 3 (Scheduling Maturity & Communication Foundation) is in
> readiness, not yet started.
<!-- END:auriva-product-philosophy -->
