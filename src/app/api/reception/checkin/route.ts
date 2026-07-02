import { NextRequest, NextResponse } from 'next/server';
import { requireStaffContext } from '@/api/session';
import { canManageAppointments } from '@/domain/authorization';
import { checkIn } from '@/services/reception-service';
import { AppointmentNotFoundError, InvalidTransitionError } from '@/services/appointment-service';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, clinic_id } = body;
    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'appointment_id is required.' },
        { status: 400 }
      );
    }

    const auth = await requireStaffContext(canManageAppointments, clinic_id);
    if (!auth.ok) return auth.response;

    const updated = await checkIn(appointment_id, auth.clinicId, auth.session.userId);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof AppointmentNotFoundError) {
      return NextResponse.json({ error: 'Not Found', message: error.message }, { status: 404 });
    }
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json({ error: 'Conflict', message: error.message }, { status: 409 });
    }
    console.error('Error checking in appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
