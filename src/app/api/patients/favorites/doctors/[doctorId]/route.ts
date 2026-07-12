import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requirePatientContext } from '@/api/session';
import { addFavoriteDoctor, removeFavoriteDoctor } from '@/services/favorite-service';

// Star / unstar one doctor (Find Care, Doctor Details) — scoped to the
// caller's own active Healthcare Profile, never a client-supplied patient id.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const { doctorId } = await params;
    await addFavoriteDoctor(auth.healthcareProfileId, doctorId);
    return ok({ doctorId, favorited: true });
  } catch (error) {
    return serverError('Error favoriting doctor', error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const { doctorId } = await params;
    await removeFavoriteDoctor(auth.healthcareProfileId, doctorId);
    return ok({ doctorId, favorited: false });
  } catch (error) {
    return serverError('Error unfavoriting doctor', error);
  }
}
