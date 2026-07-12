# ADR-0003 — Adaptive Workspace: additive capability model

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Head of Engineering (AEO-001 Sprint 2, Batch 2)
- **Release / Sprint:** Release 1.2 / Sprint 2 — Batch 2 (Adaptive Workspace)

## Context

The authorization layer keyed every access decision off a single role string
(`canAccessReception(role)` etc.). A solo practitioner — one person who is
owner, clinician, and receptionist — was therefore structurally locked out of
running their own front desk unless they logged in as `super_admin` (which
carries admin-portal access they may not want) and separately held a
StaffProfile. The blueprint (§3.2, authoritative) mandates the fix be
**additive** — "a StaffProfile gains a set of granted capabilities beyond its
base role's default set, and the existing predicates check that set" — and
explicitly **forbids** a parallel "solo mode" flag that would later need
migrating away.

## Decision

Introduce a capability model in `src/domain/authorization.ts`:
`WORKSPACE_CAPABILITIES` (`reception`, `doctor_workspace`, `admin_portal`,
`patient_workspace`), `defaultCapabilitiesForRole` (today's rules verbatim),
and `effectiveCapabilities(role, grantsJson)` = defaults ∪ grants. Grants are
stored as a JSON array on a new nullable `StaffProfile.capabilities` column
(null = defaults only, so every existing row is unchanged).

`requireStaffContext` accepts **either** a legacy `(role) => boolean` predicate
(all pre-Sprint-2 call sites, unchanged) **or** a `Capability` string, checked
against the caller's effective set. Front-desk routes (reception dashboard,
queue, walk-in, check-in, status, billing) now authorize with the `reception`
capability, so a doctor granted `reception` — the solo practitioner — passes
them, scoped to their own clinic. An owner grants capabilities through the
existing staff-management endpoint (`setStaffCapabilities`, allowlisted to
`reception`/`doctor_workspace`). A `WorkspaceSwitcher` renders only when a
caller holds more than one workspace capability.

## Alternatives considered

- **A "solo mode" boolean on the clinic/profile** — rejected; explicitly
  forbidden by the Product Office and creates a fork that fights the "scales
  down and up without migration" principle.
- **Change every predicate's signature to take capabilities** — rejected as a
  27-call-site breaking change; the string-or-predicate overload on
  `requireStaffContext` gives grant-awareness where it's needed with zero
  changes to untouched call sites.
- **Grant capabilities on the OrganizationMember row** — deferred; the
  StaffProfile is where clinic scope already resolves, keeping the grant and
  the scope decision in one place. Revisit if capabilities ever need to differ
  per clinic for one person (debt).

## Consequences

- Positive: a solo practitioner runs reception + clinical from one account;
  effective capabilities are always recomputed server-side (never persisted as
  a union), so a later role change can't leave stale access. Regression-covered
  (`authorization.test.ts`, `session.test.ts`, `onboarding-service.test.ts`).
- Negative / cost: not every reception-adjacent route is converted yet (lab
  worklist and the appointment list keep role predicates) — the pattern is
  established and the remainder is mechanical, tracked as debt. Capability
  grants are clinic-agnostic (one set per profile).
- The `WORKSPACE_CAPABILITIES` set and `requireStaffContext`'s dual authorize
  contract are now part of the authorization surface future work builds on.
