// Centralized authorization predicates. Every role comparison in the
// codebase must go through this module — no `role === "..."` literals
// anywhere else — so that when roles move from User.role onto
// OrganizationMember.role (see src/domain/organization.ts), access rules
// change in exactly one file.
//
// The capability helpers encode Sprint 1's rules VERBATIM. They take the
// role string as stored today (User.role / Session.role).
//
// Pure TypeScript — safe to import from client and server code.

/**
 * The role strings stored in Users.role / OrganizationMember.role.
 *
 * Phase 0 (APS-046 §4): the union is expanded to the six professional roles
 * ahead of Batch D — this is DORMANT. No account is assigned
 * `practice_manager` / `nurse` / `technician` yet, and their capability
 * bundles are intentionally NOT defined here: they belong to the RBAC
 * decision (ERA-001 C2) to be frozen before Batch D. `defaultCapabilitiesForRole`
 * is therefore unchanged in this phase. `super_admin` remains the stored value
 * for the Owner ("Owner" is a display label only — APS-044 §11).
 */
export type UserRole =
  | "patient"
  | "super_admin"
  | "doctor"
  | "receptionist"
  | "practice_manager"
  | "nurse"
  | "technician";

// ---------------------------------------------------------------------------
// Identity predicates
// ---------------------------------------------------------------------------

export function isPatient(role: string): boolean {
  return role === "patient";
}

export function isDoctor(role: string): boolean {
  return role === "doctor";
}

export function isReceptionist(role: string): boolean {
  return role === "receptionist";
}

export function isSuperAdmin(role: string): boolean {
  return role === "super_admin";
}

// Batch D · D2: the three roles activated from the dormant union. Predicates
// stay here so every role comparison remains centralized (no `role === "..."`
// literals outside this module).
export function isPracticeManager(role: string): boolean {
  return role === "practice_manager";
}

export function isNurse(role: string): boolean {
  return role === "nurse";
}

export function isTechnician(role: string): boolean {
  return role === "technician";
}

// ---------------------------------------------------------------------------
// Capabilities (Sprint 1 rules, verbatim)
// ---------------------------------------------------------------------------

/** May use the /staff reception surface and its APIs. */
export function canAccessReception(role: string): boolean {
  return isReceptionist(role) || isSuperAdmin(role);
}

/**
 * May mutate appointments through the reception endpoints (check-in, status,
 * walk-in, reordering). Today this is the same population as
 * canAccessReception — kept as a separate capability because the two are
 * expected to diverge (e.g. read-only reception viewers).
 */
export function canManageAppointments(role: string): boolean {
  return canAccessReception(role);
}

/**
 * May use the doctor console. NOTE: Sprint 1 does not enforce this anywhere
 * — /doctor and PATCH /api/appointments/[id] are unauthenticated (see
 * docs/architecture-audit.md L3). The helper exists so the first sprint
 * that adds doctor sessions has one switch to flip.
 */
export function canAccessDoctorWorkspace(role: string): boolean {
  return isDoctor(role) || isSuperAdmin(role);
}

/** May use the patient workspace (APS-029/010 Sprint 1 — real server sessions, not localStorage). */
export function canAccessPatientWorkspace(role: string): boolean {
  return isPatient(role);
}

/** May use the super-admin workspace portal. */
export function canAccessAdminPortal(role: string): boolean {
  return isSuperAdmin(role);
}

// ---------------------------------------------------------------------------
// Capabilities — the Adaptive Workspace permission model (Sprint 2, Batch 2)
//
// Blueprint §3.2 (authoritative): a solo practitioner is structurally locked
// out of reception/billing because the predicates above key off a single
// role string. The approved design is ADDITIVE — a StaffProfile may be
// granted capabilities beyond its base role's defaults, and access checks
// consult the resulting set — NOT a parallel "solo mode" fork. A plain doctor
// granted `reception` can run the front desk; when a solo practitioner later
// hires a receptionist, the grant is simply not given, and each account's
// workspace narrows to its own effective set. No migration, ever.
//
// Backward compatibility: role defaults reproduce today's rules VERBATIM, so
// an ungranted account behaves exactly as before.
// ---------------------------------------------------------------------------

