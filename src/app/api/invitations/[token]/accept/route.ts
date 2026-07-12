import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { createSession, setSessionCookie } from '@/api/session';
import { acceptInvitation } from '@/services/onboarding-service';

// POST /api/invitations/[token]/accept — public: the invitee sets a password
// and their account + staff profile + membership are created; a session is
// opened so they land in their workspace (WF-23/24).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { password } = await request.json();
    if (!password) return badRequest('A password is required.');

    const { user } = await acceptInvitation({ token, password });

    const { rawToken, expires_at } = await createSession(user.id, user.role);
    await setSessionCookie(rawToken, expires_at);

    return ok({ user: { id: user.id, email: user.email, role: user.role } }, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error accepting invitation', error);
  }
}
