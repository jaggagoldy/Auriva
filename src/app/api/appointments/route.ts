import { NextRequest, NextResponse } from 'next/server';
import { searchAppointments } from '@/repositories/appointment-repository';
import {
  ClinicNotFoundError,
  DoctorProfileNotFoundError,
  InvalidScheduleInputError,
  PatientProfileNotFoundError,
  scheduleAppointment,
} from '@/services/appointment-service';

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

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, doctor_id, clinic_id, scheduled_time, status } = body;

    if (!patient_id || !doctor_id || !clinic_id || !scheduled_time) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required fields: patient_id, doctor_id, clinic_id, scheduled_time are required.',
        },
        { status: 400 }
      );
    }

    const newAppointment = await scheduleAppointment({
      patientId: patient_id,
      doctorId: doctor_id,
      clinicId: clinic_id,
      scheduledTime: scheduled_time,
      status,
    });

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error: any) {
    if (
      error instanceof PatientProfileNotFoundError ||
      error instanceof DoctorProfileNotFoundError ||
      error instanceof ClinicNotFoundError
    ) {
      // Historical contract: label "Not Found" with HTTP 400.
      return NextResponse.json(
        { error: 'Not Found', message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof InvalidScheduleInputError) {
      return NextResponse.json(
        { error: 'Bad Request', message: error.message },
        { status: 400 }
      );
    }
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
