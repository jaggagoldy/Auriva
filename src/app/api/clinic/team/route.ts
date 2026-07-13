import { ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import prisma from "@/lib/prisma";
import { getTeam } from "@/services/membership-service";

// BRD-043 US-401 (Sprint 4): the Team roster + growth indicator. Owner /
// Managing Doctor only (admin_portal capability). Clinic-scoped to the
// caller's own clinic. Seat numbers are computed live, never cached.
export async function GET() {
  try {
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;
    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: { organization_id: true },
    });
    return ok(await getTeam(auth.clinicId, clinic?.organization_id ?? ""));
  } catch (error) {
    return serverError("Error loading team", error);
  }
}
