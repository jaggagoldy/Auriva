# 14 — Security

← [13 Events](./13-events.md) · [Index](./00-README.md) · Next: [15 Operations](./15-operations.md)

Product-level view of authentication, authorization, audit, isolation, and their known limitations. See [08-business-rules.md](./08-business-rules.md) for the permission matrix itself and [11-database-concepts.md](./11-database-concepts.md) for the schema this is built on.

## Authentication

| Persona | Mechanism |
|---|---|
| Staff (all six roles) | **Phone (or email) + password.** Password hashed with **scrypt** (`scrypt$<salt>$<hash>` format, `src/lib/password.ts`). `User.password_hash` is null for patient accounts — patients never authenticate this way. |
| Patient | **Phone + OTP.** A fresh, cryptographically random code per request, stored **only** as a scrypt hash in `OtpChallenge` (never plaintext), short expiry, per-challenge attempt cap, single-use consumption. |
| Provisioned staff (managed provisioning) | First login is gated by `must_change_password = true` — enforced **server-side** in `requireStaffContext` (not merely a UI redirect), so a provisioned account cannot use any workspace API until it sets its own password. `password_set_at` records the rotation for audit. |
| Dev/non-production OTP echo | `shouldEchoOtp()` returns true only when `NODE_ENV !== "production"` **and** no real SMS provider is configured — this is explicitly forbidden in production (echoing a live OTP there would defeat the entire point of a per-request secret). |

**Session mechanics:** a `Session` row is created per login; the cookie holds a random 32-byte token, and only its **SHA-256 hash** is stored (`token_hash`, unique) — the raw token never touches the database. Cookie: `httpOnly`, `sameSite: lax`, `secure` in production, 12-hour TTL ("a work shift"). Sessions carry `active_membership_id` (staff, which workspace) and `active_healthcare_profile_id` (patient, which family profile) — both resolved and mutated only server-side, never trusted from client input directly (every switch validates the caller actually holds the target membership/profile first).

## Authorization

**Centralized in `src/domain/authorization.ts`** — the codebase's stated rule is that no `role === "..."` comparison may appear anywhere else, so the entire access model can change in one file.

**Two-layer model:**
1. **Capabilities** (`reception`, `doctor_workspace`, `admin_portal`, `patient_workspace`, `diagnostics`) gate **which surface** (`/admin`, `/doctor`, `/staff`, `/clinic`, `/patient`) a member may open — resolved by the pure function `resolveSurfacePath(capabilities, isSoloClinic)`.
2. **Permissions** (the 20-item C2 matrix) gate **which actions** a role may take once inside a surface — see the full table in [08-business-rules.md](./08-business-rules.md).

**Six staff roles + patient + internal platform-admin:** `super_admin` (displays "Owner"), `practice_manager`, `doctor`, `receptionist`, `nurse`, `technician`, plus `patient` and the separate `is_platform_admin` boolean flag (never customer-settable).

**Membership Isolation Rule (APS-044 §13a):** every access decision for profile-holding staff resolves through their **active membership**, never a client-supplied clinic id. A `super_admin` may address a specific clinic id only among clinics they actually own (`Clinic.super_admin_id` match). This is what makes suspension/status/capability scoping **strictly per-clinic** — a member suspended at one clinic is completely unaffected at another where they also hold a membership.

**Legal vs operational ownership:** `Organization.owner_user_id` is the single legal owner; `requireOrganizationContext` tries the legal-owner path first, then falls back to resolving an operational membership (Practice Manager or an operational owner) — carrying `isLegalOwner: false`. The two never-delegated actions (`plan:manage`, `team:assign_owner`) are additionally gated by `requireLegalOwnerContext`, which refuses anyone who isn't the actual legal owner even if they hold every other capability.

**Platform Admin is a separate axis entirely.** `User.is_platform_admin` gates Auriva's own Release Management authoring (`requirePlatformAdminContext`) — deliberately not modeled as `requireOrganizationContext`/`requireStaffContext`, since a platform release has no single owning customer organization. No customer-facing signup/invite flow can ever set this flag.

## Session-scoping guard rails (a recap worth stating as a security property)

