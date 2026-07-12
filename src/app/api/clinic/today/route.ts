import { NextRequest } from "next/server";
import { ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getTodayAppointments, type ScheduleScope } from "@/services/clinic-workspace-service";

// Milestone 1 Batch 4: today's schedule for the workspace's action-oriented
// Today screen. Scoped to the caller's own clinic; reception-capable.
// ?scope=today|upcoming|all controls the displayed list (the hero summary
// stays today-based regardless).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const raw = new URL(request.url).searchParams.get("scope");
    const scope: ScheduleScope = raw === "upcoming" || raw === "all" ? raw : "today";
    return ok(await getTodayAppointments(auth.clinicId, auth.session.userId, scope));
  } catch (error) {
    return serverError("Error loading today's schedule", error);
  }
}
