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
