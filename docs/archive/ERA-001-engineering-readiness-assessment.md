# ERA-001 — Engineering Readiness Assessment

**Program:** Auriva Healthcare OS — APS-044/045 Identity & Workspace Platform (the frozen engineering baseline, APS-046)
**Author role:** Lead Architect / Principal Eng / Tech Lead / QA Lead / Eng Manager
**Date:** 2026-07-15
**Status:** Draft for Product Office approval — **no code written; this gate must pass before implementation begins**

**Sources of truth (frozen):** APS-044 (Identity & Workspace), APS-045 (Experience/Surface Model),
APS-046 (Engineering Baseline), SAD-043 (Solution Architecture), Repository Realignment Audit,
Technical Feasibility Review, UXS-043 Packages 1–6, UXS-043 Phase 1 (E2E Review) & Phase 2
(Consistency Audit + Deliverables A–D).

---

## 1. Overall Implementation Readiness

**Score: 80 / 100 — "Ready to start Phase 0 today; two prerequisites gate Batches C–D."**

The platform is unusually well-prepared: the architecture is frozen and *already leans the right way*
in code (Repository Audit: 78/100), the UX is frozen and largely maps to **surfaces that already
exist** (reconnect, not rebuild), and the migration is additive and feature-flagged. Nothing blocks
**Phase 0** (non-functional cleanup) from starting immediately.

**Two real gaps prevent full traceability and gate the later batches:**
1. **PRS-043 (acceptance criteria) was not generated** — the roadmap ran Phase 1/Phase 2 then jumped to engineering, skipping Phase 3 (Gemini) and Phase 4 (PRS-043). The mandated chain *UX → Business Rule → **Acceptance Criteria** → Code* is missing its third link. Deliverable D (traceability starter) exists but is not acceptance criteria. **→ Clarification C1.**
2. **The capability → permission matrix for the six roles is not fully specified** (Nurse/Technician/Practice-Manager exact allow/deny). APS-044 §11 names the roles; SAD-043 §7 gives default bundles conceptually; the exact per-capability matrix is not frozen. **→ Clarification C2.**

Neither blocks Phase 0 or Batches A–B. Both must be resolved before **Batch C (surface)** and **Batch D
(roles)**.

---

## 2. Missing Engineering Information

| # | Missing | Impact | Resolve via |
|---|---|---|---|
| M1 | **Acceptance criteria per feature (PRS-043)** | Traceability chain incomplete; QA has no objective pass/fail | Generate PRS-043 from frozen UX (recommended) **or** produce per-batch acceptance criteria as step 1 of each batch |
| M2 | **Capability → permission matrix (6 roles)** | Batch C/D cannot enforce RBAC precisely | Product Office to ratify the matrix (draft in §14 C2) |
| M3 | **Full API request/response schemas** | SAD-043 §10 gives endpoint *shapes*, not field-level schemas | Derive from PRS-043 + existing DTO conventions; contract tests |
| M4 | **Resilience component prop specs** (Deliverable C names them; behaviour in UXS P6) | Component library build needs prop/interface definitions | Engineering to author component API from P6 behaviour (no UX change) |
| M5 | **Scope boundary confirmation** — UXS-043 covers the *whole product*; APS-046 fences billing/clinical **out** of this program | Risk of building out-of-scope screens | **Clarification C3** |

---

## 3. Architecture Readiness — ✅ High (90/100)

- **Layering** (SAD-043 §2): Identity → Org → Clinic → Membership → Workspace → Session → Capabilities → Surface. Clean Architecture / DDD boundaries already present in the repo (domain / services / repositories / api).
- **The three keystone patterns already exist** (Feasibility Review): `active_healthcare_profile_id` (session acting-as), `OrganizationMember` (M2M), `effectiveCapabilities` (additive RBAC), and a single scoping choke point (`requireStaffContext`).
- **One hard change** — relax `StaffProfile` 1:1 → 1:N (Batch B). Well-understood, additive, reversible while flagged.
- No architectural rewrite required. **Ready.**

## 4. Dependency Graph

