import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { createInvitation, listPendingInvitations } from '@/services/onboarding-service';

// Staff invitations for an organization (APS-044, Sprint 3: org-scoped, not
// clinic-scoped). Owner (super_admin) only. requireOrganizationContext
// validates the caller owns the requested organization.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    return ok(await listPendingInvitations(auth.organizationId));
  } catch (error) {
    return serverError('Error listing invitations', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!body.clinic_id) {
      return badRequest('clinic_id is required — which branch this invite assigns the staff member to.');
    }
    const invitation = await createInvitation({
      organizationId: auth.organizationId,
      clinicId: body.clinic_id,
      email: body.email,
      fullName: body.full_name,
      role: body.role,
      specialty: body.specialty ?? null,
      actorUserId: auth.session.userId,
    });
    return ok(invitation, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating invitation', error);
  }
}
