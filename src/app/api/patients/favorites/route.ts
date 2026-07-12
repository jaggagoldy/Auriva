import { ok, serverError } from '@/api/http';
import { requirePatientContext } from '@/api/session';
import { listFavoriteDoctorIds } from '@/services/favorite-service';

// The current patient's favorited doctor ids — backs Find Care's star state
// and Profile's "My care network" Favourites filter.
export async function GET() {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const doctorIds = await listFavoriteDoctorIds(auth.healthcareProfileId);
    return ok(doctorIds);
  } catch (error) {
    return serverError('Error fetching favorite doctors', error);
  }
}
