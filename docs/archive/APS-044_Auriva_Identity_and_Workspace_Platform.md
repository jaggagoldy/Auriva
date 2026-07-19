# APS-044 — Auriva Identity & Workspace Platform

**Document ID:** APS-044
**Version:** 1.1 (Ratified)
**Status:** Product Office Frozen
**Owner:** Auriva Product Office
**Type:** Platform Architecture Specification (foundational — future BRDs reference this instead of redefining identity/membership/workspace behavior)

> This is the authoritative specification for authentication, identity, workspace routing,
> organization ownership, and staff lifecycle. Engineering references APS-044; it is not
> re-litigated per feature. Technical feasibility is assessed separately in
> [APS-044-technical-feasibility-review.md](./APS-044-technical-feasibility-review.md).

**Changelog — v1.1 (2026-07-14, ratification):** Product Office ratified the feasibility review with
no architectural change. Added §13a **Membership Isolation Rule** (a permanent engineering invariant).
Locked §11 to exactly **six professional roles**. Recorded the ratified engineering-latitude decisions
in §19 (multi-owner = legal vs operational split; StaffProfile _is_ the Membership record;
session-active membership; feature-flagged phased rollout). The **Surface Model** is explicitly **NOT**
solved here — it is the next Product Office decision, carried by the Pre-RC remediation document.

---

## 1. Executive Summary

Auriva is evolving from a single-clinic application into a **Healthcare Operating System** supporting:

- Solo Practices
- Multi-Doctor Clinics
- Multi-Clinic Organizations
- Hospital Groups
- Future Professional Community

To support this, Auriva separates four concerns that were previously fused:

- **Human Identity** — who a person is
- **Organization Membership** — a person's employment/affiliation with an organization
- **Workspace** — the operational surface a membership opens into
- **Operational Data** — the clinic's records

---

## 2. Vision

Auriva serves four primary actors: **Patient**, **Professional**, **Organization**, **Platform**.

The platform must support one person → multiple organizations → multiple workspaces → complete
tenant isolation, **without changing the person's credentials.**

---

## 3. Product Goals

APS-044 exists to solve, while maintaining complete tenant isolation:

- Multi-clinic doctors
- Shared reception staff
- Hospital expansion
- Organization-first ownership
- Future Professional Community
- Future recruitment platform

---

## 4. Core Principles (Frozen Permanently)

| ID | Principle |
|----|-----------|
| **P1** | Organizations own Memberships. Individuals never belong directly to operational data. |
| **P2** | Individuals own Global Identity. Organizations never own identities. |
| **P3** | Patient owns Personal Health Record. |
| **P4** | Clinic owns Appointments, Encounters, Billing, Schedules, Audit Logs, Staff Memberships. |
| **P5** | Identity matching never blocks onboarding. Clinic operations always take priority. |
| **P6** | One credential. Many workspaces. |
| **P7** | Cross-tenant isolation is absolute. Nothing leaks. |
| **P8** | Professional Community is NOT Release 2.0. |

---

## 5. Platform Architecture

```
Global Identity
   ↓
Organization
   ↓
Clinic
   ↓
Membership
   ↓
Workspace
   ↓
Operational Records
```

---

## 6. Identity Platform

Defines the Auriva Identity lifecycle: **Creation → Verification → Recovery.**

Identity principles:

- Identity is permanent.
- Phone/email may change.
- Identity survives employment.
- Identity survives organizations.
- Identity reconciliation is optional.
- Identity matching is advisory.
- Identity never blocks onboarding.

---

## 7. Organization Platform

Organizations own: Subscriptions, Clinics, Departments, Memberships, **Multiple Owners**, Billing,
Legal responsibility.

An Organization may contain: a Solo Clinic, a Clinic Network, a Hospital, or an Enterprise.

---

## 8. Membership Platform

A Membership links a **Global Identity** to an **Organization**, and owns:

Role · Permissions · Workspace · Schedules · Consultation Fees · Signatures · Availability · Employment Status

**Membership lifecycle:** Pending → Active → Suspended → Archived → Expired → Restored.

Membership archival never deletes history.

---

## 9. Authentication

Separate experiences by design:

```
Patient Login  → Patient Experience
Staff Login    → Workspace Selector → Professional Workspace
```

- No staff self-signup. Staff accounts are created only by Organizations.
- Professional Community signup is future roadmap.

---

## 10. Workspace Model

```
Single Membership     → Auto-open Workspace
Multiple Memberships  → Workspace Selector → Remember Last Workspace → Switch Workspace
```

Workspace switching must never expose another tenant's data.

---

## 11. Roles

**Professional (staff) roles — locked at exactly six for Release 2.0:**

Owner · Practice Manager · Doctor · Receptionist · Nurse · Technician

> This set is frozen. Do **not** add more staff roles in this release. Arbitrary/custom roles are a
> **future** capability, not a Release 2.0 feature. These are **platform capabilities**, not product
> features — each is a default capability bundle over the additive capability model, never a hardcoded
> branch.

**Roles outside the professional set (separate categories, not staff roles):**

- **Patient** — patient side; authenticates and lives in the Patient Portal.
- **Caretaker** — a **family relationship on the patient side**, expressed through family profile
  sharing. It is explicitly **NOT** a staff role and never appears in the Workspace Selector.
- **Platform Admin** — Auriva-internal; governs the platform itself, never a customer role.

