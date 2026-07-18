// Batch A · A3 (SAD-043 §3/§5/§6 · APS-044 §13a): the workspace session spine.
//
// A staff member's set of workspaces is their ACTIVE StaffProfiles — each is a
// membership, one per clinic (exactly one today; N after Batch B relaxes the
// 1:1). Listing and switching are strictly SELF-SCOPED: every query is filtered
// by the caller's own user_id, so a caller can only ever see or switch into a
// membership they actually hold. That is the concrete enforcement of the
// Membership Isolation Rule (APS-044 §13a) — no other tenant's clinic is
// reachable through any account.

import prisma from "@/lib/prisma";
import { effectiveCapabilities, resolveSurfacePath } from "@/domain/authorization";

export class WorkspaceAccessError extends Error {}

export interface WorkspaceSummary {
  membershipId: string;
  clinicId: string;
  clinicName: string;
  organizationId: string;
  // Display role from the codebase's established doctor signal (specialty ≠ null).
  // The frozen six-role capability model is wired in Batch D (ERA-001 C2).
  role: "doctor" | "receptionist";
  specialty: string | null;
}

function toSummary(p: {
  id: string;
  clinic_id: string;
  specialty: string | null;
  clinic: { name: string; organization_id: string };
}): WorkspaceSummary {
  return {
    membershipId: p.id,
    clinicId: p.clinic_id,
    clinicName: p.clinic.name,
    organizationId: p.clinic.organization_id,
    role: p.specialty ? "doctor" : "receptionist",
    specialty: p.specialty,
  };
}

/** The caller's own workspaces (memberships) for the Workspace Selector. */
export async function listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
  const profiles = await prisma.staffProfile.findMany({
    where: { user_id: userId, membership_status: "active" },
    include: { clinic: { select: { name: true, organization_id: true } } },
    orderBy: { clinic: { name: "asc" } },
  });
  return profiles.map(toSummary);
}

/**
 * Switch the session's active workspace. Isolation: the membership is resolved
 * scoped to the CALLER (user_id + active) — a membership that isn't theirs, or
 * is suspended/archived, is indistinguishable from one that doesn't exist, so a
 * switch can never reach another account's / tenant's clinic. Persists the
 * session-scoped selection AND the user-level "remember last workspace" pointer
 * (APS-045 §10). No token is reissued — the server-resolved active_membership_id
 * is the trust boundary (SAD-043 §6).
 */
export async function switchWorkspace(input: {
  sessionId: string;
  userId: string;
  membershipId: string;
}): Promise<WorkspaceSummary> {
  const profile = await prisma.staffProfile.findFirst({
    where: { id: input.membershipId, user_id: input.userId, membership_status: "active" },
    include: { clinic: { select: { name: true, organization_id: true } } },
  });
  if (!profile) {
    throw new WorkspaceAccessError("That workspace is not available to you.");
  }

  await prisma.$transaction([
    prisma.session.update({
      where: { id: input.sessionId },
      data: { active_membership_id: profile.id },
    }),
    prisma.user.update({
      where: { id: input.userId },
      data: { last_workspace_id: profile.id },
    }),
  ]);

  return toSummary(profile);
}

/**
 * The membership a staff request is acting under — the resolution seam.
 *
 * Backed by StaffProfile TODAY (SAD-043 §9.3), but every caller depends on this
 * shape, NOT on StaffProfile, so the backing store can evolve (e.g. a dedicated
 * Membership entity) without touching request-boundary code. Keep this the only
 * place the "membership = StaffProfile" assumption lives.
 */
export interface ResolvedMembership {
  membershipId: string;
  userId: string;
  clinicId: string;
  capabilitiesRaw: string | null;
  membershipStatus: string;
  mustChangePassword: boolean;
}

/**
 * Resolve the membership a staff session is acting under. Prefers the session's
 * active_membership_id — scoped to the caller (`id` AND `user_id`), so it can
 * never resolve a membership the caller doesn't hold (the isolation guarantee,
 * APS-044 §13a). Falls back to the caller's single active membership when unset
 * (backward-compat + single-clinic today). Status is returned, not filtered, in
 * the active case so the caller can surface a precise "not active" message.
 */
