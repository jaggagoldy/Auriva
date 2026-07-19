# Auriva Platform Realignment Audit — Pre-Implementation Cleanup

**Type:** Engineering Architecture Audit (read-only — no code, no migrations, no commits)
**Target architecture:** [APS-044 Identity & Workspace Platform](./APS-044_Auriva_Identity_and_Workspace_Platform.md) + [APS-045 Experience Platform (Surface Model)](./APS-045_Auriva_Experience_Platform_Surface_Model.md)
**Date:** 2026-07-14
**Stance:** *Small clean platform > large backward-compatible platform.* Remove obsolete architecture now; do not carry compatibility layers "just in case."

**Classification legend:** **A** = Keep as-is · **B** = Refactor (correct, old assumptions) · **C** = Remove (obsolete) · **D** = Defer (unrelated to APS-044/045)

---

## 1. Executive Summary

The platform is **well-positioned** for APS-044/045. The audit's headline is not "there is a lot to
tear out" — it is the opposite: **this codebase is disciplined and lean, and three of the hardest
APS-044 patterns already exist in embryonic, correct form.** The realignment is a *small number of
concentrated refactors at known seams*, not an excavation.

**What already aligns (Category A — reassuring):**
- **Identity resolution is already multi-profile-aware.** [identity-service.ts](../src/services/identity-service.ts) never merges, never auto-picks, resolves one phone → *many* profiles — exactly APS-044's "identity never blocks onboarding / reconciliation optional."
- **Doctor resolution is already multi-membership-aware.** [doctor-resolution.ts](../src/services/doctor-resolution.ts) scopes by `(user_id, clinic_id)` and *refuses to guess* among multiple doctors — it does **not** assume one doctor per clinic.
- **Capability framework is live.** [authorization.ts](../src/domain/authorization.ts) `effectiveCapabilities = role defaults ∪ grants`, written by `grantStaffCapabilities` — APS-045's `resolveSurface()` plugs straight into it.
- **The patient session already carries an "acting-as" pointer** (`active_healthcare_profile_id`) resolved server-side — the exact template for the staff `active_membership_id`.
- **Single auth choke point** ([session.ts](../src/api/session.ts)) — the refactor surface is centralized, not scattered.

**What must change (Category B — concentrated):**
1. **`StaffProfile.user_id @unique`** — the one true 1:1 blocker. Two lookups (`organization-service.ts:146`, `session.ts:215/274/328`) assume "the" profile.
2. **`Session`** — single denormalized `role`, no active membership.
3. **`defaultWorkspacePathForRole`** — "everyone → `/clinic`" contradicts APS-045; must become `resolveSurface()`.
4. **`memberRoleFromSpecialty`** — already `@deprecated`, still load-bearing as a fallback in ~7 sites; sequence it to removal.

**What to actually remove (Category C — honestly short):** very little. The biggest "removals" are
**deferred DB column cleanups that are not yet safe** (legacy `prescription_*` columns are still on
the read path). A responsible audit does not invent deletions — see §12.

**Out of scope for this realignment (Category D):** invoice-centric billing, clinical models
(prescriptions/labs/diagnostics), Release Management (APS-036), marketing. These are real future work
but **not** identity/workspace concerns — folding them in here would be scope creep.

---

## 2. Overall Readiness Score

**78 / 100 — "B+ : Evolve, don't excavate."**

| Dimension | Score | Note |
|---|---|---|
| Identity foundation | 92 | Already multi-profile; near-perfect fit |
| Capability/RBAC framework | 85 | Additive model exists; needs role-set expansion + capability-driven surface |
| Session management | 70 | Solid primitive; needs `active_membership_id` + drop role denormalization reliance |
| StaffProfile / membership model | 55 | The 1:1 is the single biggest gap; but StaffProfile *is* already the membership record |
| Routing / surface model | 50 | "everyone → /clinic" is a known regression to undo; surfaces exist to reconnect |
| Dead-code / legacy burden | 88 | Genuinely lean; little to delete |
| Cross-tenant isolation | 90 | Server-side scoping discipline already strong |

