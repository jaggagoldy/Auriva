import { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/api/http';
import { getDoctorProfile, updateDoctorProfile } from '@/services/doctor-service';
import { requireStaffContext } from '@/api/session';
import { canAccessDoctorWorkspace, isDoctor } from '@/domain/authorization';
import { recordAudit } from '@/lib/audit';

/**
 * SEC-1/SEC-2: this profile (Personal/Professional groups, including
 * consultation_fee) is editable, so it's scoped tighter than the read-only
 * directory at GET /api/doctors — a doctor may only reach their own
 * profile; a super_admin may reach any doctor within a clinic they own.
 * 404 (not 403) for a same-clinic doctor probing another doctor's id, so
 * existence isn't confirmed to a caller with no business seeing it.
 */
async function authorizeDoctorProfileAccess(doctor: {
  user: { id: string };
  clinic: { id: string };
}) {
  const auth = await requireStaffContext(canAccessDoctorWorkspace, doctor.clinic.id);
  if (!auth.ok) return auth;
  if (isDoctor(auth.session.role) && auth.session.userId !== doctor.user.id) {
    return { ok: false as const, response: notFound('Doctor profile not found.') };
  }
  return auth;
}

// GET: single doctor profile (Doctor Workspace Profile screen)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await getDoctorProfile(id);
    if (!doctor) return notFound(`Doctor profile ${id} not found.`);

    const auth = await authorizeDoctorProfileAccess(doctor);
    if (!auth.ok) return auth.response;

    return ok(doctor);
  } catch (error) {
    return serverError('Error fetching doctor profile', error);
  }
}

// PATCH: Doctor Workspace Profile edits (Personal/Professional groups)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getDoctorProfile(id);
    if (!existing) return notFound(`Doctor profile ${id} not found.`);

    const auth = await authorizeDoctorProfileAccess(existing);
    if (!auth.ok) return auth.response;

    const updated = await updateDoctorProfile(id, {
      bio: body.bio,
      years_experience:
        body.years_experience === undefined || body.years_experience === null
          ? body.years_experience
          : Number(body.years_experience),
      languages: body.languages,
      qualifications: body.qualifications,
      registration_number: body.registration_number,
      consultation_fee:
        body.consultation_fee === undefined || body.consultation_fee === null
          ? body.consultation_fee
          : Number(body.consultation_fee),
      specialty: body.specialty,
    });

    await recordAudit({
      organizationId: updated.clinic.organization_id,
      actorUserId: auth.session.userId,
      action: 'doctor_profile_updated',
      detail: updated.full_name,
    });

    return ok(updated);
  } catch (error) {
    return serverError('Error updating doctor profile', error);
  }
}
