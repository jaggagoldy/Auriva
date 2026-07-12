import { NextRequest } from "next/server";
import { requirePlatformAdminContext } from "@/api/session";
import { badRequest, mapDomainError, notFound, ok, serverError } from "@/api/http";
import { isPlainObject } from "@/api/validation";
import { getSprint, updateSprint } from "@/services/sprint-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const { number } = await params;
    const sprint = await getSprint(Number(number));
    if (!sprint) return notFound("Sprint not found.");
    return ok(sprint);
  } catch (error) {
    return serverError("Error fetching sprint", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const auth = await requirePlatformAdminContext();
    if (!auth.ok) return auth.response;

    const { number } = await params;
    const body = await request.json();
    if (!isPlainObject(body)) return badRequest("Request body is required.");

    const sprint = await updateSprint(Number(number), {
      goal: body.goal,
      startDate: body.start_date ? new Date(body.start_date) : body.start_date,
      endDate: body.end_date ? new Date(body.end_date) : body.end_date,
      apsItems: body.aps_items,
      notes: body.notes,
    });
    return ok(sprint);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating sprint", error);
  }
}
