import { NextRequest } from 'next/server';
import { badRequest, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { canManageAppointments } from '@/domain/authorization';
import { resolveHealthcareProfile } from '@/services/identity-service';
import { createHealthcareProfile } from '@/services/patient-service';

// GET /api/patients?phone=&health_id=&name=&dob= — Identity Resolution
// Service (APS-029/010 Part I A9 / Part II §5), reception-facing. Backs the
// Reception Search + Identity Search Results screens. Never auto-merges,
// never blocks manual creation — the client always keeps a "create new"
// option available regardless of what this returns.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const healthId = searchParams.get('health_id');
    const name = searchParams.get('name');
    const dob = searchParams.get('dob');

    if (!phone && !healthId && !name) {
      return badRequest('Provide at least one of: phone, health_id, name.');
    }

    const auth = await requireStaffContext(canManageAppointments);
    if (!auth.ok) return auth.response;

    const resolution = await resolveHealthcareProfile({ phone, healthId, name, dob });
    if (resolution.kind === 'none') {
      return ok({ kind: 'none', profiles: [] });
    }

    return ok({
      kind: resolution.kind,
      profiles: resolution.profiles.map((profile) => ({
        id: profile.id,
        health_id: profile.health_id,
        full_name: profile.full_name,
        gender: profile.gender,
        date_of_birth: profile.date_of_birth,
        blood_group: profile.blood_group,
        guardian_name: profile.guardian_name,
        guardian_relation: profile.guardian_relation,
        verification_level: profile.verification_level,
        has_account: Boolean(profile.user_id),
        phones: profile.contacts.filter((c) => c.type === 'phone').map((c) => c.value),
      })),
    });
  } catch (error) {
    return serverError('Error searching patients', error);
  }
}

// POST — register a Healthcare Profile without an immediate queue entry
// (Sprint 2's booking flow: reception schedules a FUTURE visit for a
// patient who isn't walking in right now). Reuses the exact same
// createHealthcareProfile() the walk-in flow uses — never a duplicate
// registration path.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = await requireStaffContext(canManageAppointments);
    if (!auth.ok) return auth.response;

    if (!body.full_name && !body.phone_number) {
      return badRequest('Provide at least a full_name or phone_number.');
    }

    const profile = await createHealthcareProfile({
      full_name: body.full_name,
      gender: body.gender,
      date_of_birth: body.date_of_birth,
      guardian_name: body.guardian_name,
      guardian_relation: body.guardian_relation,
      blood_group: body.blood_group,
      phone: body.phone_number,
      registeredByClinicId: auth.clinicId,
      onboardingCompleted: true,
      verificationLevel: 'unverified',
    });

    return ok(profile, 201);
  } catch (error) {
    return serverError('Error registering patient', error);
  }
}
