# APS-046 — Engineering Baseline Freeze

**Document ID:** APS-046
**Version:** 1.0
**Status:** Product Office Frozen — **Engineering Constitution**
**Owner:** Auriva Product Office
**Type:** Engineering Baseline (not a BRD — the binding scope contract for APS-044/045 implementation)

> This is the shortest and most binding document in the set. It exists to answer one question with no
> ambiguity: **"What is in scope, and what is not?"** If an engineer proposes a change not authorized
> here, the answer is *"out of scope — different BRD."* No exceptions without a Product Office
> amendment to this document.

References: [APS-044 Identity](./APS-044_Auriva_Identity_and_Workspace_Platform.md) ·
[APS-045 Experience](./APS-045_Auriva_Experience_Platform_Surface_Model.md) ·
[Realignment Audit](./APS-044-045-platform-realignment-audit.md)

---

## 1. What Is Frozen

The following are **Product Office Frozen** and may not be re-litigated during implementation:

| Artifact | Status | Meaning |
|---|---|---|
| **APS-044 — Identity & Workspace Platform** | ✅ Frozen (v1.1) | Identity/membership/workspace model; 6 roles; Membership Isolation Rule |
| **APS-045 — Experience Platform (Surface Model)** | ✅ Frozen (v1.0) | Workspace Selector → Role Workspace; `resolveSurface()`; reconnect `/doctor`+`/staff` |
| **Repository Realignment Audit** | ✅ Complete | Readiness 78/100; refactor-dominant; four named seams |
| **This baseline (APS-046)** | ✅ Frozen | The scope contract below |

---

## 2. What WILL Be Removed

**Exactly this list — and nothing else.** Any deletion beyond this requires an APS-046 amendment.

