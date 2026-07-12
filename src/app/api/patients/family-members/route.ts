import { NextRequest } from 'next/server';
import { badRequest, conflict, mapDomainError, ok, serverError } from '@/api/http';
import { requirePatientContext } from '@/api/session';
import { createHealthcareProfile, linkAccountToProfile } from '@/services/patient-service';
import { resolveHealthcareProfile } from '@/services/identity-service';
import prisma from '@/lib/prisma';

// Patient-facing self-service "Add family member" (PAT-016). Reuses the
// exact identity primitives reception's own registration relies on
// (createHealthcareProfile + linkAccountToProfile) — the only difference
// from reception's flow is that this one also performs the account link
// itself, since the caller here *is* the account the new profile should
// attach to (reception never resolves/links an account at all today).
//
// Duplicate-guard: reception's resolveHealthcareProfile() is deliberately
// advisory-only ("never blocks manual creation") because a staffed desk can
// exercise judgement. Self-service has no such supervision, so when a phone
// number is given and it exact-matches an existing profile not already
// linked to this account, creation is refused rather than silently
// producing a second identity for the same person.
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const guardian_relation = typeof body.guardian_relation === 'string' ? body.guardian_relation.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!full_name) return badRequest('Full name is required.');
    if (!guardian_relation) return badRequest('Relation to this family member is required.');

    if (phone) {
      const resolution = await resolveHealthcareProfile({ phone });
      if (resolution.kind === 'exact') {
        const alreadyLinked = await prisma.accountProfileLink.findFirst({
          where: {
            account_user_id: auth.session.userId,
            healthcare_profile_id: { in: resolution.profiles.map((p) => p.id) },
          },
        });
        if (!alreadyLinked) {
          return conflict(
            'A Healthcare Profile already exists for this phone number. Ask reception to link it to your account at your next visit.'
          );
        }
      }
    }

    // guardian_name/guardian_relation describe the *caller's* relationship
    // to the new dependent (e.g. "Ananya Sharma" is this profile's
    // "Mother") — resolved from the caller's own profile, not trusted from
    // the client.
    const caller = await prisma.patientProfile.findUnique({
      where: { id: auth.healthcareProfileId },
      select: { full_name: true },
    });

    const profile = await createHealthcareProfile({
      full_name,
      gender: typeof body.gender === 'string' ? body.gender : null,
      date_of_birth: typeof body.date_of_birth === 'string' ? body.date_of_birth : null,
      blood_group: typeof body.blood_group === 'string' ? body.blood_group : null,
      guardian_name: caller?.full_name ?? null,
      guardian_relation,
      phone: phone || null,
      onboardingCompleted: true,
    });

    await linkAccountToProfile(auth.session.userId, profile.id, { makePrimary: false });

    return ok(profile, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error adding family member', error);
  }
}