The low scores are **localized and named**, not systemic. There is no architectural rot — there is
one 1:1 assumption and one routing decision to reverse.

---

## 3. Backend Architecture Audit

| Area | Category | Finding |
|---|---|---|
| Auth foundation (scrypt, OTP, rate-limit, session tokens) | **A** | Aligned; no change |
| Capability framework (`authorization.ts`) | **B** | Expand role set to 6 (APS-044 §11); add `resolveSurface()` (APS-045); keep the additive model |
| Organization hierarchy (Org → Clinic → Dept) | **A** | Real parent exists (OPS-001); supports hospital/network |
| Audit logging (`AuditLog`, `lib/audit.ts`) | **A** | Aligned; `lib/audit.ts:59` has one `role === "super_admin"` branch → route through authorization.ts (B, cosmetic) |
| Event platform (`EventLog`/`EventHandlerLog`) | **A** | Aligned; tenant-scoped by design |
| Notification infra (`Notification`, notification-service) | **A** | Aligned; patient projection over event bus |
| Storage / uploads (`services/storage`) | **A** | Opaque-handle abstraction; fine |
| Reception/queue services | **B** | `reception-service.ts:111` uses `memberRoleFromSpecialty` fallback — sequence off it |
| Doctor resolution | **A/B** | Already multi-membership-aware; only needs `active_membership` context when caller has >1 profile |

---

## 4. Database Audit

**No migrations here — classification only.** Legend: KEEP / MODIFY / REMOVE / FUTURE.

| Table | Verdict | Rationale (APS-044/045 lens) |
|---|---|---|
| `Users` | **MODIFY** | Add `must_change_password`, `last_workspace_id` (APS-044 §9/§10). `role` becomes *less* authoritative (membership role wins) but stays as account-level default. |
| `Organizations` | **KEEP** | `owner_user_id` stays the **legal owner** anchor (APS-044 §19a). No change needed to the column. |
| `Organization_Members` | **MODIFY** | Becomes the **operational-owner** source (`role='owner'`, multi-owner) and the Workspace Selector's membership list. **Needs `@@index([user_id])`** (selector queries by user). |
| `Sessions` | **MODIFY** | Add `active_membership_id` (staff twin of `active_healthcare_profile_id`). Single `role` denormalization is insufficient under multi-membership. |
| `Staff_Profiles` | **MODIFY** | **The keystone.** Drop `user_id @unique` → plain `@index` (1:1 → 1:N). It already holds membership-scoped attributes (clinic_id, specialty, fee, availability, membership_status, capabilities) → it *is* the Membership record (APS-044 §19a). |
| `Clinics` | **KEEP** | Operational tenant root; aligned. |
| `Departments` | **KEEP** (FUTURE-leaning) | Org structure; fine for hospital archetype. |
| `Doctor_Availability` / `Doctor_Time_Blocks` | **KEEP** | Already keyed to `StaffProfile` (→ per-membership once 1:N lands). Honors Isolation Rule automatically. |
| `Audit_Logs` | **KEEP** | Category A. |
| `Patient_Profiles` | **KEEP** | Health Vault + identity envelope (`health_id`, `verification_level`) — APS-044 P3 aligned. |
| `Contacts` | **KEEP** | **Non-unique `value` is a feature**, not a bug — enables family sharing + "identity never blocks" (P5). Do **not** add a unique constraint. |
| `Account_Profile_Links` | **KEEP** | The reference pattern APS-044 emulates for staff memberships. |
| `Appointments` | **MODIFY (deferred)** | Legacy `prescription_*` columns are obsolete post-APS-043 but **still on the read path** (see §12) — cleanup is a *clinical* BRD, not APS-044. `follow_up_source_appointment_id` etc. all fine. |
| `Invitations` | **MODIFY** | Phone-first path is APS-044-aligned. Dual email/phone: the legacy email `/admin` path is a retire-candidate (B, §13). |
| `Prescriptions` / `Test_Recommendations` / `Clinical_Templates` / `Lab_Orders` | **DEFER (D)** | Clinical domain; unrelated to identity/workspace. |
| `Invoices` / `Payments` | **DEFER (D)** | `Invoice.appointment_id @unique` = invoice-centric; the "Encounter Ledger" question is a **billing BRD**, explicitly not APS-044/045. Flagged, not actioned here. |
| `Appointment_Events` | **KEEP** (FUTURE-merge) | Schema already notes eventual merge with platform audit; no action now. |
| `Event_Logs` / `Event_Handler_Logs` | **KEEP** | Category A event platform. |
| `Releases` / `Release_Highlights` / `Release_Views` / `Sprints` | **DEFER (D)** | APS-036 Release Management; deliberately un-tenant-scoped; unrelated. |
| `Notifications` | **KEEP** | Category A. |
| `Otp_Challenges` | **KEEP** | Category A auth. |

