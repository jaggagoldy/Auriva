import { notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getClinicOverview } from "@/services/clinic-workspace-service";

// Milestone 1 Batch 4: the My Clinic home data — identity, Accepting Bookings,
// booking path, and Clinic Ready (steps + percent + next action). Scoped to the
// caller's own clinic; reception-capable (owner + front desk).
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const overview = await getClinicOverview(auth.clinicId, auth.session.userId);
    if (!overview) return notFound("Clinic not found.");
    return ok(overview);
  } catch (error) {
    return serverError("Error loading clinic overview", error);
  }
}
