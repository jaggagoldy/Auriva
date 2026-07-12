import { NextRequest } from 'next/server';
import { mapDomainError, ok, serverError } from '@/api/http';
import { getInvitationByToken } from '@/services/onboarding-service';

// GET /api/invitations/[token] — public: the accept page reads the invite to
// show who's inviting, the role, and the org (APS-044). Only non-sensitive
// fields are returned.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);
    return ok({
      email: invitation.email,
      full_name: invitation.full_name,
      role: invitation.role,
      specialty: invitation.specialty,
      status: invitation.status,
      organization: invitation.organization,
    });
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error loading invitation', error);
  }
}