export async function resolveActiveMembership(
  userId: string,
  activeMembershipId: string | null
): Promise<ResolvedMembership | null> {
  const profile = await prisma.staffProfile.findFirst({
    where: activeMembershipId
      ? { id: activeMembershipId, user_id: userId }
      : { user_id: userId, membership_status: "active" },
    include: { user: { select: { must_change_password: true } } },
    orderBy: { id: "asc" }, // deterministic pick for the single-membership fallback
  });
  if (!profile) return null;
  return {
    membershipId: profile.id,
    userId: profile.user_id,
    clinicId: profile.clinic_id,
    capabilitiesRaw: profile.capabilities,
    membershipStatus: profile.membership_status,
    mustChangePassword: profile.user.must_change_password,
  };
}

export interface WorkspaceSurface {
  surfacePath: string | null;
  clinicId: string | null;
}

/**
 * APS-045 §6 — resolve the SURFACE a staff session opens into. Composes the
 * active membership (seam) with its effective capabilities and whether its
 * clinic is single-member (the "solo" signal), then applies resolveSurfacePath.
 * A caller with no staff membership (an owner operating purely via ownership)
 * resolves from their role's default capabilities alone — never "solo
 * consolidated", which requires an owner-doctor membership in a one-person clinic.
 */
export async function getWorkspaceSurface(session: {
  userId: string;
  role: string;
  activeMembershipId: string | null;
}): Promise<WorkspaceSurface> {
  const membership = await resolveActiveMembership(session.userId, session.activeMembershipId);
  if (!membership) {
    const caps = effectiveCapabilities(session.role, null);
    return { surfacePath: resolveSurfacePath(caps, false), clinicId: null };
  }
  const caps = effectiveCapabilities(session.role, membership.capabilitiesRaw);
  const activeMembers = await prisma.staffProfile.count({
    where: { clinic_id: membership.clinicId, membership_status: "active" },
  });
  return {
    surfacePath: resolveSurfacePath(caps, activeMembers === 1),
    clinicId: membership.clinicId,
  };
}

export type Landing =
  | { mode: "direct"; surfacePath: string | null; activeMembershipId: string | null }
  | { mode: "selector"; workspaces: WorkspaceSummary[] };

/**
 * APS-045 §7 — where a staff session lands after authentication. The Selector
 * chooses WHICH workspace, never which screen: the screen always comes from
 * resolveSurface. Decision tree:
 *   - no staff membership (owner via ownership)  → direct → cockpit
 *   - exactly one membership                     → direct → its surface (auto-open, no selector)
 *   - several, last workspace still valid        → direct → remembered workspace's surface
 *   - several, nothing remembered (or stale)     → selector
 */
export async function resolveLanding(session: {
  userId: string;
  role: string;
  activeMembershipId: string | null;
}): Promise<Landing> {
  const workspaces = await listWorkspacesForUser(session.userId);

  if (workspaces.length === 0) {
    const surface = await getWorkspaceSurface(session);
    return { mode: "direct", surfacePath: surface.surfacePath, activeMembershipId: null };
  }

  if (workspaces.length === 1) {
    const only = workspaces[0].membershipId;
    const surface = await getWorkspaceSurface({ ...session, activeMembershipId: only });
    return { mode: "direct", surfacePath: surface.surfacePath, activeMembershipId: only };
  }

  // Several: reuse the remembered workspace when it is STILL VALID (still one of
  // the caller's current memberships), else present the Selector.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { last_workspace_id: true },
  });
  const remembered =
    user?.last_workspace_id && workspaces.some((w) => w.membershipId === user.last_workspace_id)
      ? user.last_workspace_id
      : null;
  if (remembered) {
    const surface = await getWorkspaceSurface({ ...session, activeMembershipId: remembered });
    return { mode: "direct", surfacePath: surface.surfacePath, activeMembershipId: remembered };
  }
  return { mode: "selector", workspaces };
}
