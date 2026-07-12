import { getCurrentSession } from "@/api/session";
import { mapDomainError, ok, serverError, unauthorized } from "@/api/http";
import { markReleaseViewed } from "@/services/release-service";

/** Marks a published release as seen by the current user — any
 * authenticated role (patient, doctor, receptionist, super_admin). Backs
 * the What's New bell's unread badge. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) return unauthorized("Sign in to continue.");

    const { id } = await params;
    const view = await markReleaseViewed(id, session.userId);
    return ok(view);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error marking release as viewed", error);
  }
}
