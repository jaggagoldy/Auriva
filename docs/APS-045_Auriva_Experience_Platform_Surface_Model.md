# APS-045 — Auriva Experience Platform (Surface Model)

**Document ID:** APS-045 *(proposed — renumber if this ID is already assigned; the content is the authority)*
**Version:** 1.0
**Status:** Product Office Frozen
**Owner:** Auriva Product Office
**Type:** Platform Architecture Specification (foundational — companion to [APS-044](./APS-044_Auriva_Identity_and_Workspace_Platform.md))

> APS-044 defines **who** a person is and **which workspaces** they may enter. APS-045 defines **what
> a workspace _is_** — the surfaces a person lands in, how the platform chooses between them, and how
> they navigate. It is the foundation of the UI/UX redesign. Engineering references APS-045; it is not
> re-litigated per screen.

---

## 1. Executive Summary

APS-044 froze the identity and membership platform and deliberately left one decision open: the
**Surface Model** — the mapping from *(person, membership, capabilities)* to *the operational surface
they see*. APS-045 freezes it.

**The decision (ratified):**

```
Patient  → Patient Portal
Staff    → Workspace Selector → Clinic → Role Workspace
                                          (Doctor · Reception · Owner/Manager)
```

**NOT** "everyone → `/clinic`."

This corrects a regression: rich **Doctor** (`/doctor/*`) and **Reception** (`/staff/*`) workspaces
were built in earlier milestones, then **orphaned** when BRD-043 Sprint 3 routed every staff role to a
single thin `/clinic` dashboard ([defaultWorkspacePathForRole](../src/domain/authorization.ts#L147)).
APS-045 **reconnects** those surfaces for multi-person clinics — this is *reconnect-and-extend, not
rebuild* — while **preserving** the frozen Release 1.2 solo experience for the single-operator case.

---

## 2. Problem Statement

- A hired **Doctor** in a multi-doctor clinic lands in a generic `/clinic` dashboard instead of the
  clinical Doctor Workspace built for exactly that persona.
- A **Receptionist** lands there too, instead of the reception queue/desk surface.
- The **Owner** of a growing clinic has no distinct cockpit separating "run the business" from "see a
  patient."
- Meanwhile the **solo owner-doctor** is perfectly served by the unified `/clinic` — that experience
  is frozen (Release 1.2 UX v1.0) and must not regress.

The single flag "everyone → `/clinic`" cannot satisfy both the solo operator and a role-specialized
team. The Surface Model must resolve the surface from **capabilities**, not from a hardcoded route.

---

## 3. Core Principles (Frozen)

| ID | Principle |
|----|-----------|
| **X1** | The surface a person sees is **derived from their active membership's capabilities**, never hardcoded per role string. |
| **X2** | A person with **one** capability lands directly in that **role workspace**. |
| **X3** | A person holding the **full** capability set in a **single-member** clinic gets the **consolidated** surface (the frozen solo `/clinic`). |
| **X4** | Patient and Staff are **separate worlds** (inherited from APS-044 §9). A patient never sees a staff surface and vice versa. |
| **X5** | Surfaces are **reconnected, not reinvented** — the existing `/doctor`, `/staff`, `/clinic`, `/admin` route trees are the raw material. |
| **X6** | Cross-tenant isolation (APS-044 P7 + §13a) holds across **every** surface and every switch. |

---

## 4. The Two Worlds

```
                         LOGIN
                           |
        ┌──────────────────┴──────────────────┐
     Patient                                 Staff
        |                                       |
  Patient Portal                       Workspace Selector
  (Health Vault,                       (skipped if exactly
   Book, Records,                       one membership)
   Family, You)                                 |
                                          Role Workspace
                                    (resolved by capabilities — §6)
```

Patient world is unchanged by APS-045. This document governs the **Staff** branch.

---

## 5. Surface Catalog (Staff World)

Four staff surfaces. Each already has a route tree in the codebase.

| Surface | Persona | Purpose | Existing route |
|---|---|---|---|
| **Doctor Workspace** | Doctor, Nurse (read/assist), Technician (results) | Today/Mission Control, Consult Workbench, Schedule, Patients, clinical templates | `/doctor/*` (built, currently orphaned) |
| **Reception Workspace** | Receptionist | Queue, check-in, walk-in, billing/cash desk, lab worklist | `/staff/*` (built, currently orphaned) |
| **Owner / Manager Cockpit** | Owner, Practice Manager | Team, Plan, Settings, Command Center, org/clinic operations, finance | `/admin/*` + Settings group (built) |
| **Consolidated Clinic** | Solo owner-doctor (full capabilities, single-member clinic) | The frozen Release 1.2 all-in-one solo experience | `/clinic/*` (built, current default) |

> Nurse / Technician (new APS-044 roles) are **capability variants of the Doctor Workspace**, not new
> surfaces — they see a scoped subset (e.g. Technician → results entry; Nurse → vitals/assist). No new
> route tree; scoped by capability within `/doctor`.

---

## 6. Surface Resolution Rule (the heart of APS-045)

Resolution is a pure function of the **active membership's effective capabilities**
([effectiveCapabilities](../src/domain/authorization.ts#L129)) and **whether the clinic has more than
one member** — no separate "solo mode" flag, no role-string branch.

```
resolveSurface(activeMembership):
  caps   = effectiveCapabilities(membership)
  soloed = clinic has exactly one active member AND caps ⊇ {reception, doctor_workspace, admin_portal}

  if soloed:                          → Consolidated Clinic   (/clinic)      [X3]
  else if caps = {admin_portal, ...}  → Owner/Manager Cockpit (/admin)       [owner/manager]
  else if caps ⊇ {doctor_workspace}   → Doctor Workspace      (/doctor)      [X2]
  else if caps ⊇ {reception}          → Reception Workspace   (/staff)       [X2]
  else                                → (no staff surface; deny)
```

Consequences, all falling out of the same rule:

- **Solo owner-doctor** → Consolidated `/clinic`. The frozen solo UX is preserved verbatim.
- **The moment a solo owner hires their first staff member**, the clinic is no longer single-member;
  the owner's surface becomes the **Owner Cockpit**, and each hire lands in their own role workspace.
  This is the intended "grow into a team" transition — and it is automatic, driven by member count +
  capabilities, requiring no migration or manual switch.
- **A multi-clinic doctor** whose Clinic-A membership grants only `doctor_workspace` and whose Clinic-B
  membership grants `doctor_workspace + reception` lands in the Doctor Workspace for A and could open
  Reception in B — **per membership**, honoring the Membership Isolation Rule (APS-044 §13a).

> **Frozen sub-decision (call-out for veto):** a solo owner-doctor stays on the **consolidated
> `/clinic`**, not the role-workspace switcher. Rationale: Release 1.2 UX v1.0 is a frozen contract
> (changing it needs a POCR) and "one screen, everything" is the correct solo ergonomics. If the
> Product Office instead wants even solo operators to use role workspaces + a switcher, that is the one
> place to say so now.

---

## 7. Workspace Selector & Switching (ties to APS-044 §10)

```
Staff login
   |
   ├─ exactly 1 membership → resolveSurface() → open directly (no selector)   [APS-044 §10]
   |
   └─ 2+ memberships → Workspace Selector → pick membership
                                            → resolveSurface() → open
                                            → Users.last_workspace_id remembered
```

- The **switcher control** (persistent in the staff shell) re-runs the selector without a full logout.
- On switch, the server sets `Session.active_membership_id`, re-resolves capabilities and surface, and
  updates `last_workspace_id`. Client never chooses the surface directly — it renders what the server
  resolves (APS-044 security note: no token reissue, no capability caching across switch).

---

## 8. Navigation IA per Surface (structure frozen; pixels deferred to UI/UX redesign)

APS-045 freezes the **navigation spine** of each surface, not its visual design.

| Surface | Primary navigation (frozen spine) |
|---|---|
| **Patient Portal** | Home · Book · Records · Family · You (mobile-first, per patient rebuild) |
| **Doctor Workspace** | Today · Workbench · Schedule · Patients · Practice · Profile |
| **Reception Workspace** | Queue · Appointments · Walk-in · Billing/Desk · Lab worklist |
| **Owner/Manager Cockpit** | Command Center · Team · Clinics · Finance · Plan · Settings |
| **Consolidated Clinic (solo)** | The frozen Release 1.2 v1.0 IA (unchanged) |

Detailed screen inventory, layout, and visual language are the **UI/UX redesign's** job, bounded by
this spine. The spine may not be reshuffled without a POCR.

---

## 9. Route Mapping — Reconnect, Not Rebuild

| Surface | Route | Action required |
|---|---|---|
| Consolidated Clinic | `/clinic/*` | Keep as-is (solo path) |
| Doctor Workspace | `/doctor/*` | **Reconnect** — make it the resolved landing for doctor-capability memberships in multi-person clinics; re-verify session auth is wired (built pre-BRD-043) |
| Reception Workspace | `/staff/*` | **Reconnect** — resolved landing for reception-capability memberships |
| Owner/Manager Cockpit | `/admin/*` + Settings | **Reconnect + extend** — resolved landing for admin-capability memberships in multi-person clinics; add Practice Manager scoping |
| Routing function | [defaultWorkspacePathForRole](../src/domain/authorization.ts#L147) | **Replace** the "everyone → /clinic" logic with `resolveSurface()` (capability-driven), behind the same feature flag as APS-044 multi-workspace |

**This is the concrete undo of the Sprint 3 routing regression identified in the Pre-RC remediation.**

---

## 10. Invariants (Permanent)

- **I1** Surface is resolved server-side from the active membership; the client renders, never decides.
- **I2** No staff surface leaks another tenant's data (APS-044 P7 + §13a) — enforced regardless of which surface is active.
- **I3** The Patient world and Staff world never cross. A staff member who is also a patient uses the Patient Portal via the Patient world, never a staff surface (APS-044 P: separate login).
- **I4** Nurse/Technician are scoped variants of the Doctor Workspace, not new surfaces.
- **I5** The consolidated solo `/clinic` experience is preserved and POCR-protected.

---

## 11. Out of Scope

- Visual redesign / screen-level layouts (that is the UI/UX redesign, downstream of this freeze).
- Any new surface beyond the four in §5.
- Per-user custom dashboards / drag-and-drop layouts (future).
- The Surface Model does **not** re-open identity, membership, or RBAC — those are APS-044.

---

## 12. Freeze Decisions (Final for Release 2.0)

- Staff route through a **Workspace Selector → Role Workspace**, not a single universal `/clinic`.
- Four staff surfaces only: **Doctor · Reception · Owner/Manager Cockpit · Consolidated Clinic (solo)**.
- Surface is resolved from **active-membership capabilities**, not role strings, via `resolveSurface()`.
- Solo owner-doctor keeps the **consolidated `/clinic`** (frozen Release 1.2 UX; POCR to change).
- Existing `/doctor`, `/staff`, `/admin` surfaces are **reconnected**, not rebuilt.
- Nurse/Technician are **capability-scoped variants** of the Doctor Workspace.
- All surface routing ships behind the **same feature flag** as APS-044 multi-workspace, phased pilot → GA.

---

## 13. Acceptance Criteria

APS-045 is satisfied when:

- A hired doctor lands in the Doctor Workspace; a receptionist in the Reception Workspace; a multi-person owner in the Owner Cockpit — each from `resolveSurface()`, none in a generic `/clinic`.
- A solo owner-doctor still opens the consolidated `/clinic`, unchanged.
- Adding the first staff member to a solo clinic automatically transitions the owner to the Owner Cockpit and the hire to their role workspace, with no migration.
- A multi-clinic professional sees the correct, isolated surface per membership.
- Single-membership staff never see the selector; 2+ membership staff do, with last-workspace remembered.
- Every surface passes cross-tenant isolation tests.
