import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { canManageAppointments } from '@/domain/authorization';
import { registerWalkIn } from '@/services/walkin-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_number, full_name, blood_group, doctor_id, clinic_id, notes, priority } = body;

    if (!phone_number || !doctor_id) {
      return badRequest('phone_number and doctor_id are required.');
    }

    const auth = await requireStaffContext(canManageAppointments, clinic_id);
    if (!auth.ok) return auth.response;

    const { appointment, isNewPatient } = await registerWalkIn({
      phoneNumber: String(phone_number).trim(),
      fullName: full_name,
      bloodGroup: blood_group,
      doctorId: doctor_id,
      clinicId: auth.clinicId,
      notes,
      priority,
      actorUserId: auth.session.userId,
    });

    return ok({ ...appointment, is_new_patient: isNewPatient }, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error registering walk-in', error);
  }
}