```
PRS-043 acceptance criteria ─┐ (prerequisite for QA sign-off of each batch)
Capability matrix (C2) ───────┤
                              ▼
Phase 0 (cleanup, merges to main) ──► Batch A (identity/session spine)
                                          ├─► Batch B (StaffProfile 1:1→1:N)  [keystone]
                                          │        └─► Batch C (workspace selector + resolveSurface + reconnect /doctor,/staff,/admin)
                                          └─► Batch D (multi-owner + roles + managed provisioning)   [needs C2]
Resilience Component Library (Deliverable C) ───────► parallel to A–C; required by every surface
Surface re-skin to Canonical UX (UXS-043) ──────────► after B/C (reconnect first, then re-skin)
```

- Phase 0 blocks everything. Batch A blocks B & D. Batch B blocks C. Resilience library is parallel and consumed by all. Re-skin follows reconnect.

## 5. Database Readiness — ✅ High (88/100)

- SAD-043 §9 defines the deltas: **additive** columns (`Session.active_membership_id`, `Users.must_change_password`, `Users.last_workspace_id`, `password_set_at`), **additive** indexes (`Organization_Members(user_id)`, `Staff_Profiles(user_id)`), and **one constraint relaxation** (`Staff_Profiles.user_id @unique → @index`, Batch B).
- Prisma 6 + PostgreSQL, env-driven (ADR-0006). Migrations additive; the one relaxation is reversible while no user holds two profiles (service-layer guard).
- **Assumption A1:** no production/pilot data yet → migrations are low-risk (confirm — §14).

## 6. API Readiness — ⚠ Medium-High (78/100)

- New/evolved endpoints enumerated (SAD-043 §10): `/auth/login` (evolve), `/auth/password/change|reset`, `/workspaces`, `/workspace/switch`, provisioning, `requireStaffContext`/`requireOrganizationContext` evolution.
- **Gap:** field-level schemas (M3) pending PRS-043. Existing endpoints follow a consistent `apiError/ok` convention and a centralized session layer — good foundation.
- **Every new endpoint carries a cross-tenant isolation contract test** (non-negotiable, §9).

## 7. Frontend Readiness — ⚠ Medium-High (76/100)

- **UXS-043 (6 packages) is frozen** and the interactive prototypes are the pixel/interaction reference; the **Canonical Demo World** (Deliverable A) is set.
- **Surfaces already exist** in Next.js: `/clinic`, `/doctor/*`, `/staff/*`, `/admin/*`, `/patient/*`, warm design system live in `globals.css`. Much of the work is **reconnect (APS-045) + re-skin to the frozen UX**, not greenfield.
- **To build new:** the **Resilience Component Library** (Deliverable C: `WorkspaceSwitcher`, `Toast`, `Banner`, `InlineMessage`, `Callout`, `EmptyState`, `Skeleton`, `OfflineBanner`, `ErrorState`, `PermissionState`) + the Workspace Selector + Mandatory-Password screen.
- **Constraint:** implement the frozen UX exactly (no redesign). Prototypes + UXS docs + Deliverable B glossary are the contract.

## 8. Testing Readiness — ✅ Good (82/100)

- **Framework present:** Vitest (existing `*.test.ts`, inline snapshot + contract patterns), `playwright-core` for headless browser verification (390px + 1280px).
- **Required new suites** (SAD-043 §14): isolation (CI gate — membership A cannot read clinic B), migration/backfill, auth (selector vs auto-open, mandatory reset), capability re-resolution across switch, suspended-in-A/active-in-B, regression (flag-off = byte-identical), E2E (2-clinic doctor).
- **Gap:** acceptance-criteria-driven tests need PRS-043 (M1).

## 9. Security Readiness — ✅ Strong (88/100)

- Foundation is strong: scrypt B2B creds, OTP patient, session tokens hashed (SHA-256) at rest, `is_active` gate, single scoping choke point, and the **Membership Isolation Rule (APS-044 §13a)** as a permanent invariant.
- Threat model in SAD-043 §11 (cross-tenant leak, privilege escalation on switch, session fixation, suspended-user, temp-password abuse) with mitigations.
- **Release gate:** the isolation test suite. Capabilities recomputed per request (never cached across switch). No token reissue on switch.

## 10. Performance Considerations — ✅ Good (85/100)

- Workspace resolution is O(1) over the active membership; membership lookup indexed; hospital-scale fan-out bounded and indexed (SAD-043 §13).
- Capability recompute per request = one indexed read (security-over-cache, acceptable).
- Add the two indexes in Phase 0 (dormant).

## 11. Accessibility Readiness — ⚠ Medium (74/100)

