import { NextRequest } from "next/server";
import { mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import prisma from "@/lib/prisma";
import { archiveMember, getArchiveConflicts, reassignmentTargets } from "@/services/membership-service";

// BRD-043 US-403/404/405 (Sprint 4): archive a team member.
//
// GET  → the conflict-check (US-403): future appointments / active
//        consultation that must be reassigned first, plus the valid
//        reassignment targets. Empty conflicts ⇒ the UI shows the simple
//        confirm (US-405); non-empty ⇒ the reconciliation dialog (US-404).
// POST → performs the archive (US-404/405). Body: { reassignments: { <appt
//        id>: <active doctor staffId> } }. Atomic; rejects (409) if any
//        conflict is left uncovered.
//
// Owner / Managing Doctor only. Clinic-scoped.

async function resolveMemberClinic(staffId: string, callerClinicId: string) {
  const profile = await prisma.staffProfile.findUnique({
    where: { id: staffId },
    select: { clinic_id: true, clinic: { select: { organization_id: true } } },
  });
  // Must belong to the caller's own clinic.
  if (!profile || profile.clinic_id !== callerClinicId) return null;
  return { organizationId: profile.clinic.organization_id, clinicId: profile.clinic_id };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;
    const member = await resolveMemberClinic(staffId, auth.clinicId);
    if (!member) return ok({ conflicts: [], targets: [] });

    const [conflicts, targets] = await Promise.all([
      getArchiveConflicts(staffId),
      reassignmentTargets(member.clinicId, staffId),
    ]);
    return ok({ conflicts, targets });
  } catch (error) {
    return serverError("Error checking archive conflicts", error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params;
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;
    const member = await resolveMemberClinic(staffId, auth.clinicId);
    if (!member) return serverError("Team member not found in this clinic", new Error("not found"));

    const body = await request.json().catch(() => ({}));
    const reassignments =
      body.reassignments && typeof body.reassignments === "object" ? body.reassignments : {};

    const result = await archiveMember({
      organizationId: member.organizationId,
      staffProfileId: staffId,
      actorUserId: auth.session.userId,
      reassignments,
    });
    return ok({ staff_id: result.id, membership_status: result.membership_status });
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error archiving team member", error);
  }
}
