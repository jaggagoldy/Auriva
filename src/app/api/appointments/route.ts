import { NextRequest } from 'next/server';
import { badRequest, forbidden, mapDomainError, ok, serverError, unauthorized } from '@/api/http';
import { hasRequiredFields } from '@/api/validation';
import { searchAppointments } from '@/repositories/appointment-repository';
import { scheduleAppointment, withPrescriptionProjection } from '@/services/appointment-service';
import { getCurrentSession, requireAppointmentAccess, requireStaffContext } from '@/api/session';
import { canAccessReception, isPatient } from '@/domain/authorization';

// GET: Fetch appointments with optional filters
// SEC-1/SEC-2: three actor types call this (patient/doctor/reception), each
// scoped to their own data — see requireAppointmentAccess.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');
    const doctor_id = searchParams.get('doctor_id');
    const clinic_id = searchParams.get('clinic_id');

    const auth = await requireAppointmentAccess({
      patientId: patient_id,
      doctorId: doctor_id,
      clinicId: clinic_id,
    });
    if (!auth.ok) return auth.response;

    const appointments = await searchAppointments({
      patientId: auth.scope.kind === 'patient' ? auth.scope.patientId : null,
      doctorId: auth.scope.kind === 'doctor' ? auth.scope.doctorId : null,
      clinicId: auth.scope.kind === 'clinic' ? auth.scope.clinicId : null,
      status: searchParams.get('status'),
    });

    return ok(appointments.map(withPrescriptionProjection));
  } catch (error) {
    return serverError('Error fetching appointments', error);
  }
}

// POST: Create a new appointment
// SEC-1/SEC-2: a patient may only book for themselves; reception/super_admin
// may book for any patient within their own clinic. Doctors do not book
// through this endpoint (no such UI flow exists).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!hasRequiredFields(body, ['patient_id', 'doctor_id', 'clinic_id', 'scheduled_time'])) {
      return badRequest(
        'Missing required fields: patient_id, doctor_id, clinic_id, scheduled_time are required.'
      );
    }

    const session = await getCurrentSession();
    if (!session) {
      return unauthorized('Sign in to continue.');
    }
    if (isPatient(session.role)) {
      if (!session.activeHealthcareProfileId || body.patient_id !== session.activeHealthcareProfileId) {
        return forbidden('You may only book appointments for yourself.');
      }
    } else if (canAccessReception(session.role)) {
      const staffAuth = await requireStaffContext(canAccessReception, body.clinic_id);
      if (!staffAuth.ok) return staffAuth.response;
    } else {
      return forbidden('Your role cannot access this resource.');
    }

    const newAppointment = await scheduleAppointment({
      patientId: body.patient_id,
      doctorId: body.doctor_id,
      clinicId: body.clinic_id,
      scheduledTime: body.scheduled_time,
      status: body.status,
      notes: body.notes,
    });

    return ok(newAppointment, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating appointment', error);
  }
}
