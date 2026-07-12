import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { badRequest, notFound, ok, serverError } from '@/api/http';
import { hasRequiredFields } from '@/api/validation';
import { completePatientOnboarding } from '@/services/patient-service';
import { requirePatientContext } from '@/api/session';
import { recordAudit, resolveOrganizationIdForPatientProfile } from '@/lib/audit';

// AUTH-004 Patient Onboarding: one-time profile completion after first OTP
// sign-up. Not general profile editing — see PRO-001 for that, later.
// SEC-1: self-edit only. By the time the client can call this, OTP verify
// has already opened a real session (createSession/setSessionCookie), so
// this is never reachable pre-authentication.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;
    if (auth.healthcareProfileId !== id) {
      return notFound(`Patient profile ${id} not found.`);
    }

    if (!hasRequiredFields(body, ['full_name'])) {
      return badRequest('full_name is required.');
    }

    const existing = await prisma.patientProfile.findUnique({ where: { id } });
    if (!existing) {
      return notFound(`Patient profile ${id} not found.`);
    }

    const updated = await completePatientOnboarding(id, {
      full_name: body.full_name,
      blood_group: body.blood_group,
      date_of_birth: body.date_of_birth,
      gender: body.gender,
    });

    await recordAudit({
      organizationId: await resolveOrganizationIdForPatientProfile(id),
      actorUserId: auth.session.userId,
      action: 'patient_onboarding_completed',
      detail: updated.full_name,
    });

    return ok(updated);
  } catch (error) {
    return serverError('Error completing patient onboarding', error);
  }
}
