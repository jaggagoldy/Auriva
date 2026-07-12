import { NextRequest } from "next/server";
import { getCurrentSession, requirePlatformAdminContext } from "@/api/session";
import { badRequest, mapDomainError, notFound, ok, serverError, unauthorized } from "@/api/http";
import { isPlainObject } from "@/api/validation";
import { getRelease, toPublicView, updateRelease } from "@/services/release-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) return unauthorized("Sign in to continue.");

    const { id } = await params;
    const release = await getRelease(id);
    if (!release) return notFound("Release not found.");

    const auth = await requirePlatformAdminContext();
    if (auth.ok) return ok(release);

    // Non-platform-admins may only ever see a published release.
    if (release.status !== "published") return notFound("Release not found.");
    return ok(toPublicView(release));
  } catch (error) {
    return serverError("Error fetching release", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    if (!isPlainObject(body)) return badRequest("Request body is required.");

    const release = await updateRelease(id, {
      name: body.name,
      summary: body.summary,
      publicNotes: body.public_notes,
      internalNotes: body.internal_notes,
      breakingChanges: body.breaking_changes,
      migrationNotes: body.migration_notes,
      knownIssues: body.known_issues,
      releaseDate: body.release_date ? new Date(body.release_date) : body.release_date,
      apsItems: body.aps_items,
      sprintNumbers: body.sprint_numbers,
      featureFlags: body.feature_flags,
      highlights: body.highlights,
    });
    return ok(release);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating release", error);
  }
}
