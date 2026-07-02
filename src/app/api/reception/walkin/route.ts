import { NextRequest, NextResponse } from 'next/server';
import { requireStaffContext } from '@/api/session';
import { registerWalkIn, DoctorNotFoundError } from '@/services/walkin-service';
import { DuplicateActiveAppointmentError } from '@/services/appointment-service';
import { PhoneNumberInUseError } from '@/services/patient-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_number, full_name, blood_group, doctor_id, clinic_id, notes, priority } = body;

    if (!phone_number || !doctor_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'phone_number and doctor_id are required.' },
        { status: 400 }
      );
    }

    const auth = await requireStaffContext(['receptionist', 'super_admin'], clinic_id);
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

    return NextResponse.json({ ...appointment, is_new_patient: isNewPatient }, { status: 201 });
  } catch (error: any) {
    if (error instanceof DoctorNotFoundError) {
      return NextResponse.json({ error: 'Not Found', message: error.message }, { status: 404 });
    }
    if (error instanceof PhoneNumberInUseError) {
      return NextResponse.json({ error: 'Forbidden', message: error.message }, { status: 403 });
    }
    if (error instanceof DuplicateActiveAppointmentError) {
      return NextResponse.json({ error: 'Conflict', message: error.message }, { status: 409 });
    }
    console.error('Error registering walk-in:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