- **Baseline defined** (UXS P6 §10, WCAG 2.1 AA): keyboard, 2.5px visible focus, reduced motion, ≥44px targets, SR labels, colour independence, plus Motion Principles (§10a).
- **Gap:** per-component implementation + an audit pass. Each resilience component and screen must be built to the baseline and verified. This is a *build-and-verify* task, not a spec gap.

## 12. Deployment Readiness — ✅ Good (83/100)

- **Feature flag `FEATURE_MULTI_WORKSPACE`** (default off); phased rollout pilot → multi-clinic → GA (SAD-043 §12).
- Env-driven Postgres (ADR-0006). Zero-downtime additive migrations.
- **Known operational traps** (document in runbook): dev server holds a stale Prisma client after a migration → restart required; prod `next start` validates `SMS_PROVIDER`/`ALERT_CHANNEL` config (`src/lib/config.ts`).

---

## 13. Technical Risks

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | `StaffProfile` 1:1→1:N breaks `findUnique({user_id})` sites | **High** | Grep-gate every site; resolve via active membership; contract tests (Audit §13) |
| R2 | Cross-tenant leakage once N memberships exist | **High** | Scope from active membership only; verify ownership; isolation CI gate |
| R3 | Capability cache across switch → privilege escalation | Med | Recompute per request; never cache across switch |
| R4 | Reconnecting `/doctor`,`/staff` re-exposes stale auth (predate current hardening) | Med | Re-verify session guards on those trees before flag flip |
| R5 | Removing `memberRoleFromSpecialty` before all reads migrated | Med | Replace → migrate → delete last (Batch D) |
| R6 | Rollback of dropped `@unique` if a user gained 2 profiles | Low | Service-layer forbids 2nd profile until GA |
| **R7** | **Missing acceptance criteria (PRS-043)** — QA has no objective bar | **High (process)** | Generate PRS-043 or per-batch acceptance criteria before coding each batch |
| **R8** | **Scope creep** — UXS covers whole product; APS-046 fences billing/clinical out | Med | Confirm scope (C3); build only in-scope; UX-approved-out-of-scope screens reconnect but their logic is a separate BRD |

---

## 14. Engineering Assumptions & Clarifications Requiring Product Office Approval

Per the engineering principles, I am **not** inventing answers. These require ratification:

- **C1 — Acceptance criteria / PRS-043 (blocking for QA sign-off).** Generate PRS-043 now, or authorise per-batch acceptance criteria as step 1 of each batch? *Recommendation: generate PRS-043 for Batches A–D from the frozen UX before Batch A QA.*
- **C2 — Capability → permission matrix (blocking Batch C/D).** Ratify the exact allow/deny per role. *Draft for approval:*

  | Capability | Owner | Practice Mgr | Doctor | Receptionist | Nurse | Technician |
  |---|:--:|:--:|:--:|:--:|:--:|:--:|
  | View queue/appointments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
  | Register/manage patients | ✓ | ✓ | ✓ | ✓ | ✓ | – |
  | Consult, diagnosis, prescription (write) | ✓ | – | ✓ | – | – | – |
  | Vitals / clinical assist (write) | ✓ | – | ✓ | – | ✓ | – |
  | Lab/diagnostic results (write) | ✓ | – | ✓ | – | – | ✓ |
  | Create invoice / collect | ✓ | ✓ | ✓ | ✓ | – | – |
  | View revenue / reports | ✓ | ✓ | – | – | – | – |
  | Manage team & roles | ✓ | ✓ | – | – | – | – |
  | Change plan / org settings | ✓ (legal owner) | – | – | – | – | – |

  *This is a proposal, not a decision — Product Office must confirm before Batch D.*
- **C3 — Scope boundary.** Confirm this engineering program = **identity/workspace/surface + reconnect existing role surfaces + resilience component library**; and that **billing (P4 checkout/cash cycle), clinical EMR depth, patient booking backend** are UX-approved but implemented under **their own BRDs** (per APS-046 §3), reconnected here but not re-implemented.
- **C4 — Multi-owner exclusive powers.** Confirm which actions are **legal-owner-only** (`owner_user_id`) vs any operational owner (`OrganizationMember.role='owner'`). *Recommendation: plan change / org deletion / billing = legal owner only; everything else = operational owners.*
- **C5 — Managed provisioning delivery.** Confirm the temp-password hand-off (owner relays a shown temp password; no SMS, per ADR-003) and the mandatory-change-on-first-login flow.
- **C6 — Identity reconciliation in MVP?** Confirm it stays **deferred** (optional, Support-assisted; APS-044 §19a) and is **not** built in this program.
- **C7 — No production data assumption (A1).** Confirm pilot has not started, so additive migrations run against demo/dev data only.