**Obsolete columns:** `Appointments.prescription_notes`, `Appointments.prescription_medicines_json`,
`Appointments.follow_up_date`, `Appointments.diagnosis`/`chief_complaint`/`history_notes`/`vitals_json`
(JSON-blob clinical fields superseded by `Prescription`/`Consultation` extraction) — **obsolete but not
safe to drop** (read path still active). No obsolete FKs or unused enums found (enums are string-typed
+ centralized in `src/domain/*-status.ts`, all in use).

---

## 5. API Audit

Scoped to identity/workspace-relevant endpoints; clinical/billing/marketing endpoints = **Defer (D)**.

| Endpoint(s) | Verdict | Why |
|---|---|---|
| `POST /api/auth/login` | **Refactor** | On success must return membership list + route to Workspace Selector when >1 (APS-045 §7). |
| `POST /api/auth/logout`, `otp/send`, `otp/verify` | **Keep** | Aligned. |
| `POST /api/auth/switch-profile` | **Keep / Extend** | Patient profile switch — the model for a future staff `workspace/switch`; comment already flags the "legacy direct owner pointer." |
| `/api/clinic/dashboard`, `/clinic/today`, `/clinic/overview` | **Refactor** | Feed the *consolidated solo* surface; under APS-045 the multi-person surfaces read from `/doctor` + `/staff` equivalents. Keep for solo; ensure they don't become the universal path. |
| `/api/organizations/[id]/invitations*` | **Refactor** | Phone-first aligned; retire the legacy email branch (§13). |
| `/api/organizations/[id]/staff/[staffId]`, `/clinic/team*` | **Refactor** | Team lifecycle is APS-044-aligned; membership status must become **per-clinic** (Isolation Rule) once 1:N lands — already is, since status lives on the per-clinic StaffProfile. |
| `/api/admin/plan`, `/clinic/plan*` | **Keep** | Plan model aligned (subscription domain). |
| `/api/reception/*`, `/api/doctors/*`, `/api/clinics/*` | **Keep** | Operational; scoped via `requireStaffContext`. `doctors/route.ts:47` uses `memberRoleFromSpecialty` fallback → sequence off (B). |
| `/api/releases/*`, `/api/sprints/*` | **Defer (D)** | APS-036. |
| `/api/billing/*`, `/api/lab-orders/*`, `/api/patient/recommendations/*` | **Defer (D)** | Billing/clinical. |
| `/api/demo/*` | **Keep** | Demo Mode (`is_demo`); useful for pilots. |

**No dead/unreachable endpoints found.** Every `route.ts` maps to a live surface or job.

---

## 6. Service Audit