/** The workspace surfaces access can be granted to. */
export const WORKSPACE_CAPABILITIES = [
  "reception", // reception desk: queue, check-in, walk-in, billing, lab worklist
  "doctor_workspace", // clinical: consultation, prescriptions, schedule
  "admin_portal", // organization owner portal
  "patient_workspace", // patient portal (never granted to staff; here for completeness)
  // Batch D · D2: the Technician's workflow container. Deliberately NARROWER
  // than `reception` — it opens the /staff surface for diagnostics work WITHOUT
  // conferring the reception-gated actions (billing, booking, consultation), so
  // activating the Technician role can never over-grant front-desk authority.
  "diagnostics", // diagnostics/results worklist on the /staff surface
] as const;

export type Capability = (typeof WORKSPACE_CAPABILITIES)[number];

/**
 * The capabilities each base role holds by default.
 *
 * Batch D · D2 activates the three roles onto their FROZEN surfaces (C2):
 * Practice Manager → /admin (admin_portal), Nurse → /doctor (doctor_workspace,
 * alongside the Doctor — surfaces are workflow containers, not per-role apps),
 * Technician → /staff (the narrow `diagnostics` capability, never `reception`).
 * These grant SURFACE ACCESS; which ACTIONS each may take inside is governed by
 * the C2 permission model (`permissionsForRole`), so no role is over-granted by
 * sharing a surface.
 */
export function defaultCapabilitiesForRole(role: string): Capability[] {
  if (isSuperAdmin(role)) return ["reception", "doctor_workspace", "admin_portal"];
  if (isPracticeManager(role)) return ["admin_portal"];
  if (isDoctor(role)) return ["doctor_workspace"];
  if (isNurse(role)) return ["doctor_workspace"];
  if (isReceptionist(role)) return ["reception"];
  if (isTechnician(role)) return ["diagnostics"];
  if (isPatient(role)) return ["patient_workspace"];
  return [];
}

/**
 * Parses the JSON array stored in `StaffProfile.capabilities` into a validated
 * capability list. Tolerant by design — a null/blank/malformed value or any
 * unknown entry is simply ignored (grants can only ADD known capabilities,
 * never corrupt the check), so a bad row degrades to role defaults.
 */
export function parseCapabilities(raw: string | null | undefined): Capability[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const known = WORKSPACE_CAPABILITIES as readonly string[];
  return parsed.filter((c): c is Capability => typeof c === "string" && known.includes(c));
}

/** Role defaults ∪ granted capabilities — the account's effective access set. */
export function effectiveCapabilities(role: string, grantedRaw?: string | null): Capability[] {
  const set = new Set<Capability>(defaultCapabilitiesForRole(role));
  for (const c of parseCapabilities(grantedRaw)) set.add(c);
  return [...set];
}

export function hasCapability(capability: Capability, capabilities: Capability[]): boolean {
  return capabilities.includes(capability);
}

// ---------------------------------------------------------------------------
// Permissions — the action-level RBAC model (C2, FROZEN 2026-07-18)
//
// WORKSPACE_CAPABILITIES above decide which SURFACE a member opens; permissions
// decide which ACTIONS they may take once there — the finer grain the frozen C2
// matrix requires. Two roles can share a surface yet differ in authority:
//   - Practice Manager shares the Owner cockpit but may VIEW clinical records,
//     never EDIT them, and can never touch the plan or grant ownership.
//   - Nurse works the clinical surface but may write vitals, never a diagnosis.
// So permissions key off the ROLE, not the coarse surface capability.
//
// Batch D1 (this milestone): the taxonomy + `permissionsForRole` +
// `effectivePermissions` + `can` are defined and unit-tested against the frozen
// matrix, but NOT yet wired into endpoints. Role activation (capability bundles
// + surface resolution for practice_manager / nurse / technician) is D2; the
// dormant roles therefore still resolve to no surface until then.
//
// Guiding principle #7 ("visibility should exceed authority"): where a role
// touches a domain at all, it far more often gets `view` than a write verb.
// ---------------------------------------------------------------------------

