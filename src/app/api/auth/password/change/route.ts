import { NextRequest } from "next/server";
import { badRequest, ok, serverError, unauthorized } from "@/api/http";
import { getCurrentSession } from "@/api/session";
import { changePassword, PasswordChangeError } from "@/services/credential-service";
import { logger, withRequestId } from "@/api/logger";
import { recordAudit, resolveOrganizationIdForStaffUser } from "@/lib/audit";

// Batch A (APS-044 §9 / SAD-043 §11): the Mandatory Password Change screen's
// backend (UXS-043 Package 1). Session-authenticated: a member who just signed
// in with a temporary password sets their own. Deliberately NOT gated by
// requireStaffContext — that guard denies staff *resource* access while
// must_change_password is set, but this endpoint is precisely how the member
// clears it, so it must remain reachable.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const session = await getCurrentSession();
      if (!session) return unauthorized("Sign in to continue.");

      const { current_password, new_password } = await request.json();
      if (typeof new_password !== "string" || !new_password) {
        return badRequest("A new password is required.");
      }

      try {
        await changePassword({
          userId: session.userId,
          currentPassword: typeof current_password === "string" ? current_password : null,
          newPassword: new_password,
        });
      } catch (error) {
        if (error instanceof PasswordChangeError) return badRequest(error.message);
        throw error;
      }

      const organizationId = await resolveOrganizationIdForStaffUser(session.userId, session.role);
      await recordAudit({
        organizationId,
        actorUserId: session.userId,
        action: "password_changed",
      });
      logger.info("auth.password.change succeeded", { userId: session.userId });

      return ok({ success: true });
    } catch (error) {
      return serverError("Error changing password", error);
    }
  });
}
