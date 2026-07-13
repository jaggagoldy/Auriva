import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import prisma from "@/lib/prisma";
import { reactivateMember, suspendMember } from "@/services/membership-service";

// BRD-043 US-402 (Sprint 4): suspend / reactivate a team member. Owner /
// Managing Doctor only. Clinic-scoped. Idempotent (repeating a transition
// is a clean no-op — see membership-service). The Owner's own row is
// rejected server-side, not merely hidden in the UI.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const status = body.membership_status;
    if (status !== "active" && status !== "suspended") {
      return badRequest("membership_status must be 'active' or 'suspended'. Archiving uses the archive endpoint.");
    }

    // Ensure the target belongs to the caller's clinic (defense in depth —
    // the service re-checks org ownership too).
    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: { organization_id: true },
    });
    const organizationId = clinic?.organization_id ?? "";

    const result =
      status === "suspended"
        ? await suspendMember({ organizationId, staffProfileId: staffId, actorUserId: auth.session.userId })
        : await reactivateMember({ organizationId, staffProfileId: staffId, actorUserId: auth.session.userId });

    return ok({ staff_id: result.id, membership_status: result.membership_status });
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating team member", error);
  }
}
