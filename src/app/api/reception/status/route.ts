import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireStaffContext } from '@/api/session';
import {
  AppointmentNotFoundError,
  InvalidTransitionError,
  transitionStatus,
} from '@/services/appointment-service';
import { QueueAppointmentNotFoundError, setPriority } from '@/services/queue-service';
import { isAppointmentStatus } from '@/domain/appointment-status';

// Also accepts a `priority`-only body (no `status`) to persist drag-and-drop
// queue reordering — a pure ordering change, not a state transition, so it
// doesn't go through transitionStatus().
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, status, clinic_id, note, priority } = body;

    if (!appointment_id || (status === undefined && priority === undefined)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'appointment_id and either status or priority are required.' },
        { status: 400 }
      );
    }
    if (status !== undefined && !isAppointmentStatus(status)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'status must be a valid appointment status.' },
        { status: 400 }
      );
    }

    const auth = await requireStaffContext(['receptionist', 'super_admin'], clinic_id);
    if (!auth.ok) return auth.response;

    if (status !== undefined) {
      // Reception may only act on appointments within its own clinic —
      // checked here (rather than trusting the client) since
      // transitionStatus() itself is shared with the unauthenticated
      // doctor console route.
      const appointment = await prisma.appointment.findUnique({ where: { id: appointment_id } });
      if (!appointment || appointment.clinic_id !== auth.clinicId) {
        return NextResponse.json(
          { error: 'Not Found', message: `Appointment ${appointment_id} not found.` },
          { status: 404 }
        );
      }
      const updated = await transitionStatus(appointment_id, status, {
        note,
        actorUserId: auth.session.userId,
      });
      return NextResponse.json(updated);
    }

    const updated = await setPriority(appointment_id, auth.clinicId, Number(priority));
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof AppointmentNotFoundError || error instanceof QueueAppointmentNotFoundError) {
      return NextResponse.json({ error: 'Not Found', message: error.message }, { status: 404 });
    }
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json({ error: 'Conflict', message: error.message }, { status: 409 });
    }
    console.error('Error updating reception status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
