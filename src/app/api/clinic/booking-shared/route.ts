import { ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { markBookingShared } from "@/services/clinic-workspace-service";

// Milestone 1 Batch 4: records that the owner shared their booking page, so the
// "Share your booking page" guided-checklist item reflects a real action.
// Scoped to the caller's own clinic; reception-capable.
export async function POST() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const clinic = await markBookingShared(auth.clinicId);
    return ok({ success: true, booking_shared_at: clinic?.booking_shared_at ?? null });
  } catch (error) {
    return serverError("Error recording booking-page share", error);
  }
}
