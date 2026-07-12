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

/** The values stored in Users.role today. */
export type UserRole = "patient" | "super_admin" | "doctor" | "receptionist";

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
  if (isSuperAdmin(role)) return "/clinic";
  if (isDoctor(role)) return "/doctor";
  if (isReceptionist(role)) return "/staff/dashboard";
  return null;
}