| # | Removal | When | Safety |
|---|---|---|---|
| 1 | Vestigial `StaffRole = "receptionist" \| "super_admin"` narrow type ([session.ts:26](../src/api/session.ts#L26)) | Phase 0 | Type-only; zero runtime behavior |
| 2 | Stray `role === "..."` literals outside `authorization.ts` (`lib/audit.ts:59`, dashboard/UI branches) — **consolidated**, not deleted wholesale | Phase 0 | Behavior-preserving move into the choke point |
| 3 | Dead imports / unreachable tidy discovered during Phase 0 | Phase 0 | Non-functional |
| 4 | `memberRoleFromSpecialty` heuristic (7 sites) | **Phase 1, LAST** | Replace → migrate → **then** delete. Never delete first. |

**Explicitly NOT on the removal list** (audit §12 — stated so no one deletes them):
- `/doctor/*` and `/staff/*` route trees — **orphaned ≠ dead**; APS-045 reconnects them.
- Legacy `prescription_*` (and JSON clinical) columns on `Appointments` — still on the live read path.
- Any billing/clinical model.

---

## 3. What WILL NOT Be Touched

These domains are **out of scope for APS-044/045 implementation.** Not because they are perfect —
because they are *different BRDs.* Touching them here is a scope violation.

- **Billing** (invoices, payments, invoice-centric workflow, Encounter Ledger)
- **EMR / Clinical records**
- **Prescriptions** (including the legacy-column read-path migration)
- **Labs / Diagnostics / Test Recommendations**
- **Finance / Revenue / Command Center analytics logic**
- **Patient Journey** (booking, records, family, patient portal UX)
- **Notifications** (delivery channels)
- **Release Management** (APS-036: Releases, Sprints)
- **Marketing site**
- **Clinical Templates, Queue business rules, Appointment status machine** (except where APS-045 routing reconnects a surface)

> Rule of thumb for engineers: if the change is about *who a person is, which workspace they enter, or
> how the platform routes/authorizes them* → in scope. Anything about *what happens inside a clinical
> or financial workflow* → out of scope.

---

## 4. Implementation Batches

Implementation is split into a **non-functional Phase 0** and a **behavior-changing Phase 1** (Batches
A–D). **Phase 0 must merge to `main` before Phase 1 begins** — a clean baseline before any business
logic moves.

### Phase 0 — Repository Cleanup (NO behavior change)

No UI. No new APIs. No changed DB behavior. Additive-but-dormant schema is allowed (nothing reads it
yet). Definition of done: full test suite green, zero functional diff.

- Remove vestigial `StaffRole` type; remove dead imports.
- Consolidate stray role literals through `authorization.ts`.
- Expand the role union to the **6 professional roles** (additive; no role is *assigned* yet).
- Consolidate role **reads** onto `OrganizationMember.role` where it is a pure swap (keep `memberRoleFromSpecialty` as a fallback for now).
- Add **dormant** nullable columns: `Session.active_membership_id`, `Users.must_change_password`, `Users.last_workspace_id`.
- Add index `Organization_Members @@index([user_id])`.

### Phase 1 — Migration (behavior-changing, feature-flagged)

| Batch | Scope | Depends on |
|---|---|---|
| **Batch A — Identity/Session spine** | Activate `active_membership_id` resolution; managed provisioning + `must_change_password` handling | Phase 0 |
| **Batch B — Membership (the keystone)** | Relax `StaffProfile` 1:1 → 1:N (drop `user_id @unique`); membership-scoped `requireStaffContext`; service-layer guard against a 2nd profile until GA | Batch A |
| **Batch C — Workspace & Surface** | Workspace Selector + switch endpoint + `resolveSurface()`; reconnect `/doctor`+`/staff`+cockpit; `last_workspace_id` | Batch B |
| **Batch D — Ownership & Roles** | Multi-owner via `OrganizationMember.role='owner'`; assign the new roles; **then** delete `memberRoleFromSpecialty` | Batch A (parallel to C) |

Every Phase 1 batch ships behind `FEATURE_MULTI_WORKSPACE` (default off); server-side isolation ships
before any UI; cross-tenant isolation is a CI gate (APS-044 §13a).

---

## 5. Branch Strategy

```
main
 └─ phase-0-cleanup ───────────── merge to main (clean baseline)   [Phase 0]
      └─ identity-platform ─────── Batches A + B                    [Phase 1]
           └─ workspace-platform ─ Batches C + D (off identity)     [Phase 1]
                └─ merge ────────► main (behind feature flag)
```

- **`phase-0-cleanup`** merges to `main` first and independently — the repository is cleaner before any architectural change.
- **`identity-platform`** carries the identity/session/membership work (A + B).
- **`workspace-platform`** branches off `identity-platform` for the surface/selector/owner/role work (C + D).
- Final merge to `main` lands dormant behind the flag; pilot → multi-clinic → GA rollout follows.

One batch per branch discipline (per the sprint-completion convention): each handoff includes test
login credentials + the UI route to click through.

---

## 6. The Frozen Roadmap

Product Office work is now **complete and frozen.** Engineering proceeds in this exact order — the
codebase is cleaned before architecture changes, and architecture is finalized before any UI or
implementation.

| # | Step | State |
|---|---|---|
| 1 | APS-044 — Identity Platform | ✅ Frozen |
| 2 | APS-045 — Experience Platform | ✅ Frozen |
| 3 | Repository Realignment Audit | ✅ Complete |
| 4 | **APS-046 — Engineering Baseline** | ✅ **Frozen (this doc)** |
| 5 | **Phase 0 — Repository Cleanup** (non-functional) | ➡️ Next |
| 6 | SAD-043 — Technical Architecture | Pending Phase 0 |
| 7 | PRS-043 — Engineering Requirements & Use Cases | Pending SAD |
| 8 | UX Specification + HTML Prototype (UI approval) | Pending PRS |
| 9 | Implementation (Phase 1, Batches A–D) | Pending prototype approval |

---

## 7. Amendment Rule

This document is the scope contract. It changes **only** by explicit Product Office amendment recorded
here with a version bump. No branch, ticket, or PR may widen scope by claiming "while I was in there."
The correct response to any such proposal is: **"Out of scope — raise a separate BRD."**
