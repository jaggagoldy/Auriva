import { NextRequest } from 'next/server';
import { mapDomainError, ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { revokeInvitation } from '@/services/onboarding-service';

// DELETE — revoke a pending invitation (APS-044, org-scoped since Sprint 3). Owner only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { id, inviteId } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    await revokeInvitation(inviteId, auth.organizationId);
    return ok({ success: true });
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error revoking invitation', error);
  }
}
