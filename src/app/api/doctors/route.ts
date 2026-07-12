import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/api/http';
import { findStaffProfiles } from '@/repositories/staff-repository';
import { memberRoleFromSpecialty } from '@/domain/organization';
import { getCurrentSession } from '@/api/session';
import { getDoctorRatingSummaries } from '@/services/review-service';

// SEC-1: this is a cross-clinic directory by design — the patient booking
// flow lists every doctor on the platform, not just one clinic (see
// book-appointment-dialog.tsx), so the gate here is "signed in" (any of
// patient/doctor/receptionist/super_admin), not clinic tenancy. Known
// limitation carried over unchanged: the response includes each doctor's
// email/phone_number to any authenticated caller, cross-tenant — a
// field-level exposure question, not an auth-gap question, and out of
// SEC-1's scope (tracked separately, not invented here).
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return unauthorized('Sign in to continue.');
    }

    const { searchParams } = new URL(request.url);

    const profiles = await findStaffProfiles({
      specialty: searchParams.get('specialty'),
      clinicId: searchParams.get('clinic_id'),
    });

    // Surface each profile's role within its clinic from the membership row
    // (APS-040); the specialty heuristic remains only as a fallback for
    // profiles created before the backfill. Sprint 3: match on the clinic's
    // real organization_id, not clinic_id — Organization_Members rows are
    // now org-scoped, not clinic-scoped (a clinic's own id only doubled as
    // its organization_id for pre-Sprint-3, single-clinic organizations).
    const ratingSummaries = await getDoctorRatingSummaries(profiles.map((p) => p.id));

    const doctors = profiles.map((profile) => {
      const membership = profile.user.memberships.find(
        (m) => m.organization_id === profile.clinic.organization_id
      );
      const { memberships: _memberships, ...user } = profile.user;
      const rating = ratingSummaries[profile.id] ?? { average: null, count: 0 };
      return {
        ...profile,
        user,
        role: membership?.role ?? memberRoleFromSpecialty(profile.specialty),
        ratingAvg: rating.average,
        reviewCount: rating.count,
      };
    });

    return ok(doctors);
  } catch (error) {
    return serverError('Error fetching doctors', error);
  }
}
