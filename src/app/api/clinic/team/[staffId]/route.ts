import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { canAdministerOrganization } from "@/domain/authorization";
import prisma from "@/lib/prisma";
import { assignMemberRole, reactivateMember, suspendMember } from "@/services/membership-service";

// BRD-043 US-402 (Sprint 4) + D4 role assignment: update a team member. Owner /
// Practice Manager only (canAdministerOrganization / team:manage). Clinic-scoped,
// idempotent. Two operations on one endpoint:
//   { role: <staff role> }          → D4 role assignment (Users.role +
//                                       Organization_Members.role in one write)
//   { membership_status: active|suspended } → suspend / reactivate
// The Owner's own row is rejected server-side for both, not merely hidden.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const auth = await requireStaffContext(canAdministerOrganization);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));

    // Ensure the target belongs to the caller's clinic (defense in depth —
    // the service re-checks org ownership too).
    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: { organization_id: true },
    });
    const organizationId = clinic?.organization_id ?? "";

    // D4: role assignment.
    if (typeof body.role === "string") {
      const updated = await assignMemberRole({
        organizationId,
        staffProfileId: staffId,
        actorUserId: auth.session.userId,
        newRole: body.role,
        specialty: body.specialty ?? null,
      });
      return ok({ staff_id: updated.id, role: body.role });
    }

    const status = body.membership_status;
    if (status !== "active" && status !== "suspended") {
      return badRequest("Provide a role, or membership_status 'active'|'suspended'. Archiving uses the archive endpoint.");
    }

    const result =
      status === "suspended"
        ? await suspendMember({ organizationId, staffProfileId: staffId, actorUserId: auth.session.userId })
        : await reactivateMember({ organizationId, staffProfileId: staffId, actorUserId: auth.session.userId });

    return ok({ staff_id: result.id, membership_status: result.membership_status });
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating team member", error);
  }
}
