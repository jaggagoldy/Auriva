import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { hasRequiredFields } from '@/api/validation';
import { searchAppointments } from '@/repositories/appointment-repository';
import { scheduleAppointment } from '@/services/appointment-service';

// GET: Fetch appointments with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const appointments = await searchAppointments({
      patientId: searchParams.get('patient_id'),
      doctorId: searchParams.get('doctor_id'),
      clinicId: searchParams.get('clinic_id'),
      status: searchParams.get('status'),
    });

    return ok(appointments);
  } catch (error) {
    return serverError('Error fetching appointments', error);
  }
}

// POST: Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!hasRequiredFields(body, ['patient_id', 'doctor_id', 'clinic_id', 'scheduled_time'])) {
      return badRequest(
        'Missing required fields: patient_id, doctor_id, clinic_id, scheduled_time are required.'
      );
    }

    const newAppointment = await scheduleAppointment({
      patientId: body.patient_id,
      doctorId: body.doctor_id,
      clinicId: body.clinic_id,
      scheduledTime: body.scheduled_time,
      status: body.status,
    });

    return ok(newAppointment, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating appointment', error);
  }
}
