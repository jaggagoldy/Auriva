# EEP-043 — Engineering Execution Plan
### BRD-043 Team Management & Solo→Professional Tier Evolution

**Status:** Engineering Planning — no implementation started. **Master document** for BRD-043 engineering; every other doc in this set (Epics, Stories, Sprints, Readiness Matrices, Demo/Verification Guides, Release Roadmap) is subordinate to this one.

**Inputs this plan is built from** (all frozen, none revisited here):
- BRD-043 v1.0 — business scope, roles, editions, business rules
- Technical Feasibility Report — architecture assessment, ADR groundwork
- Final Product Office review — dashboard philosophy, archive rule, role naming, badge colors, IA grouping
- Approved HTML prototype `design/mockups/brd-043-team-management.html` v1.1 — **the design contract**: React must reproduce it faithfully; any layout/workflow/nav/interaction deviation requires Product Office approval before implementation, not after
- [Governance Addendum](./brd-043-governance-addendum.md) — feature flags, migration validation protocol, ADR-005 (no API versioning), performance budget, observability plan

---

## 1. Objectives

1. Ship Team Management (invite/suspend/archive, Active→Suspended→Archived lifecycle) inside the existing `/clinic` solo application — additively, with zero disruption to the shipped P1–P6 solo-clinic surface (Today, Calendar, Consultation, Practice Setup, Diagnostics, Templates).
2. Ship the adaptive, role-driven Dashboard (Practice Owner / Managing Doctor / Doctor / Receptionist) as one continuous application — no workspace switching, no separate route trees per role.
3. Ship the Solo→Professional upgrade path (administrative plan management) with correct seat enforcement.
4. Do all of the above as a **design-contract-faithful** reproduction of the approved prototype — this plan does not re-litigate any UX decision.

## 2. Scope

**In scope:** everything named in BRD-043 §6 and shown in the approved prototype — Team Management, Invitations (WhatsApp + copy-link), Owner/Doctor/Receptionist roles, Solo/Professional editions, adaptive navigation, membership lifecycle, clinic-level data ownership, audit accountability, Professional upgrade workflow (request-side + admin-side toggle).

**Out of scope (do not build, do not ask Product Office to reconsider):** multi-clinic, branch management, cross-clinic memberships, Departments (schema stays dormant), custom permissions/RBAC editor, Nurse/Lab Technician/Accountant roles, asset/room/equipment management, self-service payment/recurring billing, email invitation infrastructure, SMS invitation infrastructure, Enterprise tier functionality (UI-only "Coming soon").

## 3. Dependencies

| Dependency | State | Impact |
|---|---|---|
| Auth platform (`src/api/session.ts`, `requireStaffContext`, `requireOrganizationContext`) | ✅ Exists, real, no change needed for this scope | Foundation |
| Invitation scaffolding (`Invitation` model, `createInvitation`/`acceptInvitation`, `/api/organizations/[id]/invitations*`) | ✅ Exists, real, needs extension (expiry, live-check endpoint) | Epic 2 builds on this, not from scratch |
| Capability model (`src/domain/authorization.ts`, `effectiveCapabilities`) | ✅ Exists, real, no change needed | Foundation for Epic 3 |
| Event platform (`publishEvent`, `EventLog`/`EventHandlerLog`, retry+DLQ) | ✅ Exists, real, 8 existing producers, `staff.invited` already fires | New event types only |
| Notification delivery (email/SMS) | ⛔ Does not exist — **and per ADR-003, never needed for this scope** (WhatsApp/copy-link only) | No blocker — resolved by scope, not by building infra |
| Subscription/payment gateway | ⛔ Does not exist — **and per ADR-004, never needed for this scope** (admin-managed only) | No blocker — resolved by scope |
| Solo-clinic surface (P1–P6, `/clinic`) | ✅ Shipped, stable | Must not regress — every story below states its non-regression boundary |

## 4. Architecture Summary

No new architectural layer. Every change fits the existing `domain → services → api routes → app` layering already in place. Three new services (`membership-service`, `subscription-service` extension of `onboarding-service`, `invite-validation` extension of the existing invitation flow), one generalized routing function (`workspacesForAccount` replacing the single-path `defaultWorkspacePathForRole`), zero new infrastructure (no middleware, no message queue, no external delivery integration).

**Single highest-leverage architectural fact carried from the Feasibility Report:** the entire change set touches **one shared resolver** (`requireStaffContext`) for capability/membership gating, not 38 independent routes — this is what keeps this plan's risk profile low despite the breadth of the BRD.

## 5. Backend Impact

