# BRD-043 — Governance Addendum

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). Written in response to the Product Office's Engineering Director review (2026-07-13, score 9.9/10) of the Phase 4 planning package. That review found no defects in the plan itself — it flagged 5 governance gaps that should close **before** Sprint 1 starts rather than being discovered mid-implementation. This document closes all 5. Nothing here changes scope, sprints, stories, or the approved prototype — it is operational scaffolding around the plan already approved.

---

## 1. Feature Flag Strategy

**Decision:** extend the existing env-var boolean-flag pattern already in production (`isDemoModeEnabled` in [src/lib/config.ts](../src/lib/config.ts)) rather than introducing a flag service/framework — consistent with EEP-043 §4's "zero new infrastructure" constraint.

### Flag names (one per independently-releasable surface)

| Flag | Gates | Default (dev/staging) | Default (production) |
|---|---|---|---|
| `FEATURE_TEAM_MANAGEMENT` | Team screen, member cards, invite/suspend/archive UI | `true` | `false` until Sprint 4 exit |
| `FEATURE_ADAPTIVE_DASHBOARD` | 4 role-keyed dashboard layouts | `true` | `false` until Sprint 3 exit |
| `FEATURE_PROFESSIONAL_PLAN` | Plan screen, request-upgrade flow | `true` | `false` until Sprint 5 exit |
| `FEATURE_ARCHIVE_REASSIGNMENT` | Reconciliation-gated archive dialog | `true` | `false` until Sprint 4 exit |
| `FEATURE_TEAM_INVITATION` | Invite form, live validation, WhatsApp/copy-link | `true` | `false` until Sprint 2 exit |

Read via a single new function `src/lib/config.ts::isFeatureEnabled(flag, env)`, same shape as `isDemoModeEnabled` — no new file, no new pattern. Backend routes check the flag server-side (403/404 the route, not just hide the nav item) — this closes the same class of gap the Product Verification Guide already flags for Settings IA (§5, "confirmed by inspecting the page, not just visually").

### Enable order

```
Development (all ON by default)
      ↓
Internal QA (flag flipped ON per-sprint as that sprint's stories land)
      ↓
Staging (mirrors QA's flag state)
      ↓
Pilot Clinic (flags enabled one at a time, in Sprint order — Invitation
              before Dashboard before Lifecycle before Plan — never all
              5 at once even if all 5 sprints are code-complete)
      ↓
Production (general availability — flag removed from code once stable,
            not left as permanent dead conditional)
```

### Rollback strategy

Each flag is checked at the top of its route handlers and its top-level UI entry point. Disabling a flag in production is an env-var change + restart — no deployment, no revert, no migration rollback. This is the answer to the Director's literal question: *if Sprint 4 (Team Lifecycle) fails after release, `FEATURE_TEAM_MANAGEMENT=false` removes it from every user's experience within one restart, while Sprint 1–3 work (which is additive and independently flagged) stays live.*

Flags are removed from the codebase (dead-code cleanup) only after a feature has been at 100% production for one full release cycle with no rollback — tracked as a Sprint 6/RC checklist item, not left indefinitely.

---

## 2. Data Migration Validation Protocol

Every migration in this initiative (see [Readiness Matrices §Database](./brd-043-readiness-matrices.md)) is additive-only (new nullable/defaulted columns, no drops, no type changes, no cardinality changes) — but "additive" does not mean "unverified." Every migration in Sprint 1 and beyond follows this sequence, and a migration is not considered done until all 5 steps are recorded in that sprint's Completion Report:

```
1. Migration Applied        — prisma migrate deploy, exit code 0
2. Migration Verified       — schema introspection matches the Prisma schema file exactly
3. Row Counts               — SELECT COUNT(*) before == SELECT COUNT(*) after, for every
                               touched table (an additive column must never change row count)
4. Constraints Verified     — new column's default/nullability behaves as declared; a spot
                               query confirms 100% of pre-existing rows got the expected
                               backfill value, not just "no error was thrown"
5. Rollback Tested          — `prisma migrate resolve --rolled-back` (or the raw DOWN SQL)
                               exercised against a copy of the migrated DB in a non-prod
                               environment before the migration ships to staging
6. Performance Verified     — EXPLAIN ANALYZE on the migration's own DDL against a
                               production-sized table copy (or the largest available table
                               if pre-production data is small) — flags a lock-heavy
                               migration before it reaches production, not after
```

### Applied to Sprint 1's actual migrations

| Migration | Row-count check | Constraint check | Rollback |
|---|---|---|---|
| `StaffProfile.membership_status` (new column, default `'active'`) | `COUNT(StaffProfile)` unchanged | 100% of existing rows read `membership_status = 'active'` | Drop column — safe, no other column reads it yet pre-Sprint-1 |
| `Invitation.expires_at` (new column, backfilled `created_at + 72h` for existing pending rows) | `COUNT(Invitation)` unchanged | 100% of existing `pending` rows have `expires_at = created_at + 72h`; `accepted`/`revoked` rows may be null (expiry is meaningless post-resolution) | Drop column — the lazy expiry check treats a null `expires_at` as "no expiry enforced," so this is safe to roll back mid-flight too |
| `Organization.plan` + seat fields (new columns, default `'solo'`) | `COUNT(Organization)` unchanged | 100% of existing orgs read `plan = 'solo'` | Drop columns — no other code path reads them until `FEATURE_PROFESSIONAL_PLAN` is on |

This closes the Director's specific concern verbatim: *"a migration can succeed but corrupt data"* — every migration in this plan now has an explicit post-migration data-correctness check, not just a successful exit code.

---

## 3. API Versioning (ADR-005)

**Question raised:** should new BRD-043 endpoints be `/api/v1/...` or stay unprefixed.

