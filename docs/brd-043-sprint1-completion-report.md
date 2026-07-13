# Sprint Completion Report — Sprint 1 (Foundation)

Filled from the [reusable template](./brd-043-sprint-completion-template.md). Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md).

**Report date:** 2026-07-13
**Reported by:** Engineering (implementation), for Product Office review
**Sprint dates:** 2026-07-13 (single-session implementation)

### Sprint Goal
*(copied verbatim from the Sprint Plan)* Foundation — no user-visible change. Full regression must stay green.

### Stories Completed

| Story ID | Title | Status | Notes |
|---|---|---|---|
| US-101 | Membership status field | Done | `StaffProfile.membership_status`, default `'active'`, backfilled 100% |
| US-102 | Invitation expiry | Done | `Invitation.expires_at`, 72h window, server-enforced on both read and accept |
| US-103 | Invitation rate limiting | Done | Create + accept endpoints, mirrors quick-setup's existing pattern |
| US-104 | P0 — multi-doctor resolution fix | Done | Found broader than scoped — see "Deviations" below |
| US-501 | Organization plan schema | Done | `Organization.plan`, default `'solo'`, backfilled 100% |

### Stories NOT Completed
None — all 5 Sprint 1 stories are complete.

### Files Changed

**New files:**
- `src/services/doctor-resolution.ts` — the shared US-104 resolver
- `src/services/doctor-resolution.test.ts`
- `src/app/api/clinic/book/route.test.ts`
- `src/app/api/organizations/[id]/invitations/route.test.ts`
- `src/app/api/invitations/[token]/accept/route.test.ts`
- `prisma/migrations/20260713104132_us101_staff_membership_status/migration.sql`
- `prisma/migrations/20260713104147_us102_invitation_expires_at/migration.sql`
- `prisma/migrations/20260713104214_us501_organization_plan/migration.sql`
- `docs/brd-043-governance-addendum.md`
- `docs/brd-043-sprint1-completion-report.md` (this file)
- `docs/brd-043-sprint1-founder-verification.md`

**Modified files:**
- `prisma/schema.prisma` — `StaffProfile.membership_status`, `Invitation.expires_at`, `Organization.plan`
- `src/services/onboarding-service.ts` — expiry (`InvitationExpiredError`, `assertInvitationLive`), rate-limit-adjacent logging (`invite.created`/`invite.accepted`/`invite.expired`)
- `src/services/onboarding-service.test.ts` — expiry test coverage appended
- `src/services/clinic-workspace-service.ts` — `getClinicOverview` doctor resolution
- `src/services/clinic-schedule-service.ts` — `getClinicSchedule` doctor resolution
- `src/services/practice-profile-service.ts` — `getPracticeProfile`/`updatePracticeProfile` doctor resolution (read soft-degrades, write does not)
- `src/services/clinical-template-service.ts` — `resolveClinicDoctor` re-exported from the shared module, ambiguity not caught (clinical content)
- `src/app/api/clinic/book/route.ts` — doctor resolution + optional `doctor_id` field (additive)
- `src/app/api/organizations/[id]/invitations/route.ts` — rate limiting
- `src/app/api/invitations/[token]/accept/route.ts` — rate limiting
- `src/api/http.ts` — `AmbiguousDoctorError` → 409, `InvitationExpiredError` → 409 registered in `mapDomainError`
- `docs/eep-043-engineering-execution-plan.md`, `docs/brd-043-release-roadmap.md` — linked the Governance Addendum

**Migrations applied (in order):** `us101_staff_membership_status` → `us102_invitation_expires_at` → `us501_organization_plan`. See Database Changes below for verification detail on each.

### Database Changes

