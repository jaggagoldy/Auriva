# BRD-043 — Sprint Plan

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md) and the [User Story Catalogue](./brd-043-user-stories.md). Five delivery sprints + one Release Candidate hardening sprint, sequenced by the dependency graph in EEP-043 §14. Velocity assumption: ~15–18 points/sprint (team-relative; adjust to actuals after Sprint 1).

**Global Definition of Ready** (applies to every story before it enters a sprint — not restated per sprint):
- Story matches an approved prototype screen/interaction 1:1, or is explicitly backend-only with no UI surface.
- Acceptance criteria are testable (unit and/or browser-verifiable), not subjective.
- Dependencies listed in the User Story Catalogue are already merged, or are in the same sprint with an explicit intra-sprint order.
- No open Product Office question blocks it (Owner-recovery-dependent stories do not exist in this catalogue — correctly, since that ADR is still open).

**Global Definition of Done** (applies to every story — not restated per sprint):
- Matches the approved prototype exactly, or the deviation was logged and approved by Product Office before merge (per the design-contract rule).
- Unit tests pass; relevant browser verification done at 390px and 1280px with 0 console errors and no horizontal overflow.
- Full existing regression suite green (385+ tests, growing as this initiative adds its own).
- No new `Department`/multi-clinic/RBAC-editor surface touched, per the frozen out-of-scope list.
- Audit logging added for any new mutation, in the frozen who/what/target/when/where/result shape.

---

## Sprint 1 — Foundation (15 pts)

**Sprint goal:** land every schema/platform change every later sprint depends on, and close the one pre-existing security gap this initiative makes load-bearing.

| Stories | Points |
|---|---|
| US-101 membership_status field | 3 |
| US-102 Invitation expiry | 3 |
| US-103 Rate limiting | 2 |
| US-104 Fix single-doctor assumption (P0) | 5 |
| US-501 Organization plan/seat schema | 2 |

**Backend work:** 2 migrations (`membership_status`, `Invitation.expires_at`, `Organization.plan`), `requireStaffContext` membership gate, rate limiting on 2 endpoints, doctor-resolution audit+fix across `clinic-workspace-service.ts` and `booking-service.ts`.
**Frontend work:** none — this sprint is invisible to users by design.
**Database work:** 2 additive, zero-downtime migrations; no backfill scripts beyond field defaults.
**QA work:** full regression suite must stay green after every migration; new unit tests for membership-gate, expiry, rate-limit, and multi-doctor correctness.
**Dependencies:** none — this sprint is the root of the graph.
**Exit criteria:** all 5 stories meet the global DoD; the 385-test baseline suite plus this sprint's new tests are 100% green; a manual smoke test confirms a 2-doctor clinic (seeded test data) resolves correct per-doctor data everywhere US-104 touched.
**Known risks:** US-104 is the sprint's largest item (5 pts) and the critical-path blocker for Sprint 3 — if it slips, Sprint 3 cannot start on schedule. No UI risk this sprint since nothing is user-visible.

---

## Sprint 2 — Invitation System (17 pts)

**Sprint goal:** ship the complete invitation flow, including the seat cap in the same release (never ship invite-creation without its cap).

| Stories | Points |
|---|---|
| US-201 Invite-creation form | 3 |
| US-202 Live duplicate-phone validation | 3 |
| US-203 Generate link + WhatsApp/Copy | 3 |
| US-204 Acceptance flow (valid+expired) | 3 |
| US-205 Server-side duplicate rejection | 2 |
| US-503 Seat-limit guard | 3 |

**Backend work:** live-check endpoint, `createInvitation` extended with duplicate + seat guards, acceptance endpoint now expiry-aware.
**Frontend work:** Invite form, inline validation states, link-ready screen (WhatsApp deep link + copy), standalone acceptance landing page.
**Database work:** none new (all schema landed in Sprint 1).
**QA work:** contract tests for the 3 inline-validation outcomes; unit tests for seat-cap boundary (exactly-at-limit rejects, one-under succeeds); manual WhatsApp deep-link verification on real mobile browsers.
**Dependencies:** US-101 (Sprint 1), US-102 (Sprint 1), US-501 (Sprint 1).
**Exit criteria:** a full invite→WhatsApp-share→accept round trip works end to end against a real (non-mock) backend; seat cap is enforced and cannot be bypassed via direct API call.
**Known risks:** WhatsApp deep-link behavior varies by OS/browser — budget manual device testing time, not just automated.

---

## Sprint 3 — Adaptive Dashboard (17 pts)

**Sprint goal:** ship all four role-driven dashboard layouts, with financial-exclusion enforced as a contract test, not a UI convention.

| Stories | Points |
|---|---|
| US-301 Dashboard data endpoint | 5 |
| US-302 Practice Owner layout | 3 |
| US-303 Managing Doctor layout | 3 |
| US-304 Doctor layout (financial exclusion) | 3 |
| US-305 Receptionist layout | 3 |

