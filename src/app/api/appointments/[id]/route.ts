import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, notFound, ok, serverError } from '@/api/http';
import {
  getAppointmentWithEvents,
  transitionStatus,
} from '@/services/appointment-service';
import { isAppointmentStatus } from '@/domain/appointment-status';

// Not gated by the new staff session guard: this route is the doctor
// console's existing (pre-Sprint-1) status-change call, and the doctor
// console has no session of its own yet — see src/api/session.ts for the
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
      return notFound(`Appointment ${id} not found.`);
    }
    return ok(appointment);
  } catch (error) {
    return serverError('Error fetching appointment', error);
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
      return badRequest('A valid status is required.');
    }

    const updated = await transitionStatus(id, status, { note });
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating appointment status', error);
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
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error cancelling appointment', error);
  }
}
