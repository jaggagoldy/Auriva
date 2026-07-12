import { NextRequest } from "next/server";
import { requirePlatformAdminContext } from "@/api/session";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { isPlainObject } from "@/api/validation";
import { createSprint, listSprints } from "@/services/sprint-service";

/** Platform-admin only, like Release authoring — Sprint metadata exists to
 * tag Releases with what fed them, not as a customer-facing surface. */
export async function GET() {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    return ok(await listSprints());
  } catch (error) {
    return serverError("Error listing sprints", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!isPlainObject(body)) return badRequest("Request body is required.");

    const sprint = await createSprint({
      number: body.number,
      goal: body.goal,
      startDate: body.start_date ? new Date(body.start_date) : null,
      endDate: body.end_date ? new Date(body.end_date) : null,
      apsItems: body.aps_items ?? undefined,
      notes: body.notes ?? null,
    });
    return ok(sprint, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error creating sprint", error);
  }
}