**Backend work:** one new endpoint with four role-keyed response builders composing existing Today/billing/team data.
**Frontend work:** four React content components sharing one Dashboard route (no new route tree, no workspace switcher).
**Database work:** none new.
**QA work:** **US-301's contract test (Doctor payload has zero financial/team keys) is the highest-priority test in this sprint** — it is re-run as part of US-304's own Definition of Done, not just written once and forgotten.
**Dependencies:** US-104 (Sprint 1) — Owner/Managing-Doctor layouts are wrong without the multi-doctor fix.
**Exit criteria:** all 4 layouts browser-verified against the prototype at 390/1280px; the financial-exclusion contract test passes and is wired into CI so it can never silently regress.
**Known risks:** the temptation to "just filter in the UI" instead of building the role-keyed backend contract — explicitly reject this shortcut; financial privacy is a security property per EPIC-3's acceptance criteria, not a rendering choice.

---

## Sprint 4 — Team Membership Lifecycle (18 pts)

**Sprint goal:** ship Team Management end to end, including the reconciliation-gated archive flow exactly as prototyped.

| Stories | Points |
|---|---|
| US-401 Team screen (cards + growth indicator) | 5 |
| US-402 Suspend/Reactivate | 3 |
| US-403 Archive conflict-check service | 3 |
| US-404 Reconciliation dialog | 5 |
| US-405 Simple immediate archive | 2 |

**Backend work:** team-list endpoint, suspend/reactivate extension of the existing staff PATCH endpoint, conflict-check service, atomic archive+reassignment transaction.
**Frontend work:** member-card grid, growth indicator, reconciliation dialog (per-row reassignment, gated Archive button), simple confirm modal.
**Database work:** none new — all reads/writes against tables from Sprint 1.
**QA work:** the archive-gating test sequence (1-of-2 reassigned stays blocked, 2-of-2 enables, both server- and client-verified) is the sprint's highest-priority test, mirroring the exact scenario already proven in the approved prototype.
**Dependencies:** US-101 (Sprint 1), US-501 (Sprint 1, for the growth indicator's live numbers).
**Exit criteria:** archiving a doctor with future appointments is impossible to complete without full reassignment, verified by both a unit test bypassing the UI and a browser test using it; archiving a receptionist (no conflicts) is immediate.
**Known risks:** the atomic transaction in US-404 (reassign N appointments + change status in one commit) is the sprint's highest-complexity item — pair-review recommended before merge.

---

## Sprint 5 — Plan, Upgrade & Settings IA (9 pts)

**Sprint goal:** close out the Plan/Professional-upgrade surface and the Settings navigation regroup — the smallest sprint, intentionally, as a buffer before hardening.

| Stories | Points |
|---|---|
| US-502 Plan screen | 2 |
| US-504 Request-upgrade flow | 2 |
| US-505 Admin-side plan toggle | 2 |
| US-601 Settings nav regroup | 3 |

**Backend work:** plan-read endpoint, upgrade-request endpoint (records only, never mutates plan), internal admin-only plan-toggle endpoint gated by `is_platform_admin`.
**Frontend work:** three-tier Plan screen (Enterprise genuinely inert, no dead handler), request/success states, `/clinic` sidebar + bottom-nav regroup into Settings→Practice/Team/Plan.
**Database work:** none new.
**QA work:** access-control test that a clinic Owner session cannot reach the admin-only toggle endpoint; nav-visibility test per role matching the prototype's own automated role-switch checks.
**Dependencies:** US-501 (Sprint 1), US-401 (Sprint 4, Team screen must exist to link to), US-502 (same sprint, sequenced first).
**Exit criteria:** the full BRD-043 feature set is now navigable exactly as the prototype shows it — this is the last feature sprint before hardening.
**Known risks:** low — this sprint is deliberately light to absorb any carry-over from Sprints 1–4.

---

## Sprint 6 — Release Candidate Hardening (no new stories)

**Sprint goal:** zero net-new functionality. Full regression, security review, and Product-Office-executable verification.

**Work:** execute the full [Product Verification Guide](./brd-043-product-verification-guide.md) against a staging build; run the full regression suite; re-run every contract/security test from Sprints 1–5 (rate limiting, financial-exclusion, seat-cap boundary, archive-gating, expiry enforcement) as a single consolidated pass; fix only what those passes surface — no scope additions.
**Exit criteria:** every item in the Product Verification Guide passes; zero P0/P1 defects open; the [Founder Demo Guide](./brd-043-founder-demo-guide.md) can be executed start to finish without a single deviation from the approved prototype.
**Known risks:** the temptation to squeeze in "just one more" improvement during hardening — explicitly against this plan's own principle (this phase is bug fixes and implementation corrections only, per the frozen instruction that closed the UX Freeze review).