/** Every action-level permission the frozen C2 matrix distinguishes. */
export const PERMISSIONS = [
  // Front desk
  "appointments:manage", // queue, check-in, walk-in, status, reorder
  "appointments:view",
  "patients:manage", // register + edit demographic/contact records
  "patients:view",
  // Clinical — a business concept distinct from Patient Management (C2 amend #2)
  "clinical_records:view", // read consultation history & notes
  "clinical_records:edit", // amend the clinical record (clinicians only)
  "consultation:write", // notes, diagnosis, prescription
  "vitals:write", // vitals, allergies, chief complaint, preparation notes
  "diagnostics:view",
  "diagnostics:order",
  "diagnostics:results:write", // enter test/lab results (technician)
  // Money
  "billing:manage",
  "payments:collect", // doctor: not a default — granted per clinic policy (amend #4)
  // Scheduling
  "schedule:view",
  "schedule:own", // manage one's own availability
  "schedule:manage", // manage any clinician's schedule
  // Intelligence
  "reports:own", // one's own operational figures (amend #3)
  "reports:org", // organization-wide analytics / command center
  // Team & ownership
  "team:manage", // invite, provision, suspend, archive, resend (amend #5)
  "team:assign_owner", // grant/revoke ownership — owner-only, never delegated
  // Practice
  "plan:manage", // subscription — owner-only (legal owner)
  "settings:manage",
  "practice_profile:own",
  "audit:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const OWNER_PERMISSIONS: Permission[] = [...PERMISSIONS];

// Role → default permissions, transcribed VERBATIM from the frozen C2 matrix.
// Solo-first extensions (e.g. a doctor who also collects payments) ride on the
// capability GRANT mechanism below — they are not baked into a base role.
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Owner — full authority, incl. the two never-delegated powers.
  super_admin: OWNER_PERMISSIONS,

  // Practice Manager — full operations; NO clinical write; NO plan; NO owner grant.
  practice_manager: [
    "appointments:manage",
    "appointments:view",
    "patients:manage",
    "patients:view",
    "clinical_records:view", // view only (amend #1)
    "diagnostics:view",
    "billing:manage",
    "payments:collect",
    "schedule:view",
    "schedule:manage",
    "reports:own",
    "reports:org",
    "team:manage", // suspend/archive/resend — but NOT team:assign_owner (amend #5)
    "settings:manage",
    "practice_profile:own",
    "audit:view",
  ],

  // Doctor — clinical authority + own schedule/reports. Payments/billing come
  // only via a grant (amend #4), never as a base default.
  doctor: [
    "appointments:view",
    "patients:view",
    "clinical_records:view",
    "clinical_records:edit",
    "consultation:write",
    "vitals:write",
    "diagnostics:view",
    "diagnostics:order",
    "schedule:view",
    "schedule:own",
    "reports:own", // own reports, not org analytics (amend #3)
    "practice_profile:own",
  ],

  // Receptionist — front desk + money; explicitly NO clinical (amend #2 hard line).
  receptionist: [
    "appointments:manage",
    "appointments:view",
    "patients:manage",
    "patients:view",
    "billing:manage",
    "payments:collect",
    "schedule:view",
  ],

  // Nurse — clinical assist: vitals/allergies/chief-complaint/prep only.
  // NO diagnosis, prescriptions, or treatment plans (amend #2 expanded).
  nurse: [
    "appointments:view",
    "patients:view",
    "clinical_records:view",
    "vitals:write",
    "diagnostics:view",
    "schedule:view",
  ],

  // Technician — diagnostics results entry only. No diagnosis.
  technician: ["patients:view", "diagnostics:view", "diagnostics:results:write"],

  // Patient — holds no staff permission in this matrix.
  patient: [],
};

// A granted surface capability confers the front-desk action set — this is the
// solo/configurable case (amend #4): a doctor granted `reception` may collect
// payments and run billing, without changing their base clinical role. Only the
// reception grant crosses roles this way today; other surfaces add nothing a
// base role doesn't already carry.
const CAPABILITY_PERMISSIONS: Partial<Record<Capability, Permission[]>> = {
  reception: [
    "appointments:manage",
    "appointments:view",
    "patients:manage",
    "patients:view",
    "billing:manage",
    "payments:collect",
    "schedule:view",
  ],
};

/** The permissions a base role holds by default — the frozen C2 matrix, verbatim. */
export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Role defaults ∪ permissions conferred by GRANTED capabilities — the account's
 * effective authority. Mirrors `effectiveCapabilities`: an ungranted account
 * gets exactly its role defaults, so behaviour is unchanged until a grant is
 * added. This is how a solo owner-doctor (or a doctor a clinic lets collect
 * payments) gains front-desk authority without a role change.
 */
