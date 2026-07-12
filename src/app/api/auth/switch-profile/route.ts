import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { badRequest, forbidden, ok, serverError } from '@/api/http';
import { requirePatientContext, setActiveHealthcareProfile } from '@/api/session';

// The server-side half of the Family Profile Selector / Profile Switcher
// (APS-029/010 Part I A1 §9). Never trusts the client's claim that a
// profile belongs to them — verified against Account_Profile_Links (or the
// legacy direct owner pointer) every time.
export async function POST(request: NextRequest) {
  try {
    const { healthcare_profile_id } = await request.json();
    if (!healthcare_profile_id) {
      return badRequest('healthcare_profile_id is required.');
    }

    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const [link, ownedProfile] = await Promise.all([
      prisma.accountProfileLink.findUnique({
        where: {
          account_user_id_healthcare_profile_id: {
            account_user_id: auth.session.userId,
            healthcare_profile_id,
          },
        },
      }),
      prisma.patientProfile.findFirst({
        where: { id: healthcare_profile_id, user_id: auth.session.userId },
      }),
    ]);

    if (!link && !ownedProfile) {
      return forbidden('This Healthcare Profile is not linked to your account.');
    }

    await setActiveHealthcareProfile(auth.session.sessionId, healthcare_profile_id);

    const profile = await prisma.patientProfile.findUnique({ where: { id: healthcare_profile_id } });
    return ok({ success: true, patientProfile: profile });
  } catch (error) {
    return serverError('Error switching profile', error);
  }
}
