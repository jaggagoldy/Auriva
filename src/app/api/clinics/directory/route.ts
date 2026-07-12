import { ok, serverError, unauthorized } from '@/api/http';
import { listClinicsForDirectory } from '@/repositories/clinic-repository';
import { getCurrentSession } from '@/api/session';
import { getClinicRatingSummaries } from '@/services/review-service';

// The patient-facing "Hospitals & Clinics" directory (Find Care) — every
// clinic on the platform, unlike GET /api/clinics which is org-admin-gated
// and scoped to the caller's own organization. A patient isn't a member of
// any org, so this mirrors GET /api/doctors' cross-org gate (SEC-1: any
// signed-in session, not clinic tenancy).
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return unauthorized('Sign in to continue.');
    }

    const clinics = await listClinicsForDirectory();
    const ratingSummaries = await getClinicRatingSummaries(clinics.map((c) => c.id));
    const data = clinics.map(({ _count, ...clinic }) => {
      const rating = ratingSummaries[clinic.id] ?? { average: null, count: 0 };
      return {
        ...clinic,
        doctorCount: _count.staffProfiles,
        ratingAvg: rating.average,
        reviewCount: rating.count,
      };
    });
    return ok(data);
  } catch (error) {
    return serverError('Error fetching clinic directory', error);
  }
}
