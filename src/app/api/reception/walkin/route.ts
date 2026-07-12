import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { registerWalkIn } from '@/services/walkin-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      healthcare_profile_id,
      phone_number,
      full_name,
      blood_group,
      gender,
      date_of_birth,
      guardian_name,
      guardian_relation,
      is_emergency,
      doctor_id,
      clinic_id,
      notes,
      priority,
    } = body;

    if (!doctor_id) {
      return badRequest('doctor_id is required.');
    }
    // Either an already-resolved profile, or enough to create one — a bare
    // emergency registration may supply neither name nor phone, so the only
    // hard requirement is a doctor to queue against.
    if (!healthcare_profile_id && !is_emergency && !phone_number && !full_name) {
      return badRequest(
        'Provide healthcare_profile_id, or at least a phone number or name to register a new patient.'
      );
    }

    const auth = await requireStaffContext('reception', clinic_id);
    if (!auth.ok) return auth.response;

    const { appointment, isNewPatient, patientProfile } = await registerWalkIn({
      healthcareProfileId: healthcare_profile_id,
      phoneNumber: phone_number ? String(phone_number).trim() : undefined,
      fullName: full_name,
      bloodGroup: blood_group,
      gender,
      dateOfBirth: date_of_birth,
      guardianName: guardian_name,
      guardianRelation: guardian_relation,
      isEmergency: Boolean(is_emergency),
      doctorId: doctor_id,
      clinicId: auth.clinicId,
      notes,
      priority,
      actorUserId: auth.session.userId,
    });

    return ok(
      { ...appointment, is_new_patient: isNewPatient, patient_health_id: patientProfile.health_id },
      201
    );
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error registering walk-in', error);
  }
}
