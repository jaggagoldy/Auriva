# APS-044 — Technical Feasibility Review

**Reviewer role:** Principal Software Architect / Staff Backend Engineer / Security Architect / Platform + Database Architect
**Subject:** [APS-044 — Auriva Identity & Workspace Platform](./APS-044_Auriva_Identity_and_Workspace_Platform.md) (Product Office Frozen)
**Date:** 2026-07-14
**Mandate:** Validate whether APS-044 can be implemented safely inside the existing architecture. Do NOT redesign the product. Where something is hard, propose an engineering solution — not a scope change.

**Recommendation legend:** 🔴 REQUIRED · 🟡 RECOMMENDED · 🟢 OPTIONAL · 🔵 FUTURE

> **RATIFIED 2026-07-14.** Product Office accepted this review with no architectural change. The two
> governance decisions in §16 are now closed: (1) the 3-role set is reopened **only** to add Practice
> Manager / Nurse / Technician (six professional roles total, locked); (2) multi-owner = legal owner
> (`owner_user_id`) vs operational owners (`OrganizationMember.role='owner'`), both retained. A new
> permanent invariant — the **Membership Isolation Rule** — was added to the spec (§13a). Next Product
> Office decision is the **Surface Model** (carried by the Pre-RC remediation doc), not APS-044.

---

## 1. Executive Summary

**Verdict: APPROVED for engineering implementation.** APS-044 can be built inside the existing
architecture **additively, phased, and behind feature flags**, with **no Product Office decision
requiring reversal on technical grounds.** There is no technical impossibility, no severe
scalability wall, no unavoidable security vulnerability, and no regulatory conflict.

The reassuring core finding: **APS-044 asks the platform to _promote three patterns it already has_,
not to invent new architecture.**

