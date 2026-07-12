import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { checkIn } from '@/services/reception-service';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, clinic_id } = body;
    if (!appointment_id) {
      return badRequest('appointment_id is required.');
    }

    const auth = await requireStaffContext('reception', clinic_id);
    if (!auth.ok) return auth.response;

    const updated = await checkIn(appointment_id, auth.clinicId, auth.session.userId);
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error checking in appointment', error);
  }
}
