import { NextRequest, NextResponse } from 'next/server';
import {
  AppointmentNotFoundError,
  InvalidTransitionError,
  getAppointmentWithEvents,
  transitionStatus,
} from '@/lib/services/appointment-service';
import { isAppointmentStatus } from '@/lib/appointment-status';

// Not gated by the new staff session guard: this route is the doctor
// console's existing (pre-Sprint-1) status-change call, and the doctor
// console has no session of its own yet — see src/lib/session.ts for the
// scope boundary. Reception's equivalent action goes through the gated
// PATCH /api/reception/status, which calls the same transitionStatus().

// GET: fetch a single appointment with its activity timeline
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointment = await getAppointmentWithEvents(id);
    if (!appointment) {
      return NextResponse.json(
        { error: 'Not Found', message: `Appointment ${id} not found.` },
        { status: 404 }
      );
    }
    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH: transition status (used by the doctor console)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    if (!status || !isAppointmentStatus(status)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'A valid status is required.' },
        { status: 400 }
      );
    }

    const updated = await transitionStatus(id, status, { note });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof AppointmentNotFoundError) {
      return NextResponse.json(
        { error: 'Not Found', message: error.message },
        { status: 404 }
      );
    }
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json(
        { error: 'Conflict', message: error.message },
        { status: 409 }
      );
    }
    console.error('Error updating appointment status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: soft cancel only — never a hard delete of a clinical record.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await transitionStatus(id, 'cancelled');
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof AppointmentNotFoundError) {
      return NextResponse.json(
        { error: 'Not Found', message: error.message },
        { status: 404 }
      );
    }
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json(
        { error: 'Conflict', message: error.message },
        { status: 409 }
      );
    }
    console.error('Error cancelling appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
