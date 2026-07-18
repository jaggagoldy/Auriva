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
] as const;

export type Capability = (typeof WORKSPACE_CAPABILITIES)[number];

/** The capabilities each base role holds by default — today's rules, verbatim. */
export function defaultCapabilitiesForRole(role: string): Capability[] {
  if (isSuperAdmin(role)) return ["reception", "doctor_workspace", "admin_portal"];
  if (isDoctor(role)) return ["doctor_workspace"];
  if (isReceptionist(role)) return ["reception"];
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
 *   - doctor_workspace        → Doctor workspace                  /doctor
 *   - reception               → Reception workspace               /staff
 *   - none of the above       → null (no staff surface)
 *
 * Pure — the "grow into a team" transition falls out for free: a solo
 * owner-doctor resolves to /clinic while their clinic has one member, and to the
 * cockpit the moment a second joins (isSoloClinic flips). Nurse/Technician/
 * Practice-Manager surfaces follow once their capability bundles are frozen
 * (ERA-001 C2, Batch D); the four live roles resolve today.
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
  if (has("reception")) return "/staff";
  return null;
}
