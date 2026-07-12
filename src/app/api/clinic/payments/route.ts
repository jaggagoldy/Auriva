import { ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getTodayPayments } from "@/services/clinic-workspace-service";

// Milestone 1 Batch 5: the Payments screen feed — "What have I collected?".
// Today's recorded payments + totals. reception-capable; own clinic only.
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    return ok(await getTodayPayments(auth.clinicId));
  } catch (error) {
    return serverError("Error loading payments", error);
  }
}