| APS-044 requirement | Pattern that already exists | File |
|---|---|---|
| One credential → many workspaces, session picks one, never trust client | `Session.active_healthcare_profile_id` + `AccountProfileLink` (patient side does exactly this today) | [session.ts:163](../src/api/session.ts#L163), [schema.prisma:525](../prisma/schema.prisma#L525) |
| Individual ↔ many organizations (multi-membership) | `OrganizationMember` M2M join (`@@unique([organization_id, user_id])`) | [schema.prisma:111](../prisma/schema.prisma#L111) |
| Capability-based (not hardcoded) permissions | `WORKSPACE_CAPABILITIES` + `effectiveCapabilities()` additive grant model | [authorization.ts:91](../src/domain/authorization.ts#L91) |
| Cross-tenant isolation at a single choke point | `requireStaffContext()` already resolves clinic scope server-side, ignores client `clinic_id` | [session.ts:201](../src/api/session.ts#L201) |
| Identity never blocks onboarding | `Contact.value` non-unique, `PatientProfile.user_id` nullable, `health_id` advisory | [schema.prisma:505](../prisma/schema.prisma#L505) |

**The one genuinely hard change** is a single 1:1 assumption: a professional's working existence is
modelled as `User —1:1→ StaffProfile —(single clinic_id)→ Clinic`, enforced by
`StaffProfile.user_id @unique` ([schema.prisma:327](../prisma/schema.prisma#L327)). APS-044's edge
case "**Doctor works in multiple clinics**" and principle **P6 "one credential, many workspaces"**
cannot be represented until that 1:1 is relaxed to 1:N. This is the largest and riskiest work item —
but it is **additive** (drop a `@unique`, add membership-scoped session resolution) and the blast
radius is concentrated at **one already-centralized choke point**, which is precisely what makes it
safe.

**Two governance flags (not technical blockers):**
1. Role expansion (Nurse, Technician, Practice Manager) reopens BRD-043's *frozen closed 3-role set*. Conscious Product Office reopening required — the engineering is trivially additive.
2. `Organization.owner_user_id` is a single FK; APS-044 wants multiple owners. Additive fix (read ownership from `OrganizationMember.role='owner'`, keep the column as the legal/billing anchor).

---

## 2. Architecture Assessment

### 2.1 Current authentication & session
- **Two separate credential flows already exist** (satisfies P: separate Patient/Staff login): staff = scrypt password ([login/route.ts](../src/app/api/auth/login/route.ts)); patient = OTP ([otp](../src/app/api/auth/otp)). ✅ Aligned with §9.
- Session = opaque random 32-byte token, **SHA-256 hashed at rest**, 12h TTL, one row per login ([session.ts:38](../src/api/session.ts#L38)). Sound; no session-fixation exposure.
- Session **already carries an "acting-as" pointer** (`active_healthcare_profile_id`) resolved server-side and *never trusted from client* ([session.ts:163](../src/api/session.ts#L163)). This is the exact mechanism the Workspace Selector needs — for staff it just needs a sibling `active_membership_id`.

### 2.2 Authorization / RBAC
- **Fully centralized** in [authorization.ts](../src/domain/authorization.ts) — the module comment mandates "no `role === '...'` literals anywhere else." This single-file discipline is the reason role expansion is low-risk.
- Roles today are a closed union: `patient | super_admin | doctor | receptionist`. `super_admin` = "owns a customer Organization" (NOT platform staff — that's the separate `is_platform_admin` flag).
- Capability layer already additive and server-resolved (`effectiveCapabilities = role defaults ∪ StaffProfile grants`). ✅ Directly satisfies §11 "capability-based, not hardcoded" — it just needs more roles feeding the default map.

### 2.3 Tenancy model
- Every operational table is clinic-scoped (`clinic_id`) under a real `Organization` parent (`organization_id`). Isolation is enforced by deriving scope from the caller's own profile, not from client input ([session.ts:210-233](../src/api/session.ts#L210)). ✅ Strong foundation for P7.
- **Gap:** isolation currently assumes *one* profile per user. Under multi-membership, scope must derive from the *active membership* and verify the caller holds it. Same choke point, richer resolution.

### 2.4 Organization & clinic hierarchy
- `Organization —1:N→ Clinic —1:N→ StaffProfile` is real (OPS-001). Departments exist. ✅ Supports §7 (org contains solo/network/hospital) with no structural change.

**Assessment verdict:** Architecture is **compatible**; APS-044 requires *extension*, not *redesign*.

---

## 3. Database Impact

### 3.1 New columns (all additive, nullable/defaulted — zero destructive)

| Table | Column | Purpose | 🔴/🟡 |
|---|---|---|---|
| `Session` | `active_membership_id String?` | staff twin of `active_healthcare_profile_id` — which workspace the session is acting in | 🔴 |
| `Users` | `last_workspace_id String?` | "Remember Last Workspace" (§10) | 🟡 |
| `Users` | `must_change_password Boolean @default(false)` | mandatory password change after temp-password provisioning (§9) | 🔴 |
| `Users` | `password_set_at DateTime?` | temp-password expiry / rotation audit | 🟢 |
| `Staff_Profiles` | (see 3.3) | — | — |

### 3.2 New indexes (performance — §6 of the workshop)

| Index | Reason | 🔴/🟡 |
|---|---|---|
| `Organization_Members @@index([user_id])` | Workspace Selector lists "my memberships" by `user_id`; the existing `@@unique([organization_id, user_id])` is not usable for a `user_id`-only lookup | 🔴 |
| `Staff_Profiles @@index([user_id])` | replaces the `@unique` when it becomes 1:N (see 3.3); keeps membership lookup indexed | 🔴 |
| `Session @@index([user_id, expires_at])` | already used by `listSessionsForUser`; cheap safety index | 🟢 |

### 3.3 The one structural change — relax `StaffProfile` 1:1 → 1:N

**Today:** `Staff_Profiles.user_id String @unique` ([schema.prisma:327](../prisma/schema.prisma#L327)) —
a person can hold exactly one staff profile, in exactly one clinic. `StaffProfile` already carries
the membership-scoped attributes APS-044 §8 assigns to Membership: `clinic_id`, `specialty` (role
signal), `consultation_fee`, `follow_up_fee`, `availability`, `membership_status`, `capabilities`,
`department_id`. **StaffProfile is, in effect, already the Membership record — for one clinic.**

**Change:** drop the `@unique` on `user_id`, replace with a plain `@index`. This lets one identity
hold N StaffProfiles (= N memberships, one per clinic) with independent fee/schedule/status —
satisfying "Doctor works in multiple clinics", per-membership suspension, and P1 verbatim, **without
a new table.**

- **Migration risk:** LOW at rest (no existing user has 2 profiles, so behavior is inert until multi-membership is used), but **HIGH in code**: every `prisma.staffProfile.findUnique({ where: { user_id } })` (notably [session.ts:215](../src/api/session.ts#L215), [session.ts:274](../src/api/session.ts#L274), [session.ts:328](../src/api/session.ts#L328)) becomes ambiguous and must resolve *the profile for the session's active membership*. This is the primary refactor of the whole initiative.
- **Alternative considered & rejected:** introduce a separate `Membership` table and demote `StaffProfile` to per-membership clinical config. More "textbook", but doubles the write surface, requires a full backfill, and duplicates fields `StaffProfile` already owns. Promoting `StaffProfile` in place is lower-risk and matches how the codebase already treats it. **Recommend in-place promotion.**

### 3.4 Multi-owner
`Organizations.owner_user_id` is a single FK ([schema.prisma:93](../prisma/schema.prisma#L93)) and
`requireOrganizationContext` checks `owner_user_id === session.userId`
([session.ts:377](../src/api/session.ts#L377)). Keep the column (billing/legal anchor per §7), but
move *ownership checks* to read `OrganizationMember.role='owner'` — the join already supports N
owners with zero schema change. 🔴

### 3.5 Backward compatibility & rollback
- All column additions are nullable/defaulted → existing rows behave identically; backfill of `Session.active_membership_id` is trivial (each user has ≤1 membership today).
- **Rollback:** feature flags off ⇒ single-membership behavior. The only non-trivial reversal is re-adding `@unique` on `user_id`; safe **as long as the service layer forbids a 2nd profile until GA** (enforce in `onboarding-service`). 🔴

**No destructive change is required anywhere.** ✅

---

## 4. Authentication Impact

| Area | Current | APS-044 delta | Risk |
|---|---|---|---|
| Patient login | OTP, separate | unchanged | none |
| Staff login | scrypt password ([login/route.ts:67](../src/app/api/auth/login/route.ts#L67)), `is_active` gate | unchanged credential check; **after** auth, branch to Workspace Selector when >1 membership | LOW |
| Workspace Selector | **does not exist** | new post-login screen listing active memberships; auto-open when exactly 1 | MED |
| Multi-membership login | not representable | reads `OrganizationMember` for the user | LOW |
| Session switching | patient profile switch exists ([session.ts:163](../src/api/session.ts#L163)); staff has none | add `setActiveMembership(sessionId, membershipId)` mirroring `setActiveHealthcareProfile`, **after verifying the account holds that membership** | MED |
| Remember last workspace | none | write `Users.last_workspace_id` on switch | LOW |
| Temp password / mandatory change | `password_hash` exists; no forced-change | add `must_change_password`; provisioning sets a temp hash + flag; middleware forces reset before any workspace loads | MED |
| Password reset | — | standard token flow (additive) | LOW |
| Identity creation / reconciliation | reconciliation is advisory and non-blocking by design ([schema.prisma:505](../prisma/schema.prisma#L505)) | **nothing to build to preserve P5** — simply do not add a blocking unique constraint on `Contact.value` | none |

**Security note (session fixation):** do **not** reissue the session token on workspace switch — the
token is not the trust boundary; the server-resolved `active_membership_id` is. Re-resolve
capabilities on every request from the active membership; never cache capabilities across a switch
(privilege-escalation guard).

---

## 5. Authorization Impact

- **Role model:** extend `UserRole` and `defaultCapabilitiesForRole()` ([authorization.ts:101](../src/domain/authorization.ts#L101)) to add `practice_manager`, `nurse`, `technician`. Keep the *stored* owner role as `super_admin` — "Owner" is a **display label**; renaming the stored value has a large blast radius across sessions/audit/tests for no functional gain. 🟡
- **Caretaker** ≈ already exists as patient-side family sharing (`AccountProfileLink`) — map it there, do not mint a staff role for it. 🟡
- **Capability inheritance:** already `defaults ∪ grants`. Practice Manager = doctor/reception capabilities minus clinical write, expressible as a default set + grants. No new mechanism. ✅
- **Per-membership permissions:** capabilities move from "the user's one StaffProfile" to "the active membership's StaffProfile" — same `effectiveCapabilities` call, resolved per active membership. 🔴
- **Governance:** this **reopens BRD-043's frozen closed 3-role set.** Requires explicit Product Office reopening (recorded), not an engineering decision. 🔴 (governance, not technical)

---

## 6. API Impact

| Endpoint | Change | 🔴/🟡 |
|---|---|---|
| `POST /api/auth/login` | on success, return membership list; client routes to selector if >1 | 🔴 |
| `GET /api/workspaces` (new) | list caller's active memberships for the selector | 🔴 |
| `POST /api/workspace/switch` (new) | set `active_membership_id` after verifying ownership; update `last_workspace_id` | 🔴 |
| `requireStaffContext` | resolve clinic from **active membership**, not "the" profile; verify membership belongs to caller and is `active` **for that clinic** | 🔴 |
| `requireOrganizationContext` | ownership via `OrganizationMember.role='owner'` (multi-owner) | 🔴 |
| `POST /api/auth/password/change` (new) | mandatory-change flow | 🔴 |
| Provisioning (`onboarding-service`) | issue temp password + `must_change_password=true`; until GA, forbid a 2nd StaffProfile per user (rollback guard) | 🔴 |

**Contract-test the isolation property** (as Sprint 3 did for financial exclusion): a request in
membership A must be structurally unable to read clinic B — verified by test, not by review.

---

## 7. Frontend Impact

- **New:** Workspace Selector screen (post-login, >1 membership); workspace switcher control in the staff shell; mandatory-password-change screen.
- **Reuse:** the patient Family Profile Switcher is the same interaction — lift its UX for staff. Auto-open when exactly one membership (§10) keeps the solo experience unchanged (no selector for solo owners). 🟡
- **Routing:** `defaultWorkspacePathForRole` ([authorization.ts:147](../src/domain/authorization.ts#L147)) currently sends everyone to `/clinic`. Under APS-044 the landing becomes membership-driven; this intersects the surface-model question from the pre-RC remediation (`/clinic` solo vs `/doctor`+`/staff` multi-person). Resolve them together. 🟡

---

## 8. Migration Strategy

Additive, phased, feature-flagged (`FEATURE_MULTI_WORKSPACE`). Prisma `migrate` per ADR-0006.

| Phase | Contents | Reversible? |
|---|---|---|
| **0** | Ratify APS-044 + this review | — |
| **1** | Additive columns (`Session.active_membership_id`, `Users.last_workspace_id`, `Users.must_change_password`, `password_set_at`) + new indexes. Backfill `active_membership_id` from each user's single membership. No behavior change. | Yes (drop columns) |
| **2** | Drop `Staff_Profiles.user_id @unique` → `@index`. Service layer forbids a 2nd profile until GA. Inert until Phase 4. | Yes (re-add unique — safe while no user has 2 profiles) |
| **3** | Membership-scoped resolution in `requireStaffContext` / capability resolution, behind flag. | Yes (flag off) |
| **4** | Workspace Selector + switch endpoint + UI; GA multi-membership; lift the 2nd-profile ban. | Flag off = single-membership |
| **5** | Multi-owner checks; RBAC role expansion (gated on freeze reopening); mandatory password change. | Additive |

**Migration order rule:** schema (1) → relax constraint (2) → server resolution (3) → UI (4) →
governance-gated extensions (5). Never ship UI ahead of server-side isolation.

---

## 9. Implementation Phases (engineering batches)

- **Batch A — Identity/Session spine:** columns + indexes + `active_membership_id` plumbing (Phase 1). No user-visible change.
- **Batch B — Multi-membership resolution:** relax 1:1, refactor `requireStaffContext` + capability resolution to membership scope, flag-gated (Phases 2–3). **The critical-path batch.**
- **Batch C — Workspace Selector + switch:** endpoints + UI + remember-last (Phase 4).
- **Batch D — Multi-owner + RBAC expansion + temp-password/mandatory-change** (Phase 5, governance-gated).

**Dependencies:** B depends on A; C depends on B; D independent of C but depends on A. RBAC expansion
in D is blocked on Product Office reopening the 3-role freeze.

---

## 10. Engineering Risks

| # | Risk | Level | Problem | Impact | Recommendation | Alternative |
|---|---|---|---|---|---|---|
| R1 | Relaxing `StaffProfile` 1:1 | 🔴 HIGH | ~all `findUnique({user_id})` become ambiguous | cross-clinic data resolution errors if missed | centralize resolution in `requireStaffContext`; grep-gate every `staffProfile.findUnique`; contract tests | separate `Membership` table (higher cost, rejected) |
| R2 | Cross-tenant leakage on switch | 🔴 HIGH | wrong `active_membership_id` trusted from client | tenant breach (violates P7) | server-verify membership ownership on every switch AND every request; never trust client `clinic_id` (already the convention) | — |
| R3 | Stale capability cache across switch | 🟡 MED | privilege escalation | user retains Clinic A rights in Clinic B | re-resolve capabilities per request from active membership | — |
| R4 | Suspension bleed across clinics | 🟡 MED | one `membership_status` misread as global | violates "suspend in A ≠ B" | keep status per StaffProfile (already per-clinic); test A-suspended/B-active | — |
| R5 | RBAC freeze reopening | 🟡 MED (governance) | reopens BRD-043 frozen set | scope/process | explicit Product Office decision recorded before Batch D | hold roles; ship 3-role model first |
| R6 | Workspace-selector performance at hospital scale | 🟢 LOW | "my memberships" query | slow selector | `@@index([user_id])` on `Organization_Members`; bounded by per-person membership count (small) | cache in `last_workspace_id` |
| R7 | Rollback of dropped `@unique` | 🟢 LOW | can't re-add if a user has 2 profiles | blocked rollback | forbid 2nd profile at service layer until GA | — |

---

## 11. Testing Strategy

- **Migration tests:** additive columns backfill correctly; `active_membership_id` populated for every existing user; re-adding `@unique` succeeds while no user has 2 profiles.
- **Authorization/isolation (contract tests, CI gate):** membership A cannot read clinic B; client-supplied `clinic_id`/`membership_id` mismatching the session is rejected 403, not silently narrowed (mirrors existing SEC-1 pattern in [session.ts:302](../src/api/session.ts#L302)).
- **Authentication tests:** single-membership auto-opens (no selector); multi-membership routes to selector; switch requires ownership; mandatory password change blocks all workspaces until reset.
- **Security tests:** capability re-resolution across switch (no escalation); suspended-in-A/active-in-B; archived membership denied at boundary ([session.ts:225](../src/api/session.ts#L225)) per-clinic.
- **Regression:** every solo/single-membership flow byte-identical with flag off (protects the frozen solo UX).
- **Performance:** selector + membership lookup with N memberships; hospital-scale `OrganizationMember` fan-out with the new index.
- **E2E:** doctor with 2 clinic memberships books/consults in each, data never crosses.

---

## 12. Deployment Strategy

Ship behind `FEATURE_MULTI_WORKSPACE` (default off). Phase 1 columns deploy silently. Enable per-org
(pilot a friendly multi-clinic org) before global. Restart dev/app server after each migration
(known stale-Prisma-client 500 trap — see BRD-043 notes). No big-bang cutover.

---

## 13. Rollback Strategy

- Flags off ⇒ single-membership behavior, no data loss (all additions nullable).
- Only sensitive reversal: `@unique` on `StaffProfile.user_id`. Guard by forbidding a 2nd profile at the service layer until GA, so rollback stays safe at all times.
- Sessions: no token-format change, so no forced logout on rollback.

---

## 14. Technical Debt

- **Pre-existing, now relevant:** `memberRoleFromSpecialty` heuristic is deprecated ([organization.ts:155](../src/domain/organization.ts#L155)) — role should read from the membership row. APS-044's membership work is the natural moment to finish removing the heuristic.
- **New debt if we cut corners:** if capability resolution is not centralized per active membership, every new endpoint risks re-introducing a `role === "..."` check. Enforce the "authorization.ts only" rule in review.
- **Deferred cleanly (not debt):** `Organization.owner_user_id` retained intentionally as billing anchor even after multi-owner — document, don't delete.

---

## 15. Recommendations

- 🔴 Promote `StaffProfile` to 1:N in place (drop `@unique`, add index); do **not** build a parallel `Membership` table.
- 🔴 Add `Session.active_membership_id`; resolve all staff scope from it; never trust client.
- 🔴 Route multi-owner checks through `OrganizationMember.role='owner'`; keep `owner_user_id` as anchor.
- 🔴 Feature-flag the whole initiative; ship server isolation before any UI.
- 🔴 Contract-test cross-tenant isolation as a CI gate.
- 🟡 Keep stored owner role as `super_admin`; "Owner" is display-only.
- 🟡 Map Caretaker onto existing `AccountProfileLink` family sharing, not a new staff role.
- 🟡 Resolve landing/surface model jointly with the pre-RC remediation surface decision.
- 🟢 Add `password_set_at` for temp-password rotation auditing.
- 🔵 Professional Community / Recruitment (§17) remain out of scope and trip AGENTS.md red flags — separate Architecture Review when proposed.

---

## 16. Final Verdict

**APS-044 can be implemented within the existing Auriva architecture without compromising quality,
security, scalability, maintainability, or future product evolution — additively, phased, and
feature-flagged.**

No Product Office decision requires reconsideration on grounds of technical impossibility,
scalability, security, regulation, or performance. The specification is, in fact, unusually
well-aligned to the codebase: it formalizes patterns (`active_healthcare_profile_id`,
`OrganizationMember`, capability grants, single-choke-point scoping) the platform already runs.

**Two items require a Product Office _decision_ (not a redesign) before their batch begins:**
1. **Reopen the BRD-043 frozen 3-role set** to admit Practice Manager / Nurse / Technician (Batch D). Governance, not engineering.
2. **Confirm multi-owner semantics** — `owner_user_id` remains the legal/billing anchor while `OrganizationMember.role='owner'` grants operational ownership. Confirm this is the intended model.

**One engineering reality to acknowledge in the plan:** "one credential, many workspaces" (P6) is not
free — it requires relaxing the `StaffProfile` 1:1 and re-scoping the auth choke point. It is the
single largest work item, but it is additive, reversible while flagged, and concentrated at one
already-centralized function. That is the difference between "hard" and "risky" — this is hard, not
risky.

**APS-044 is APPROVED for engineering implementation**, subject to the two governance decisions above
and the phased/flagged migration plan in §8.