---

## 15. Proposed Implementation Phases

| Phase | Contents | Gate |
|---|---|---|
| **Phase 0 — Repository Cleanup** (APS-046 §4) | Remove vestigial types; consolidate role literals → `authorization.ts`; expand role union to 6 (dormant); add dormant nullable columns + indexes; retire dead imports | Suite green; **zero functional diff**; merges to `main` |
| **Batch A — Identity/Session spine** | Activate `active_membership_id`; managed provisioning + `must_change_password`; `/auth` evolution | Flag-gated; auth tests |
| **Batch B — Membership (keystone)** | Relax `StaffProfile` 1:1→1:N; membership-scoped `requireStaffContext`; 2nd-profile guard | Isolation gate; migration tests |
| **Batch C — Workspace & Surface** | Workspace Selector + switch + `resolveSurface()`; reconnect `/doctor`,`/staff`,cockpit; re-skin to canonical UX | Needs C2; surface + isolation tests |
| **Batch D — Ownership & Roles** | Multi-owner via `OrganizationMember.role`; assign 6 roles; retire `memberRoleFromSpecialty` (last) | Needs C2/C4; RBAC tests |
| **Component Library (parallel)** | Resilience components (Deliverable C) to UXS P6 behaviour + a11y baseline | a11y audit; unit tests |
| **Phase RC — Hardening** | Perf, a11y audit, isolation gate green, docs, runbook | Sign-off checklist §18 |

> **Out of this program (separate BRDs, per APS-046 §3):** billing/checkout, EMR clinical depth, labs, notifications delivery, patient-booking backend. Their **surfaces reconnect** here; their **logic** is not re-implemented.

## 16. Recommended Implementation Order

1. **Resolve C1–C3** (acceptance criteria, capability matrix, scope) — unblocks QA + Batches C/D.
2. **Phase 0** → merge to `main`.
3. **Batch A** → **Batch B** (keystone).
4. **Batch C** (∥ **Component Library**).
5. **Batch D**.
6. **Re-skin/reconnect surfaces** to the Canonical UX.
7. **Phase RC** hardening → flag flip → pilot → GA.

## 17. Definition of Done (per phase)

Every phase is Done only when **all** hold:
- ✅ Implementation traces to UX → business rule → **acceptance criteria** (C1) → code (traceability register updated, Deliverable D).
- ✅ Matches the frozen UXS exactly (deviation audit run; deviations corrected — process step 8–10).
- ✅ Unit + integration tests green; **cross-tenant isolation CI gate green**.
- ✅ Empty / loading / offline / error / permission states present (P6 components).
- ✅ Accessibility baseline met (keyboard, focus, reduced motion, targets, SR labels, colour independence).
- ✅ Responsive verified (documented breakpoints).
- ✅ Type-safe; no `role === "..."` outside `authorization.ts`.
- ✅ Migration additive + reversible (flag off = prior behaviour); backfill verified.
- ✅ Implementation report produced; batch approved before the next begins.

## 18. Engineering Sign-off Checklist

- [ ] C1–C7 clarifications ratified by Product Office
- [ ] PRS-043 acceptance criteria available for the batch
- [ ] Capability→permission matrix (C2) ratified
- [ ] Scope boundary (C3) confirmed; no out-of-scope work scheduled
- [ ] Feature flag `FEATURE_MULTI_WORKSPACE` wired
- [ ] Isolation test suite defined as CI gate
- [ ] Rollback path verified per batch
- [ ] Runbook updated (migration → dev restart; prod config validation)
- [ ] Traceability register (Deliverable D) extended for the batch
- [ ] Deviation audit vs UXS run and clean

---

## Verdict

**Engineering can begin Phase 0 immediately** — it is non-functional, low-risk, and unblocked. The
platform is well-specified and the codebase already leans the right way. **Before Batches C–D**,
Product Office must ratify **C1 (acceptance criteria/PRS-043)** and **C2 (capability matrix)**, and
confirm **C3 (scope boundary)** so we build the frozen product and nothing beyond it.

No code has been written. Awaiting approval of this assessment and the C1–C7 clarifications.
