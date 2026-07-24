import { serverError, ok, notFound } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { isSuperAdmin, isDoctor, isReceptionist } from "@/domain/authorization";
import { getDashboard } from "@/services/dashboard-service";

// BRD-043 US-301 (Sprint 3): the single adaptive dashboard endpoint. Any
// staff member of the clinic may call it; the SERVER decides the payload
// shape from their role (see dashboard-service). A Doctor's response never
// contains financial/team fields — enforced there, contract-tested.
//
// Authorized for all three staff roles (owner/doctor/receptionist), not a
// single capability, because a plain Doctor lacks the `reception` capability
// yet still needs their own clinical dashboard.
const anyStaff = (role: string) => isSuperAdmin(role) || isDoctor(role) || isReceptionist(role);

export async function GET() {
  try {
    const auth = await requireStaffContext(anyStaff);
    if (!auth.ok) return auth.response;

    const data = await getDashboard(auth.clinicId, auth.session.userId);
    if (!data) return notFound("Clinic not found.");
    return ok(data);
  } catch (error) {
    return serverError("Error loading dashboard", error);
  }
}
