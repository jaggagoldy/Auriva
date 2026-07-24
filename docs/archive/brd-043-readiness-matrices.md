# BRD-043 — Readiness Matrices (API · Database · Frontend · Backend)

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). Combined into one document (Product Office's items #5–#8) because all four matrices constantly cross-reference the same screens/entities — kept as four clearly delineated sections rather than four separate files that would need to repeat the same context.

All existing-code references below are to the actual current codebase, verified during the Technical Feasibility Review and this planning pass — not assumed.

---

## Part 1 — API Readiness Matrix

Per screen in the approved prototype:

| Screen | Existing APIs (reusable as-is) | Needs extension | Missing (new) | Mock for frontend-first dev |
|---|---|---|---|---|
| Welcome/Onboarding | `POST /api/onboarding/quick-setup` (unchanged) | — | — | Not needed — screen is static copy |
| Dashboard (adaptive) | `GET /api/clinic/today`, `GET /api/clinic/overview` (data sources composed into the new endpoint) | — | `GET /api/clinic/dashboard` (US-301) — role-keyed response | `{role: 'doctor', queue: [...], appointments: [...]}` fixture per role, 4 fixtures total |
| Settings → Practice | `GET/PATCH /api/clinic/profile` (P3, already shipped, unchanged) | — | — | N/A — real API already exists |
| Settings → Team | — | `PATCH /api/organizations/[id]/staff/[staffId]` (existing — extend to accept `membership_status`) | `GET /api/clinic/team` (US-401), `POST /api/clinic/team/[staffId]/archive` (US-404/405) | `{members: [...], plan: 'solo', seats_used: 2, seats_total: 2}` |
| Invite flow | `POST /api/organizations/[id]/invitations` (existing — extend with expiry + seat + duplicate guards) | Yes — US-102, US-205, US-503 all extend this one route | `GET /api/organizations/[id]/invitations/check?phone=` (US-202, live validation) | `{status: 'available'|'pending'|'active'}` keyed by 3 fixture phone numbers, matching the prototype's own mock data exactly |
| Invitation accept | `acceptInvitation` service (existing, via a route — extend for expiry) | Yes — US-102, US-204 | — | `{valid: true, clinic, inviter, role}` / `{valid: false, reason: 'expired'}` |
| Plan | — | — | `GET /api/clinic/plan` (US-502), `POST /api/clinic/plan/upgrade-request` (US-504) | `{plan:'solo', seats:{used:2,total:2}, professional:{doctors:5,members:15}}` |
| Admin plan toggle | — | — | Internal-only endpoint (US-505), gated by `is_platform_admin` | Not applicable — internal tool, not frontend-team scope |

**Recommendation for frontend-first parallel work:** the 4 mock fixtures above (Dashboard × 4 roles) are the highest-leverage mocks — they let frontend build and browser-verify all 4 Dashboard layouts against the prototype before US-301's real endpoint lands, then swap the fixture for the real fetch with zero component changes (same payload shape, contract-tested in US-301).

---

## Part 2 — Database Readiness Matrix

### Existing tables (read/extended, never restructured)
`StaffProfile`, `Invitation`, `Organization`, `OrganizationMember`, `Clinic`, `Appointment`, `User`, `AuditLog`, `Session`.

### New columns (all additive)

| Table | New column | Type | Default | Story |
|---|---|---|---|---|
| `StaffProfile` | `membership_status` | String | `'active'` | US-101 |
| `Invitation` | `expires_at` | DateTime | `created_at + 72h` at creation | US-102 |
| `Organization` | `plan` | String | `'solo'` | US-501 |
| `Organization` | (optional) `plan_updated_at` | DateTime | null | US-505, if the admin tool wants an audit timestamp beyond `AuditLog` |

### New tables
None required for the frozen scope. `US-504`'s upgrade-request can be a lightweight `AuditLog`-pattern entry (reusing the existing table's shape: `organization_id`, `actor_user_id`, `action`, `detail`, `created_at`) rather than a new table — Engineering Manager's call at implementation time; a dedicated `UpgradeRequest` table is the alternative if richer status tracking (pending/approved/rejected) turns out to be needed, which is a build-time engineering decision, not a Product one.

### Migration order

```
1. StaffProfile.membership_status      (US-101, Sprint 1)
2. Invitation.expires_at               (US-102, Sprint 1)
3. Organization.plan                   (US-501, Sprint 1)
```
All three are independent of each other and can be sequenced in any order or combined into one migration — listed separately here only because they belong to different stories.

### Rollback strategy
Every migration in this plan is additive (new nullable-or-defaulted column, no data rewrite, no FK cardinality change). Rollback is a straight `DROP COLUMN` with zero data-loss risk to any *other* column — the only loss on rollback is the new column's own data, which is expected and acceptable for a rollback. No migration in this plan requires a multi-step expand/contract pattern because none of them touch existing data shape.

### Zero-downtime considerations
All three migrations are safe to apply while the application is running (additive column with a default), consistent with every other migration already shipped in this codebase's history (P2 availability fields, P3 profile fields, P5 `TestRecommendation`, P6 `ClinicalTemplate` — all followed this exact additive pattern with no incident). No table lock beyond the brief `ADD COLUMN` operation itself; no backfill script required beyond the column defaults.

---

## Part 3 — Frontend Readiness Matrix

Per screen, mapped against the actual current `/clinic` React codebase:

