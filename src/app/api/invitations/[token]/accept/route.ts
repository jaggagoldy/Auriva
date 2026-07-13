import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from '@/api/http';
import { createSession, setSessionCookie } from '@/api/session';
import { acceptInvitation } from '@/services/onboarding-service';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

// POST /api/invitations/[token]/accept — public: the invitee sets a password
// and their account + staff profile + membership are created; a session is
// opened so they land in their workspace (WF-23/24).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // BRD-043 US-103 (Sprint 1): unauthenticated, bearer-token-shaped
    // endpoint — throttle by the token itself (repeated guesses against one
    // invite) and by IP (distributed attempts), same two-dimension pattern
    // as auth/login.
    const rateLimit = checkRateLimit([
      { key: `invite-accept:token:${token}`, limit: 5, windowMs: 60 * 60 * 1000 },
      { key: `invite-accept:ip:${clientIp(request)}`, limit: 10, windowMs: 60 * 60 * 1000 },
    ]);
    if (!rateLimit.allowed) {
      return tooManyRequests('Too many attempts. Please try again later.', rateLimit.retryAfterSeconds);
    }

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