- Extend `StaffProfile` with `membership_status` (new field, not overloading `is_active`).
- Extend `Invitation` with `expires_at` (72h, set at creation).
- Extend `Organization` with plan/seat fields (Solo default for all existing orgs).
- New service: membership lifecycle (suspend/reactivate/archive, including the reconciliation-gated archive flow — check future appointments/active consultations, block or allow).
- New service logic: seat-limit check in `createInvitation` (computed count, never cached).
- New service logic: live duplicate-phone check as its own lightweight query (used by the prototype's inline validation).
- `getClinicOverview`/Today/booking-page doctor-resolution: fix the implicit "grab any doctor" fallback — **P0, blocking**, required for Managing Doctor/Owner dashboards to show correct multi-doctor data.
- Rate limiting added to invitation create + accept (reuses existing `checkRateLimit`/`clientIp`).
- Audit logging expanded for every new mutation this initiative introduces, in the frozen shape: **who / did-what / to-which-record / when / from-where / result.**

## 6. Frontend Impact

- `/clinic` gains: Settings → Practice/Team/Plan grouping; adaptive Dashboard (4 role-driven layouts sharing one route); Team screen (member cards, growth indicator, archive reconciliation dialog); Invite flow (inline validation, WhatsApp/copy-link); Plan screen (Solo/Professional/Enterprise-disabled).
- No new top-level route tree, no workspace switcher — every new screen slots into the existing `/clinic` shell.
- Existing P1–P6 screens (Today, Calendar, Consultation, Practice Setup, Diagnostics, Templates) are **not modified** by this initiative except where the single-doctor-assumption fix touches Today/booking-page doctor resolution (P0 item above) — that fix is corrective, not a redesign.

## 7. Database Impact

Every change is additive (see Readiness Matrix for full DDL-level detail). No column removed, no FK cardinality changed, no destructive migration. `StaffProfile.user_id` stays `@unique` — multi-clinic staff remains explicitly out of scope and untouched.

## 8. API Impact

Extend two existing endpoint families (`/api/organizations/[id]/invitations*`, `/api/organizations/[id]/staff/[staffId]`), add three new endpoints (plan read, upgrade-request, live phone-check). Zero breaking changes to any existing contract — see the full API Readiness Matrix.

## 9. Event Impact

New event types on the existing platform: `staff.member_suspended`, `staff.member_reactivated`, `staff.member_archived`, `staff.archive_blocked` (reconciliation required), `subscription.upgrade_requested`. All lazy/synchronous at the point of mutation — no scheduled-job infrastructure introduced (72h invite expiry is checked lazily at read/accept time, not event-driven).

## 10. Security Impact

Rate limiting on invitation create + accept (currently absent — a pre-existing gap this initiative makes load-bearing, must close before release). Invite token entropy already correct (24-byte random hex), no change needed. Expiry enforced server-side on the acceptance path, not just the UI. No new PII surfaces.

## 11. QA Strategy

- Every story ships with unit tests at the service layer (matching the existing `*.test.ts` convention already used throughout — e.g. `availability-service.test.ts`, `consultation-service.test.ts`).
- Every UI story is browser-verified in real headless Chrome (this codebase's established standard) at 390px and 1280px, zero console errors, no horizontal overflow — not curl/SSR-only checks.
- The approved prototype is the acceptance oracle for every UI story — a story is not done if it deviates from the prototype without a logged Product Office approval.
- Full regression pass (existing 385-test suite, per the Feasibility Report's baseline) after every sprint — zero tolerance for regressions in P1–P6.
- See the dedicated **Product Verification Guide** for Product-Office-executable, non-code verification steps per story.

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Single-doctor-assumption fix is skipped/deprioritized | HIGH | Sequenced as P0 in Sprint 1, blocks Sprint 2's Managing-Doctor/Owner dashboard stories |
| React implementation drifts from the approved prototype | HIGH | Prototype is the acceptance oracle; PR review checklist requires a side-by-side diff against it |
| Seat-count logic gets cached and drifts | MEDIUM | Story explicitly requires computed, not cached, counts — covered by a dedicated test |
| Rate-limiting gap ships to production | MEDIUM | Made an explicit Sprint 1 story, not an afterthought |
| Scope creep toward Departments/RBAC/multi-clinic during implementation | MEDIUM | This plan and the Epics explicitly exclude them; PR review checklist flags any touch to `Department` model or `/staff`, `/admin` (multi-clinic) surfaces |
| Regression in shipped P1–P6 solo-clinic flows | MEDIUM | Full suite regression gate every sprint; new stories are additive-only by construction |

## 13. Release Strategy

Feature-flagged, incremental rollout within the existing `/clinic` shell — no big-bang cutover. Team Management and adaptive Dashboard ship together (they share the role/capability foundation); Plan/Upgrade ships once seat enforcement is verified against real Team data. See **Release Roadmap** for the full timeline.

## 14. Implementation Order (what blocks what)

```
Sprint 1 — Foundation (blocks everything else)
  membership_status field + migration
  Invitation.expires_at + migration + lazy expiry check
  Rate limiting on invite create/accept
  Fix single-doctor-assumption in Today/overview/booking-page (P0)
        │
        ├──────────────────────────────┐
        ▼                              ▼
Sprint 2 — Team + Adaptive Dashboard   Sprint 2b (parallel) — Subscription foundation
  Membership lifecycle service          Organization plan/seat fields
  Team screen (cards, growth indicator) Seat-limit check in createInvitation
  Adaptive Dashboard (4 role layouts)   Plan screen (Solo/Professional/Enterprise)
  depends on: P0 fix above              depends on: Sprint 1 foundation
        │                                      │
        ▼                                      ▼
Sprint 3 — Archive reconciliation      Sprint 3b — Upgrade request flow
  Reconciliation-gated archive dialog    Request-upgrade endpoint + admin-side toggle
  depends on: Sprint 2 Team screen       depends on: Sprint 2b plan model
        │                                      │
        └──────────────┬───────────────────────┘
                        ▼
        Sprint 4 — Invite live-validation + polish
          Live duplicate-phone check endpoint
          Audit-log shape expansion (who/what/target/when/where/result)
          Settings IA regroup (Practice/Team/Plan)
                        │
                        ▼
        System Integration → Regression → UAT → Release Candidate
```

**Critical path:** the P0 single-doctor-assumption fix in Sprint 1 blocks Sprint 2's dashboard work entirely — this is the one item that, if slipped, cascades through the whole plan. Everything else in Sprint 1 (membership status, invite expiry, rate limiting) can proceed in parallel with it.