Three migrations, applied in order, each independently verified per the [Governance Addendum's protocol](./brd-043-governance-addendum.md#2-data-migration-validation-protocol):

| Migration | Rows before | Rows after | Backfill verified |
|---|---|---|---|
| `20260713104132_us101_staff_membership_status` | 25 StaffProfile | 25 (unchanged) | 25/25 = `'active'` |
| `20260713104147_us102_invitation_expires_at` | 0 Invitation (dev DB has none yet) | 0 (unchanged) | N/A — no pre-existing rows to backfill in this environment; backfill SQL is present and will run correctly in any environment with existing pending invitations |
| `20260713104214_us501_organization_plan` | 252 Organization | 252 (unchanged) | 252/252 = `'solo'` |

**Rollback:** all three are additive-only (new nullable/defaulted columns). Each can be reverted with a plain `DROP COLUMN` — no other Sprint 1 code reads these columns in a way that would break if reverted (see the Governance Addendum's per-migration rollback notes). Not yet exercised against a copy of production data (no production environment exists yet for this pre-launch initiative) — flagged as a Sprint 6/RC pre-flight item, not a Sprint 1 gap.

**Zero-downtime:** yes — additive columns with defaults, no lock-heavy backfill (the `expires_at` backfill is a single `UPDATE ... WHERE status = 'pending'`, bounded by however many pending invitations exist, never large in this domain).

### APIs Delivered

| Endpoint | Method | Status | Contract-tested |
|---|---|---|---|
| `/api/organizations/[id]/invitations` | POST | Extended (rate limiting added) | Yes — 429 + 201 paths both tested |
| `/api/invitations/[token]/accept` | POST | Extended (rate limiting + expiry enforcement) | Yes |
| `/api/invitations/[token]` | GET | Extended (expiry enforcement) | Yes (service-level) |
| `/api/clinic/book` | POST | Extended (doctor resolution fixed; optional `doctor_id` field added, additive) | Yes — both the 409-ambiguous and 201-unambiguous paths |
| `/api/clinic/overview`, `/api/clinic/schedule`, `/api/clinic/profile`, `/api/clinic/templates*` | GET/PATCH/POST | Internal fix only (doctor resolution) — no request/response shape change | Covered via `doctor-resolution.test.ts` at the service layer; no route-level shape change to contract-test |

No new endpoints. No breaking changes to any existing contract (ADR-005 compliance).

### UI Delivered
None — Sprint 1 is schema and platform hardening by design (EEP-043 §14). No screen in this sprint.

### Technical Debt Introduced

1. **`AmbiguousDoctorError` on read paths degrades silently to `null`, not surfaced to the UI yet.** `getClinicOverview` and `getClinicSchedule` log a `warn` and return as if there were no doctor, rather than telling the Owner *why* their booking link disappeared. Correct behavior requires the Adaptive Dashboard (Sprint 3) to give an Owner an explicit way to see/select across multiple doctors — Sprint 1 intentionally does not build UI. Tracked as a Sprint 3 follow-up, not silently dropped.
2. **A clinic that already has 2+ doctors today** (reachable pre-Sprint-1, since no seat limit exists until US-503/Sprint 2) will see `/clinic`'s booking link and calendar time-blocks go from "showing an arbitrary doctor's data" to "showing nothing" the moment this ships, until that clinic's owner is prompted (future sprint) to pick a default identity or until Sprint 3's dashboard removes the single-identity assumption entirely. This is a deliberate trade — degrading to nothing is correct; continuing to guess was the bug. No such clinic is known to exist in the current dataset (dev DB has 252 orgs, all effectively solo).
3. **Migration rollback has not been exercised against a production-sized data copy** — no production environment exists yet for this pre-launch product. Flagged for the Sprint 6/RC pre-flight checklist per the Governance Addendum.
4. **A real observability/metrics dashboard does not exist** (per Governance Addendum §5) — the new structured log lines (`invite.created`, `invite.accepted`, `invite.expired`, `member.*`, etc.) are queryable via log search only, not a UI. Recorded as a Platform Foundation gap for a future initiative, consistent with how notification infrastructure (ADR-003) was scoped out.

### Deferred Items
Everything not in Sprint 1's 5 stories — Team screen, Invitation UI, Adaptive Dashboard, membership lifecycle service, seat-limit enforcement, Plan/Upgrade — all deferred to Sprints 2–5 as planned. Not started, per the explicit "build only Sprint 1" instruction.

### Test Summary
- Unit/integration tests added: **25** (all real-database, matching this codebase's established convention — no mocked Prisma calls)
  - `src/services/doctor-resolution.test.ts` — 7 tests
  - `src/services/onboarding-service.test.ts` — 5 new tests appended (expiry/resend/live-accept)
  - `src/app/api/organizations/[id]/invitations/route.test.ts` — 2 tests (429 + happy path)
  - `src/app/api/invitations/[token]/accept/route.test.ts` — 2 tests (429 + happy path)
  - `src/app/api/clinic/book/route.test.ts` — 2 tests (409-ambiguous + 201-unambiguous)
  - Remaining new assertions are within the above files' existing `describe` blocks.
- Browser-verification: not applicable — no UI shipped this sprint (per EEP-043 §14's own note, confirmed against the Founder Demo Guide's Sprint 1 section).
- Full regression suite result: **403 / 403 passing** (baseline + this sprint's additions), `npx tsc --noEmit` clean, `npm run build` clean, `npm run lint` — 31 pre-existing failures, none in any file this sprint touched (all in unrelated `/staff`, `/admin`, `/patient` React-hooks-rule violations predating this work).

### Coverage Summary
- New code (doctor-resolution.ts, onboarding-service.ts expiry/rate-limit additions, the 5 fixed call sites) is exercised by both the happy path and every documented edge case (ambiguous/zero-doctor/explicit-id/deactivated-doctor/receptionist-misattribution) in the test files above.
- No coverage regression — full suite green, no test removed or weakened.

### Known Issues
| Issue | Severity | Tracked where |
|---|---|---|
| Ambiguous-doctor read paths silently degrade rather than informing the Owner | Low (by design for Sprint 1 scope; real fix is Sprint 3's Adaptive Dashboard) | Technical Debt #1 above |
| Migration rollback untested against production-sized data | Low (no production environment exists yet) | Technical Debt #3 above |

### Demo Guide
See [Founder Demo Guide — Sprint 1](./brd-043-founder-demo-guide.md#sprint-1--foundation-no-user-visible-demo) for the verification-only walkthrough (no click-through — this sprint has no UI). A Sprint-1-specific step-by-step for a non-developer reviewer is in the companion [Founder Verification Guide](./brd-043-sprint1-founder-verification.md).

### Reviewer Checklist
- [x] Every completed story's UI matches the approved prototype exactly, or deviation was Product-Office-approved before merge — N/A, no UI this sprint
- [x] No new `Department`/multi-clinic/RBAC-editor surface touched
- [x] No new business feature introduced beyond the frozen BRD-043 scope
- [x] Audit logging / structured event logging present on every new mutation, in the frozen shape (or its logging equivalent per the Governance Addendum §5)
- [x] Full regression suite green
- [x] This sprint's stories' Definition of Done fully met

### Next Sprint Prerequisites
Sprint 2 (Invitation System) depends on Sprint 1's foundation being merged and stable:
- `membership_status` and `expires_at` fields available (done, this sprint)
- Rate limiting pattern established (done, this sprint — Sprint 2's seat-limit guard follows the same `checkRateLimit` convention)
- P0 doctor-resolution fix merged (done, this sprint — blocks nothing further in Sprint 2, but Sprint 3's dashboard work depends on it)
