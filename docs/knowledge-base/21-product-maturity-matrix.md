# 21 — Product Maturity Matrix

> **The one question this answers:** *"What is actually production-ready, and what still needs work?"*
> Companion to [06 Feature Catalog](06-feature-catalog.md) (what exists) and [18 Deferred Features](18-deferred-features.md) (what doesn't).

## Maturity levels (definitions)

| Level | Meaning |
|---|---|
| **MVP** | Core happy-path works end-to-end with real data; usable in a demo. |
| **Beta** | Handles real users + edge cases; empty/error/loading states; safe to pilot with a friendly clinic. |
| **Production** | Hardened, secure, audit-logged, scales for a single busy clinic; RC-grade. |
| **Enterprise** | Multi-instance scale, advanced admin/governance, integrations, SLAs, multi-clinic depth. |

Legend: ✅ met · 🟡 partial · ⏳ planned/not started · — not applicable

## The matrix

| Module | MVP | Beta | Production | Enterprise | Notes |
|---|:--:|:--:|:--:|:--:|---|
| **Identity & Auth** (staff password, patient OTP) | ✅ | ✅ | 🟡 | ⏳ | Credentialed staff login (scrypt, rate-limited) + real single-use patient OTP. **Prod gap:** OTP delivery is a dev-echo — needs a live SMS provider before external users. |
| **Appointments / Booking** | ✅ | ✅ | ✅ | 🟡 | Full lifecycle via a real state machine; every mutation writes an event. Enterprise: recurring/advanced planner deferred. |
| **Reception Queue Board** | ✅ | ✅ | ✅ | 🟡 | 3-lane board, wait-aging, doctor strip, one-action-per-stage. Enterprise: capacity thresholds / auto-balancing deferred. |
| **Walk-in registration** | ✅ | ✅ | ✅ | — | Under-20-second minimal capture. |
| **Doctor Consultation / Workbench** | ✅ | ✅ | ✅ | 🟡 | Queue · consult · context; progress stepper; read-only clinical safety chips. Enterprise: clinical-intelligence (AI protocol) deferred. |
| **Prescription** | ✅ | ✅ | ✅ | 🟡 | Real Rx model, templates, print. Enterprise: drug-interaction checking deferred. |
| **Lab Orders** | ✅ | ✅ | ✅ | 🟡 | Order → org worklist → result back to consult + patient vault. Enterprise: external lab (LIS) integration ⏳. |
| **Billing / Desk / Payments** | ✅ | ✅ | ✅ | 🟡 | Invoice drafts on completion; UPI/Cash/Card collect → receipt. Enterprise: online payment gateway ⏳; insurance ⏳. |
| **Patient App (portal)** | ✅ | ✅ | 🟡 | ⏳ | One centered phone shell; Home/Book/Records/Family/You. **Prod gap:** OTP delivery + push/SMS notifications. |
| **Records / Clinical Timeline** | ✅ | ✅ | ✅ | 🟡 | Visit timeline, Rx, bills, health vault. Enterprise: structured clinical data model (currently free-text on appointment) ⏳. |
| **Family Sharing** | ✅ | ✅ | ✅ | 🟡 | One account → many Healthcare Profiles; profile switcher. Enterprise: granular per-member consent ⏳. |
| **Team / RBAC** | ✅ | ✅ | ✅ | 🟡 | 6 roles, capability model, invite/suspend/archive, last-owner block. Enterprise: per-clinic capability grants ⏳ (TD-S2-2). |
| **Organization / Multi-clinic** | ✅ | ✅ | 🟡 | 🟡 | Real Organization entity, multi-clinic, departments. **Gap:** multi-clinic admin depth + N+1 command-center query (TD-H5-1). |
| **Command Center / Reports** | ✅ | 🟡 | 🟡 | ⏳ | Operational overview + attention list exist; deeper reporting/KPIs are thin. |
| **Analytics** | 🟡 | ⏳ | ⏳ | ⏳ | Basic activity/counts only; no real analytics engine or dashboards yet. |
| **Notifications** | 🟡 | ⏳ | ⏳ | ⏳ | **In-app only.** No SMS/email/push delivery. The user-facing notification/announcement/preferences platform does **not** exist (only event publishing does). |
| **Events Platform (OPS-001C)** | ✅ | ✅ | ✅ | 🟡 | Publish/retry/DLQ/replay + audit hooks. Event *publishing* only — not user notifications. |
| **Audit Logging** | ✅ | ✅ | ✅ | 🟡 | Actions attributed + logged. Enterprise: exportable compliance reports ⏳. |
| **Availability / Calendar** | ✅ | ✅ | 🟡 | ⏳ | Doctor availability + reception day-grid calendar. Enterprise: drag-drop/recurring/room scheduling ⏳. |

## Reading the matrix — the headline

```
PRODUCTION-READY (single busy clinic):
  Appointments · Reception Board · Walk-in · Consultation · Prescription ·
  Lab · Billing/Desk · Records · Family · Team/RBAC · Events · Audit

PILOT-READY, needs one infra step (SMS/OTP delivery) to reach production:
  Identity/Auth · Patient App

THIN / EARLY (works but shallow):
  Command Center/Reports · Multi-clinic admin · Availability calendar

NOT A PRODUCT YET (deliberately):
  Analytics · Notifications delivery
```

**Bottom line:** the **encounter-to-cash core is production-grade** for a single clinic. The gating items for an external pilot are **operational** (live SMS/OTP provider, TLS/proxy, persistent rate limiting), not missing features — see [15 Operations](15-operations.md) and [25 Technical Debt Register](25-technical-debt-register.md).