**Decision: stay unprefixed, matching every existing route in this codebase (`/api/organizations/...`, `/api/auth/...`, `/api/appointments/...` — zero existing routes carry a version prefix).** Introducing versioning for this initiative alone would be inconsistent with the other ~40 route files and is exactly the kind of "new architectural layer" EEP-043 §4 already rules out.

**In place of versioning, the policy is additive-only evolution**, already implicit in EEP-043 §8 ("zero breaking changes to any existing contract") and now made explicit as a standing rule for every endpoint this initiative touches or adds:

- New fields are added optionally; existing fields are never removed or renamed.
- A response shape change that would break an existing consumer is not a "v2 of the same endpoint" — it is a new endpoint with a new, purpose-named path (this codebase's existing pattern — e.g. the separate patient-vs-staff session resolvers rather than one versioned session endpoint).
- If a genuine breaking change is ever unavoidable, that is the trigger to introduce `/api/v1/` — retroactively, at that point, not preemptively now.

**Never revisit this ADR inside BRD-043's scope** — if a future initiative needs real API versioning, that is a Platform Foundation (Pillar 6) decision made on its own merits, not inherited from this one.

---

## 4. Performance Budget

No APM/metrics backend exists in this codebase today (confirmed — see §5 below), so these budgets are enforced two ways until real infrastructure exists: (a) a timing assertion in each endpoint's integration test, using the `duration_ms` already emitted by [src/api/logger.ts](../src/api/logger.ts)'s `withRequestId` wrapper; (b) a manual Network-tab check during each sprint's browser verification pass (the existing QA standard — see EEP-043 §11).

| Endpoint / metric | Budget | Rationale |
|---|---|---|
| Dashboard data endpoint (all 4 role layouts) | < 500ms server time | Highest-traffic new endpoint (Sprint 3); aggregates appointments+revenue+team — the endpoint the Director specifically flagged as a future N+1 risk |
| Team screen (member list) | < 300ms server time | Simple list query, no aggregation |
| Invite live-validation (phone check) | < 200ms server time | Fires on every keystroke (debounced) — must feel instant |
| Plan/seat-count read | < 150ms server time | Small, single-org-scoped query |
| Largest Contentful Paint, any new screen | < 2.5s on a throttled "Fast 3G" Chrome DevTools profile | Matches the existing solo-clinic UX north-star (FVT < 10 min, see [[auriva-solo-practice-ux-freeze]] memory) — a slow Team/Dashboard screen works against that same goal |

**Enforcement mechanism for Sprint 3 specifically (Dashboard):** the dashboard data endpoint is built as **one query per role layout, not N sequential queries** — this is stated now as a Sprint 3 acceptance criterion addition (added to US-301 in the [User Story Catalogue](./brd-043-user-stories.md)), not left to be discovered during code review. If a role's data genuinely requires more than one query, they run in parallel (`Promise.all`), never sequentially.

A budget breach found during a sprint's browser-verification pass is logged in that sprint's Completion Report under Known Issues, with severity — it does not silently ship un-noted.

---

## 5. Observability Plan

No metrics/APM backend exists in this codebase today — confirmed by inspection (structured JSON logging via `src/api/logger.ts` exists and is real; there is no dashboard, no alerting on business metrics beyond the existing `src/lib/alerts` production-error channel). Building a full metrics backend is explicitly **not** part of this initiative — it would be new infrastructure disproportionate to BRD-043's scope, the same reasoning already applied to rate-limiting's in-memory counter (see `src/lib/rate-limit.ts`'s own header comment).

**What ships with this initiative instead:** every new mutation emits a structured, named log line through the existing `logger` — queryable today via log search, and the exact shape a future metrics backend would ingest without any rework, so this is forward-compatible rather than throwaway.

| Event | Emitted where | Level | Fields |
|---|---|---|---|
| `invite.created` | `createInvitation` | info | organizationId, invitationId, role |
| `invite.accepted` | `acceptInvitation` | info | organizationId, invitationId, role |
| `invite.expired` | acceptance path, when `expires_at` has passed | warn | organizationId, invitationId |
| `invite.rate_limited` | invite create/accept routes | warn | organizationId or ip |
| `seat.limit_exceeded` | `createInvitation`, seat-check failure | warn | organizationId, currentPlan, seatCount |
| `member.suspended` / `member.reactivated` | membership-service | info | organizationId, staffProfileId, actorUserId |
| `member.archive_blocked` | archive reconciliation gate | info | organizationId, staffProfileId, conflictCount |
| `member.archived` | membership-service, post-reconciliation | info | organizationId, staffProfileId, actorUserId |
| `subscription.upgrade_requested` | subscription-service | info | organizationId, fromPlan, toPlan |

Every one of these already has an event-platform equivalent per EEP-043 §9 (`staff.member_suspended` etc.) — the log lines are the human-readable, immediately-queryable twin of those events, not a duplicate system. `request.completed` (already shipping, unchanged) continues to give per-request latency for every endpoint this initiative adds, which is what the Performance Budget above is checked against.

**Explicitly deferred, not silently dropped:** a real dashboard answering "why are invitations failing right now" requires log aggregation/metrics infrastructure this codebase does not have. That is flagged here as a genuine Platform Foundation (Pillar 6) gap for a future initiative, not solved inside BRD-043 — consistent with how notification infrastructure was scoped out via ADR-003. Recorded as Sprint 1 technical debt (see the Sprint 1 Completion Report).

---

## Status

All 5 gaps closed as of 2026-07-13. This addendum is now part of the approved planning package alongside the other 9 documents (see [Release Roadmap §Document set index](./brd-043-release-roadmap.md)). Sprint 1 implementation proceeds under these terms in addition to the terms already frozen in EEP-043 and the Product Verification Guide.
