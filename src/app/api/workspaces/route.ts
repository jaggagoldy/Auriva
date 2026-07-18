import { ok, serverError, unauthorized } from "@/api/http";
import { getCurrentSession } from "@/api/session";
import { listWorkspacesForUser } from "@/services/workspace-service";

// Batch A · A3: the caller's workspaces (memberships) for the Workspace Selector
// (UXS-043 Package 1). Self-scoped — only the caller's own memberships are ever
// returned. `active_membership_id` tells the client which one the session is
// currently in (or null → the selector opens fresh).
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return unauthorized("Sign in to continue.");
    return ok({
      workspaces: await listWorkspacesForUser(session.userId),
      active_membership_id: session.activeMembershipId,
    });
  } catch (error) {
    return serverError("Error listing workspaces", error);
  }
}