| Service | Verdict | Note |
|---|---|---|
| `identity-service.ts` | **A** | Multi-profile-aware; reusable verbatim by APS-044. |
| `doctor-resolution.ts` | **A/B** | Multi-doctor-aware; add active-membership disambiguation for callers with >1 profile. |
| `onboarding-service.ts` | **B** | Invitation + `grantStaffCapabilities` are APS-044 spine. Retire legacy email invite branch (`:498`, `:518`); `seatUsage` (`:244`) uses `role === "doctor"` string — fine, but read from membership. |
| `organization-service.ts` | **B** | `:146` `staffProfile.findUnique({ user_id })` = **1:1 assumption** → must resolve *a specific membership*. `:38/:40` `memberRoleFromSpecialty` fallback → sequence off. |
| `dashboard-service.ts` | **B** | Role names `managing_doctor`/`practice_owner`/`doctor`/`receptionist` partly overlap APS-045 surfaces; `:53` already scopes by `(user_id, clinic_id)` (good). Re-express via `resolveSurface()`. |
| `clinic-workspace-service.ts` | **B** | `:193` scopes by `(user_id, clinic_id)` — already membership-safe; minor. |
| `reception-service.ts` | **B** | `:111` `memberRoleFromSpecialty` fallback → sequence off. |
| `membership-service.ts` | **A/B** | Team lifecycle (suspend/reactivate/archive) already atomic + idempotent; extend to guarantee **per-clinic** isolation (Isolation Rule) — already structurally true. |
| `subscription-service.ts` | **A** | Plan read-only + admin-only mutation; aligned. |
| `command-center-service.ts`, `department-service.ts`, `event-log-service.ts`, `notification-service.ts` | **A** | Aligned / Category A infra. |
| `appointment-reminder-service.ts` | **A (D-adjacent)** | Wired via `instrumentation.ts` event sweep; alive, not dead. Unrelated to APS-044. |
| Clinical/billing services (`billing-`, `lab-`, `consultation-`, `test-recommendation-`, `clinical-template-`, `timeline-`) | **D** | Defer. `consultation-service.ts` writes legacy `prescription_*` columns — clinical debt, §12. |
| `release-service.ts`, `sprint-service.ts` | **D** | APS-036. |

**Duplicate logic:** the specialty→role heuristic is the one duplicated concept (7 call sites via
`memberRoleFromSpecialty`). Consolidating onto `OrganizationMember.role` removes the duplication.

---

## 7. Authentication Audit

| Item | Verdict | Note |
|---|---|---|
| scrypt staff password + OTP patient | **A** | Separate worlds (APS-044 §9) already true. |
| Session token (random, SHA-256 at rest, 12h, rotated per login) | **A** | Sound; no session-fixation exposure. |
| `is_active` login gate | **A** | Correct; keep. |
| Temp password / mandatory change | **B (add)** | No `must_change_password` today — APS-044 managed provisioning needs it. |
| `resolveOrganizationIdForStaffUser` at login (`lib/audit.ts`) | **B** | Assumes single org; fine for audit tag, but revisit under multi-membership. |

---

## 8. Authorization Audit

| Assumption | Location | Verdict |
|---|---|---|
| Hardcoded `role === "super_admin"` | `lib/audit.ts:59` | **B** — route through `authorization.ts` |
| Dashboard role strings (`managing_doctor`, `practice_owner`) | `clinic/page.tsx:197`, `dashboard-view.tsx:118-121` | **B** — derive from capabilities/surface, not string equality |
| UI role branching (`role === "doctor"`) | `invite-dialog.tsx`, `team-panel.tsx`, `staff-table.tsx` | **B (cosmetic)** — presentational; low risk, tidy toward capability |
| `memberRoleFromSpecialty` heuristic | 7 sites | **B → C** — deprecated; sequence to removal once membership role authoritative |
| Closed role union `patient\|super_admin\|doctor\|receptionist` | `authorization.ts:13` | **B** — expand to 6 professional roles (APS-044 §11); keep `super_admin` stored value ("Owner" = display) |
| Capability set (`WORKSPACE_CAPABILITIES`) | `authorization.ts:91` | **A** — extend, don't replace |

**No authorization bypass or privilege-escalation defect found.** The choke point discipline
(`requireStaffContext`, "no `role===` outside authorization.ts" convention) is intact — the violations
above are the small, known set.

---

## 9. Session Audit

