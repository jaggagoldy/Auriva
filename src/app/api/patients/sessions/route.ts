import { ok, serverError } from '@/api/http';
import { listSessionsForUser, requirePatientContext } from '@/api/session';

// Real active-sessions list for Patient Settings' "Sign-in & security" —
// replaces the static "Coming soon" card with actual Session rows for the
// caller's own account.
export async function GET() {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const sessions = await listSessionsForUser(auth.session.userId);
    return ok(
      sessions.map((s) => ({
        id: s.id,
        created_at: s.created_at,
        expires_at: s.expires_at,
        isCurrent: s.id === auth.session.sessionId,
      }))
    );
  } catch (error) {
    return serverError('Error fetching sessions', error);
  }
}