Permissions are **capability-based, not hardcoded.**

---

## 12. Ownership Model

```
Global Identity      → Individual
Membership           → Organization
Operational Records  → Organization
Health Vault         → Patient
```

---

## 13. Platform Invariants (Immutable)

- **Identity** never blocks onboarding.
- **Membership** — Organizations own memberships.
- **Tenant Isolation** — membership changes affect only the owning Organization. Suspension in Clinic A must never affect Clinic B.
- **Archival** — archive removes access; history remains forever.
- **Workspace** — switching never leaks information.
- **Login** — Patient and Staff experiences remain completely separate.
- **Data** — patient data never follows professionals.

---

## 13a. Membership Isolation Rule (Permanent Engineering Invariant)

> Every Membership is an **independent contractual relationship** between an Individual and an
> Organization. Only the **Global Identity** is shared across memberships. **Everything else belongs
> to the Membership.**

Therefore, an action taken on a person's membership in one clinic must have **no effect** on their
membership in any other clinic:

| Action in Clinic A | Effect on Clinic B |
|---|---|
| Suspension | **None** |
| Archival | **None** |
| Promotion / role change | **None** |
| Consultation fees | **None** |
| Availability / schedule | **None** |
| Signatures | **None** |

The only thing shared is the Global Identity (who the person is). This is a **permanent invariant**:
it must be enforced server-side, covered by isolation tests as a CI gate, and may never be relaxed for
convenience. It is the concrete, testable form of P7 (cross-tenant isolation) applied to the
Membership layer.

---

## 14. Staff Lifecycle

```
Invitation → Pending → Active → Suspended → Archived → Restored
```

Supports resignations, rejoining, temporary staff, and visiting doctors **without recreating
historical data.**

---

## 15. Edge Cases (must all be representable)

Owner becomes patient · Doctor works in multiple clinics · Doctor changes email · Doctor changes
phone · Clinic acquisition · Organization merge · Owner succession · Multiple owners · Temporary
doctor · Archived membership restored · Identity reconciliation · Subscription expiry · Workspace
switching.

---

## 16. Out of Scope

Attendance · Payroll · Inventory · Accounting · Insurance · Hospital ERP · Professional Community ·
Recruitment · Research · Publishing.

> Note: this explicitly excludes the AGENTS.md HRMS/ERP red-flag surfaces. Nurse/Technician are
> **clinical** roles, not HR constructs — they do not reintroduce attendance/payroll.

---

## 17. Future Roadmap (Independent Products — NOT Release 2.0)

Professional Community · Professional Profiles · Recruitment Marketplace · Research · Networking ·
Hospital Marketplace · Cross-clinic collaboration.

> Governance note: Recruitment Marketplace and Professional Community trip the AGENTS.md
> "recruitment platform" red flag. They are correctly fenced out of APS-044 scope; when proposed,
> each requires its own Architecture Review before any implementation.

---

## 18. Acceptance Criteria

APS-044 is complete when:

- Identity is separated from Membership.
- Membership is separated from Operational Data.
- Organizations own memberships.
- Patient and Staff experiences are separated.
- Multi-workspace login is supported.
- Cross-tenant isolation is guaranteed.
- Identity reconciliation is optional.
- Architecture supports future growth without redesign.

---

## 19. Product Office Freeze Decisions (Final for Release 2.0)

- Patient Login and Staff Login remain separate.
- Organizations create Staff accounts.
- Identity matching never blocks onboarding.
- Organizations own Memberships.
- Individuals own Global Identity.
- Cross-tenant isolation is absolute.
- Membership lifecycle uses Pending → Active → Suspended → Archived → Restored.
- Patient data never leaves the owning tenant.
- Professional Community is out of scope for Release 2.0.
- Auriva is not an ERP, Payroll, HRMS, Inventory, or Accounting platform.

### 19a. Ratified engineering-latitude decisions (2026-07-14)

The Product Office reviewed the technical feasibility report and ratified the following. These are
**how**, not **what** — recorded so Engineering has an unambiguous mandate; none reopens APS-044.

- **Multi-owner = legal vs operational split.** `Organization.owner_user_id` remains the **legal
  owner** (subscription, billing, contracts). **Operational owners** are Organization Members with
  `role = owner` (manage staff, settings, clinics, finance). Keep both; do not collapse them.
- **StaffProfile _is_ the Membership record.** No separate Membership table. Engineering promotes
  StaffProfile from 1:1 to 1:N per identity (one per clinic). Product Office does not prescribe the
  table shape beyond this intent.
- **Session carries the Active Membership** (the staff twin of the patient Active Profile), resolved
  server-side, never trusted from the client — the Teams/Slack/Workspace model.
- **Feature-flagged phased rollout:** Feature Flag → Pilot Clinics → Multi-Clinic → General
  Availability. Never a single big-bang migration.
- **Identity reconciliation stays optional and manual.** If one identity ends up with two Auriva IDs
  across two clinics, an optional Support/Verification-assisted merge is the path. Do **not** build
  automatic reconciliation day one.
- **Surface Model is NOT decided by APS-044.** Staff → Workspace Selector → Clinic → Role Workspace
  (Doctor / Reception / Owner / Manager), **not** "everyone → /clinic." This is the next Product
  Office decision and is carried by the Pre-RC remediation document; it becomes the foundation of the
  UI/UX redesign.
