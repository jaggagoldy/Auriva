import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { createInvitation, listPendingInvitations } from '@/services/onboarding-service';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

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

    // BRD-043 US-103 (Sprint 1): an invite token is a bearer credential to
    // create a staff account — same reasoning as quick-setup's account
    // creation, throttled by org and by IP (see the Feasibility Report's
    // mandatory security-gap finding).
    const rateLimit = checkRateLimit([
      { key: `invite-create:org:${id}`, limit: 20, windowMs: 60 * 60 * 1000 },
      { key: `invite-create:ip:${clientIp(request)}`, limit: 30, windowMs: 60 * 60 * 1000 },
    ]);
    if (!rateLimit.allowed) {
      return tooManyRequests('Too many invitations sent. Please try again later.', rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    if (!body.clinic_id) {
      return badRequest('clinic_id is required — which branch this invite assigns the staff member to.');
    }
    const invitation = await createInvitation({
      organizationId: auth.organizationId,
      clinicId: body.clinic_id,
      // BRD-043 US-201 (Sprint 2): phone-first (solo /clinic invite form);
      // email stays supported for the legacy /admin path. createInvitation
      // requires at least one of the two.
      email: body.email ?? null,
      phone: body.phone ?? null,
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
