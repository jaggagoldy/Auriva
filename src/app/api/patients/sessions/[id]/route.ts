import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requirePatientContext, revokeSession } from '@/api/session';

// Sign out one session from Patient Settings — scoped to the caller's own
// account (revokeSession only ever deletes a row matching that user_id).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await revokeSession(id, auth.session.userId);
    return ok({ id });
  } catch (error) {
    return serverError('Error revoking session', error);
  }
}
