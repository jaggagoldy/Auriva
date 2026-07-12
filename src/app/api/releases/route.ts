import { NextRequest } from "next/server";
import { getCurrentSession, requirePlatformAdminContext } from "@/api/session";
import { badRequest, mapDomainError, ok, serverError, unauthorized } from "@/api/http";
import { isPlainObject } from "@/api/validation";
import {
  createRelease,
  listAllReleases,
  listPublishedReleases,
  toPublicView,
} from "@/services/release-service";

/** Platform admins see every release (any status); everyone else — any
 * authenticated staff or patient — sees only published releases, with
 * internal-only fields stripped (the What's New feed). */
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return unauthorized("Sign in to continue.");

    const auth = await requirePlatformAdminContext();
    if (auth.ok) {
      return ok(await listAllReleases());
    }
    const releases = await listPublishedReleases();
    return ok(releases.map(toPublicView));
  } catch (error) {
    return serverError("Error listing releases", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!isPlainObject(body)) return badRequest("Request body is required.");

    const release = await createRelease({
      version: body.version,
      name: body.name,
      summary: body.summary,
      publicNotes: body.public_notes,
      internalNotes: body.internal_notes ?? null,
      breakingChanges: body.breaking_changes ?? null,
      migrationNotes: body.migration_notes ?? null,
      knownIssues: body.known_issues ?? null,
      apsItems: body.aps_items ?? undefined,
      sprintNumbers: body.sprint_numbers ?? undefined,
      featureFlags: body.feature_flags ?? undefined,
      highlights: body.highlights ?? undefined,
      createdByUserId: auth.session.userId,
    });
    return ok(release, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error creating release", error);
  }
}