export function effectivePermissions(role: string, grantedRaw?: string | null): Permission[] {
  const set = new Set<Permission>(permissionsForRole(role));
  for (const cap of parseCapabilities(grantedRaw)) {
    for (const p of CAPABILITY_PERMISSIONS[cap] ?? []) set.add(p);
  }
  return [...set];
}

/** True when the role (plus any granted capabilities) carries the permission. */
export function can(permission: Permission, role: string, grantedRaw?: string | null): boolean {
  return effectivePermissions(role, grantedRaw).includes(permission);
}

/** True when the permission set contains the permission. */
export function hasPermission(permission: Permission, permissions: Permission[]): boolean {
  return permissions.includes(permission);
}

/**
 * Batch D · D3: OPERATIONAL organization authority — may run the practice
 * (team, settings, reports, scheduling). Deliberately expressed through the
 * permission model rather than a role-name check, so it stays honest to the
 * frozen C2 matrix: it admits the Owner and the Practice Manager, and no one
 * else. The LEGAL-owner actions (plan/subscription, ownership transfer, org
 * deletion) are NOT gated by this — they are gated by legal ownership
 * (Organization.owner_user_id), a data fact resolved per request, never by role.
 * This is the separation the ownership model freezes: many may operate the
 * practice; exactly one owns it.
 */
export function canAdministerOrganization(role: string): boolean {
  return can("settings:manage", role);
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/**
 * Where each role lands after a B2B login (the map previously inlined in
 * src/app/login/page.tsx). Returns null for roles with no B2B workspace.
 */
export function defaultWorkspacePathForRole(role: string): string | null {
  // Solo-first (2026-07-12): an independent-clinic owner lands in their own
  // solo workspace (/clinic) — the daily driver, matching the /start onboarding
  // which also ends at /clinic. The org Command Center (/admin) stays reachable
  // by URL for multi-clinic; revisit role→landing when multi-clinic ships.
  //
  // BRD-043 Sprint 3 ("one product", adaptive dashboard): invited Doctors and
  // Receptionists now land in the SAME adaptive /clinic surface — no separate
  // per-role workspace, no switching. The legacy multi-clinic /doctor and
  // /staff route trees remain reachable by URL (not removed) but are no longer
  // the default landing for a solo/professional clinic's team.
  if (isSuperAdmin(role)) return "/clinic";
  if (isDoctor(role)) return "/clinic";
  if (isReceptionist(role)) return "/clinic";
  return null;
}

/**
 * APS-045 §6 — the capability-driven Surface resolver. Maps an active
 * membership's EFFECTIVE capabilities (+ whether its clinic is single-member) to
 * the surface it opens into. This is the principled replacement for the
 * "everyone → /clinic" default above; it is wired into login/switch in a later
 * Batch C milestone (the default is kept until then).
 *
 *   - solo (single-member clinic AND the full capability set) → consolidated /clinic
 *   - admin_portal            → Owner / Practice-Manager cockpit  /admin
 *   - doctor_workspace        → Doctor / Nurse clinical workspace  /doctor
 *   - reception | diagnostics → Reception / Technician workspace   /staff
 *   - none of the above       → null (no staff surface)
 *
 * Pure — the "grow into a team" transition falls out for free: a solo
 * owner-doctor resolves to /clinic while their clinic has one member, and to the
 * cockpit the moment a second joins (isSoloClinic flips). Batch D · D2 completes
 * the mapping for all six roles: surfaces are workflow CONTAINERS (a Nurse joins
 * the Doctor on /doctor, a Technician the Reception surface on /staff), with the
 * C2 permission model — not the surface — deciding what each may do there.
 */
export function resolveSurfacePath(
  capabilities: Capability[],
  isSoloClinic: boolean
): string | null {
  const has = (c: Capability) => capabilities.includes(c);
  if (isSoloClinic && has("reception") && has("doctor_workspace") && has("admin_portal")) {
    return "/clinic";
  }
  if (has("admin_portal")) return "/admin";
  if (has("doctor_workspace")) return "/doctor";
  if (has("reception") || has("diagnostics")) return "/staff";
  return null;
}
