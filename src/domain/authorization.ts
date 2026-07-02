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

/** May use the super-admin workspace portal. */
export function canAccessAdminPortal(role: string): boolean {
  return isSuperAdmin(role);
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/**
 * Where each role lands after a B2B login (the map previously inlined in
 * src/app/login/page.tsx). Returns null for roles with no B2B workspace.
 */
export function defaultWorkspacePathForRole(role: string): string | null {
  if (isSuperAdmin(role)) return "/admin";
  if (isDoctor(role)) return "/doctor";
  if (isReceptionist(role)) return "/staff/dashboard";
  return null;
}
