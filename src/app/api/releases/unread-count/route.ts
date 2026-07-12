import { getCurrentSession } from "@/api/session";
import { ok, serverError, unauthorized } from "@/api/http";
import { countUnviewedReleases } from "@/services/release-service";

/** Backs the What's New bell badge — any authenticated role. */
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return unauthorized("Sign in to continue.");

    const count = await countUnviewedReleases(session.userId);
    return ok({ count });
  } catch (error) {
    return serverError("Error counting unread releases", error);
  }
}
