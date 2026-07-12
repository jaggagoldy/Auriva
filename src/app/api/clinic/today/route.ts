import { ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getTodayAppointments } from "@/services/clinic-workspace-service";

// Milestone 1 Batch 4: today's schedule for the workspace's action-oriented
// Today screen. Scoped to the caller's own clinic; reception-capable.
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    return ok(await getTodayAppointments(auth.clinicId, auth.session.userId));
  } catch (error) {
    return serverError("Error loading today's schedule", error);
  }
}