- `requireAppointmentAccess` rejects (403) a patient or doctor whose **requested** filter doesn't match their own scope — it does not silently narrow the request, which would risk masking a bug as a smaller-than-expected result set.
- `requireStaffContext` additionally checks, on every request (not just at login): `mustChangePassword` (blocks everything until resolved) and `membershipStatus !== "active"` (a suspended/archived membership is denied **even with a still-live session cookie** — access is revoked in real time, not merely at next login).

## Audit logging

- **`AuditLog`** — organization-scoped (`organization_id` is a real NOT NULL schema constraint), captures org/admin-level actions: clinic created, staff invited/activated/deactivated, organization updated, department created, etc.
- **`recordAudit()`** (`src/lib/audit.ts`) is a thin wrapper, deliberately **not** routed through the Event Platform (no retry/fan-out semantics are needed for "someone signed in"). An audit-write failure never fails the user-facing action it describes (logged, not propagated) — a login must still succeed even if the audit row can't be written.
- **Known, documented coverage gap:** a self-registered, phone-only patient with no registering clinic has no resolvable organization for audit purposes — `recordAudit` is a **documented no-op** in that case, not a bug to be silently patched by fabricating a tenant.
- `AppointmentEvent` is the appointment-scoped complement — an append-only fact trail (`created`/`checked_in`/`status_changed`/`walk_in_registered`/`cancelled`) that long predates the general audit log and was its conceptual seed.

## Tenant isolation

- Every staff-scoped query resolves through the caller's **active membership's clinic**, never a client-supplied clinic id (except `super_admin`, validated against clinics they actually own).
- Switching workspaces re-scopes the **entire content region** — this decisive reload is treated as the felt proof of isolation, not just a backend guarantee (APS-044 §13a; also documented in the UX layer, see [02](./02-product-constitution.md) and [09](./09-ui-components.md)).
- Patient isolation: a patient session is scoped to `active_healthcare_profile_id`; a patient can only ever see profiles they hold via `AccountProfileLink`, switched only server-side after a service-layer check.

## Rate limiting

**Known limitation, explicitly documented, not hidden:** rate limiting is currently **in-memory and single-instance**. This is correct for a single server instance but must be revisited before horizontal scale (multiple app instances would each keep their own independent counters, effectively multiplying the real limit). Listed in both the Deferred Capability Register and the RC's Known Limitations. Demo-entry (`/api/demo/enter`) and OTP send/verify are the endpoints where this matters most (brute-force / abuse surfaces).

## Password hashing

- **Staff passwords:** scrypt, salted, format `scrypt$<salt>$<hash>` (`src/lib/password.ts`) — the same scheme used for OTP-code hashing (`OtpChallenge.code_hash`), so there is exactly one hashing convention in the codebase, not two.
- **Session tokens:** SHA-256 of a 32-byte random value; only the hash is persisted.
- **No plaintext secret is ever stored** — not passwords, not OTP codes, not session tokens.

## Threat-model callouts worth remembering

| Concern | Mitigation | Status |
|---|---|---|
| Cross-tenant data leakage once a person holds multiple memberships | Membership-scoped resolution (Batch B) + an isolation CI test gate | Isolation tests exist; a **formal CI gate** was a Batch F line item — verify current status in `docs/DELIVERY-DASHBOARD.md` before quoting as fully closed |
| `StaffProfile` 1:1→1:N migration breaking existing call sites | Compiler-enforced conversion via a dedicated "membership seam" + a regression suite | ✅ Complete (Batch B) |
| Reconnecting `/doctor`/`/staff` re-exposing stale/unguarded auth after the identity-platform rework | Guards re-verified before any flag flip | Addressed in Batch C |
| Patient OTP has no real delivery provider | Blocks a genuine patient-facing pilot; owner-driven managed provisioning needs no SMS provider, so staff onboarding is unaffected | Open — an ops/vendor task, see [15](./15-operations.md) |
| Production database + backups not yet provisioned | Ops prerequisite, tracked as a Go-Live Gate | Open |

For the full go-live gate checklist and known-limitations register, see [15-operations.md](./15-operations.md) and [17-roadmap.md](./17-roadmap.md).
