import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { notFound, ok, serverError } from '@/api/http';
import { updatePatientProfile } from '@/services/patient-service';
import { requirePatientContext } from '@/api/session';
import { recordAudit, resolveOrganizationIdForPatientProfile } from '@/lib/audit';

// PRO-001 general profile edits (Health Summary fields) — distinct from the
// one-time AUTH-004 onboarding endpoint at /api/patients/[id]/onboarding.
// SEC-1: self-edit only — only the owning patient session may write here.
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

    const existing = await prisma.patientProfile.findUnique({ where: { id } });
    if (!existing) {
      return notFound(`Patient profile ${id} not found.`);
    }

    const updated = await updatePatientProfile(id, {
      allergies: body.allergies,
      chronic_conditions: body.chronic_conditions,
      emergency_contact_name: body.emergency_contact_name,
      emergency_contact_phone: body.emergency_contact_phone,
    });

    await recordAudit({
      organizationId: await resolveOrganizationIdForPatientProfile(id),
      actorUserId: auth.session.userId,
      action: 'patient_profile_updated',
      detail: updated.full_name,
    });

    return ok(updated);
  } catch (error) {
    return serverError('Error updating patient profile', error);
  }
}