- **`ActiveSession` shape** carries `role` + `activeHealthcareProfileId` but **no staff membership** → **B**: add `activeMembershipId`.
- **`Session.role` denormalization** is a login-time snapshot of `User.role`; under per-membership roles it is insufficient as the sole authority → resolve role/capabilities from the **active membership** per request.
- **`StaffRole = "receptionist" | "super_admin"`** ([session.ts:26](../src/api/session.ts#L26)) is a **vestigial narrow type** (omits `doctor`) → **C (safe cleanup)**: unused-ish narrowing, replace with the real role type.
- Session revocation, per-user session listing, patient profile switch — all **A**.

---

## 10. Routing Audit

- **`defaultWorkspacePathForRole` → "everyone → `/clinic`"** ([authorization.ts:147](../src/domain/authorization.ts#L147)) is the **single most important routing change**: it is the concrete Sprint-3 regression APS-045 reverses. Replace with `resolveSurface()`. Consumers: `login/page.tsx:326`, `join/[token]/page.tsx:75` → **B**.
- **`/doctor/*` and `/staff/*` route trees exist and are healthy but orphaned** → **A-to-reconnect** (do **NOT** delete — APS-045 §9 reconnects them). This is the biggest "don't remove it" warning in the audit.
- **`/admin/*`** cockpit exists → reconnect + extend for Practice Manager.
- **`/clinic/*`** consolidated solo → keep.

---

## 11. Technical Debt Report

| Debt | Severity | APS-044/045 relevance |
|---|---|---|
| `StaffProfile` 1:1 (`user_id @unique`) | **High** | Direct blocker; §15 sequence step 2 |
| `memberRoleFromSpecialty` heuristic (7 sites) | **Medium** | Remove after membership-role consolidation |
| `Session.role` denormalization / no active membership | **Medium** | Add active membership; stop trusting the snapshot alone |
| "everyone → /clinic" routing | **Medium** | Reverse via `resolveSurface()` |
| Legacy `prescription_*` columns (read path still live) | **Medium** | **Clinical BRD, not APS-044** — do not touch now |
| Dual email/phone invitation paths | **Low** | Retire legacy email path when multi-clinic admin flow is revisited |
| `StaffRole` vestigial narrow type | **Low** | Safe cleanup |
| Invoice-centric billing (`appointment_id @unique`) | **Medium** | **Billing BRD, not APS-044** — flagged only |

---

## 12. Safe Deletion List

**Deliberately short — deleting what isn't provably dead is how platforms break.** Confirmed-safe now:

1. **`StaffRole = "receptionist" | "super_admin"`** narrow type ([session.ts:26](../src/api/session.ts#L26)) — vestigial (omits `doctor`); replace with the canonical role type. *(Safe: type-only, no runtime behavior.)*

**NOT safe to delete yet (audit is explicit so nobody does it prematurely):**
- **Legacy `prescription_*` (and JSON clinical) columns on `Appointments`** — still read by `print/*`, `patient/records`, `doctor/context-panel`, `consultation-service`. Requires a *read-path migration to the `Prescription` table first* (clinical BRD). **Do not drop now.**
- **`memberRoleFromSpecialty`** — deprecated, but load-bearing as a fallback in 7 sites. Delete *after* membership-role consolidation (§13), not before.
- **`/doctor` and `/staff` surfaces** — orphaned ≠ dead. APS-045 reconnects them. **Deleting these would destroy the exact surfaces APS-045 depends on.**

> Finding: the "remove aggressively" instinct has almost nothing to bite on here. The codebase's
> existing discipline (honest "kept until cleanup migration" comments, centralized enums, single auth
> choke point) means **realignment is refactor-dominant, not deletion-dominant.**

---

## 13. Refactor List (Category B — document how they evolve)

1. **`StaffProfile` → Membership (1:1 → 1:N).** Drop `user_id @unique` → `@index`. Every `staffProfile.findUnique({ where: { user_id } })` (`organization-service.ts:146`, `session.ts:215/274/328`) resolves *the profile for the session's active membership*. Service layer forbids a 2nd profile until GA (rollback safety).
2. **`Session` → active membership.** Add `active_membership_id`; `requireStaffContext` resolves clinic + capabilities from it; verify the caller holds that membership.
3. **`defaultWorkspacePathForRole` → `resolveSurface()`.** Capability-driven surface resolution (APS-045 §6); update `login`/`join` consumers.
4. **Role set → 6 professional roles.** Expand the union + `defaultCapabilitiesForRole`; keep `super_admin` as stored owner value.
5. **Retire `memberRoleFromSpecialty`.** Read role from `OrganizationMember` everywhere; delete the heuristic last.
6. **Multi-owner.** Ownership checks (`requireOrganizationContext`) read `OrganizationMember.role='owner'`; keep `owner_user_id` as legal anchor.
7. **Managed provisioning.** Add `must_change_password` handling to login/onboarding.
8. **Consolidate hardcoded role branches** (`lib/audit.ts`, dashboard/UI) through `authorization.ts`.

---

## 14. Migration Risks

*(Risk analysis only — no migrations written.)*

| Risk | Level | Mitigation |
|---|---|---|
| Dropping `user_id @unique` breaks `findUnique` call sites | **High** | Grep-gate every `staffProfile.findUnique`; convert to membership-scoped `findFirst`; contract tests |
| Cross-tenant leak once a user has N memberships | **High** | Derive scope from active membership only; never trust client; centralize in `requireStaffContext` |
| Removing `memberRoleFromSpecialty` before all sites read membership role | **Medium** | Sequence: consolidate reads → then delete |
| Reconnecting `/doctor`,`/staff` re-exposes any stale auth gaps | **Medium** | Re-verify session guards on those trees (they predate current session hardening) |
| Legacy prescription column cleanup done under the wrong BRD | **Medium** | Explicitly fence to clinical BRD; not in APS-044 scope |

---

## 15. Recommended Cleanup Sequence

**Cleanup only — implementation follows in the SAD.** Order chosen so each step is independently safe.

1. **Safe type cleanup** — remove the vestigial `StaffRole` narrow type; route stray `role===` through `authorization.ts`. *(Zero behavior change.)*
2. **Consolidate role reads onto `OrganizationMember.role`** across the 7 heuristic sites (keep the heuristic as fallback for now).
3. **Expand the role union to 6** (additive; no behavior change until roles are assigned).
4. **Add session/user columns** (`active_membership_id`, `must_change_password`, `last_workspace_id`) as inert nullable fields + `OrganizationMember @@index([user_id])`. *(Additive; dormant.)*
5. **Relax `StaffProfile` 1:1 → 1:N**, service-layer-guarded against a 2nd profile until GA.
6. **Introduce `resolveSurface()`** behind the flag; keep `defaultWorkspacePathForRole` until the flag flips.
7. **Delete `memberRoleFromSpecialty`** once step 2 is complete everywhere.

Steps 1–4 are pure cleanup/preparation (no feature). Steps 5–7 straddle into APS-044 implementation
and belong to the SAD's phased plan — listed here only to show the seam.

---

## 16. Final Recommendation

**PROCEED to the SAD. The repository is ready for APS-044/045 with a light, well-scoped cleanup — not
a rewrite.** The platform's engineering discipline means the realignment is dominated by *refactoring
four named seams* and *reconnecting two orphaned surfaces*, with almost nothing to delete.

Three things the Product Office should hold firm on:
1. **Do not delete `/doctor` and `/staff`** — they are APS-045's raw material, not legacy.
2. **Do not touch billing/clinical debt under this initiative** — invoice-centric workflow and legacy `prescription_*` columns are real, but they belong to their own BRDs; pulling them in is scope creep against a clean identity/workspace evolution.
3. **Sequence the `memberRoleFromSpecialty` removal last** — it is deprecated but still load-bearing.

Cleanup steps 1–4 in §15 can be done immediately and safely as pure preparation; everything past that
is APS-044 implementation and should wait for the SAD.
