import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/api/http";
import { getCurrentSession } from "@/api/session";
import { switchWorkspace, WorkspaceAccessError } from "@/services/workspace-service";

// Batch A · A3: switch the session's active workspace (membership). The service
// resolves the membership scoped to the caller, so a membership the caller
// doesn't hold is rejected as forbidden — no tenant leakage. No token is
// reissued; the server-resolved active_membership_id is the trust boundary.
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) return unauthorized("Sign in to continue.");

    const { membership_id } = await request.json();
    if (typeof membership_id !== "string" || !membership_id) {
      return badRequest("membership_id is required.");
    }

    try {
      const workspace = await switchWorkspace({
        sessionId: session.sessionId,
        userId: session.userId,
        membershipId: membership_id,
      });
      return ok({ success: true, workspace });
    } catch (error) {
      if (error instanceof WorkspaceAccessError) return forbidden(error.message);
      throw error;
    }
  } catch (error) {
    return serverError("Error switching workspace", error);
  }
}