| Screen | Reusable existing components | New components required | Navigation change | Routing change | State management change |
|---|---|---|---|---|---|
| Dashboard | `Card`, existing `kpi`-style summary patterns from Today view | 4 role-content components (`OwnerDashboard`, `ManagingDoctorDashboard`, `DoctorDashboard`, `ReceptionistDashboard`) sharing one route | None — Dashboard is already the default landing view | None — same `/clinic` route, content varies by fetched role | New: role-aware data hook wrapping `GET /api/clinic/dashboard`; no new global store needed, matches existing per-view `useState`+`fetch` pattern already used throughout `/clinic` |
| Settings → Practice | Existing P3 Practice Setup component (unchanged) | None | Moves under a new `Settings` nav group | None | None |
| Settings → Team | `Button`, `Card`, `Input`, existing dialog/modal patterns from the Consultation workbench's confirm dialogs | Member-card grid, growth-indicator card, reconciliation dialog | Moves under `Settings` group | None | New local state for the reconciliation dialog's per-row reassignment selections (matches the prototype's vanilla-JS state exactly, expressed as React `useState`) |
| Invite flow | `Input`, `Button`, existing step-indicator pattern (if any) or new (small) | Invite form, inline-validation field-note component, link-ready screen with WhatsApp/copy actions | Reachable via Team's "Invite member" button only — **no standalone top-level nav item** (matches the prototype's own Epic-6 change) | New sub-route or modal within `/clinic` (Engineering Manager's call — the prototype treats it as a full-screen view, not a modal) | Debounced input state for live validation (US-202) |
| Invitation accept | None reusable — this is the one screen outside the authenticated `/clinic` shell | New standalone page/route, valid + expired states | N/A — unauthenticated entry point | New top-level route (e.g. `/join/[token]`, distinct from `/clinic/*`) | Simple local state, no shell/session dependency |
| Plan | `Card`, `Button` | 3-card plan display, request/success states | Moves under `Settings` group | None | None beyond a simple request-status flag |

**Layout changes:** the `/clinic` sidebar/bottom-nav components need the `Settings` group construct (label + sub-items) added — this is the only structural layout change; every other screen slots into the existing content area unchanged.

**No new global state management library or pattern is required** — every new screen fits the existing per-view `fetch`+`useState` convention already used throughout `/clinic` (confirmed during the Technical Feasibility Review); introducing Redux/Zustand/a global store for this scope would be over-engineering relative to the existing codebase's established pattern.

---

## Part 4 — Backend Readiness Matrix

| Layer | Existing (reused) | New for BRD-043 |
|---|---|---|
| **Services** | `onboarding-service.ts` (`createInvitation`, `acceptInvitation` — extended, not replaced), `clinic-workspace-service.ts` (`getClinicOverview` — fixed in US-104), `booking-service.ts` (doctor resolution — fixed in US-104) | `membership-service.ts` (suspend/reactivate/archive + conflict-check), dashboard-composition logic added to an existing or new service file |
| **Controllers (route handlers)** | `src/app/api/organizations/[id]/invitations/route.ts`, `src/app/api/organizations/[id]/staff/[staffId]/route.ts` — both extended | `src/app/api/clinic/dashboard/route.ts`, `src/app/api/clinic/team/route.ts`, `src/app/api/clinic/team/[staffId]/archive/route.ts`, `src/app/api/clinic/plan/route.ts`, `src/app/api/organizations/[id]/invitations/check/route.ts` |
| **Repositories** | Direct Prisma calls throughout (this codebase does not use a separate repository layer beyond services — consistent with its existing architecture, not a gap to fill) | None — follow the existing service-owns-its-queries pattern |
| **Validators** | Existing `badRequest`/domain-error pattern in `src/api/http.ts` | New domain errors: `InvitationExpiredError`, `DuplicateActiveMemberError`, `SeatLimitExceededError`, `ArchiveConflictError` — all mapped through the existing `mapDomainError` convention, not a new error-handling pattern |
| **Policies (authz)** | `src/domain/authorization.ts` (`effectiveCapabilities`, role predicates) — extended with one new predicate | `isMembershipActive(status)` — the only new authorization primitive this entire initiative needs |
| **Events** | `publishEvent`, `EventLog`/`EventHandlerLog`, existing retry+DLQ (`dispatchHandler`) — `staff.invited` already fires today | New event types only: `staff.member_suspended`, `staff.member_reactivated`, `staff.member_archived`, `staff.archive_blocked`, `subscription.upgrade_requested` — no new event *infrastructure* |
| **Audit** | `AuditLog` model + `src/lib/audit.ts` (existing, currently sparse — 4 call sites) | Every new mutation in this initiative logs in the frozen shape (who/what/target/when/where/result) — this initiative's own actions become the first fully-compliant audit trail in the codebase, not a retroactive fix of the sparse existing coverage |
| **Security** | `checkRateLimit`/`clientIp` (`src/lib/rate-limit.ts`) — proven on quick-setup, extended to 2 new endpoints (US-103) | No new security primitive — reuse only |
| **Rate limiting** | Same as above | Applied to invitation create + accept (currently unrated — a pre-existing gap this initiative closes) |

**No new backend infrastructure layer is introduced anywhere in this plan** — no message queue, no new auth mechanism, no new ORM pattern, no repository abstraction that doesn't already exist. Every new piece is an instance of a pattern already proven elsewhere in this codebase (P2 availability, P3 practice setup, P5 diagnostics, P6 templates all shipped this exact way).
