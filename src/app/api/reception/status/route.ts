import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { badRequest, mapDomainError, notFound, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { transitionStatus } from '@/services/appointment-service';
import { setPriority } from '@/services/queue-service';
import { reassignDoctor } from '@/services/reception-service';
import { isAppointmentStatus } from '@/domain/appointment-status';

// Also accepts a `priority`-only body (drag-and-drop reorder) or a `doctor_id`-
// only body (Milestone 2 · 3.4 reassignment) — both field updates, not state
// transitions, so neither goes through transitionStatus().
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, status, clinic_id, note, priority, doctor_id } = body;

    if (!appointment_id || (status === undefined && priority === undefined && doctor_id === undefined)) {
      return badRequest('appointment_id and one of status, priority, or doctor_id are required.');
    }
    if (status !== undefined && !isAppointmentStatus(status)) {
      return badRequest('status must be a valid appointment status.');
    }

    const auth = await requireStaffContext('reception', clinic_id);
    if (!auth.ok) return auth.response;

    if (status !== undefined) {
      // Reception may only act on appointments within its own clinic —
      // checked here (rather than trusting the client) since
      // transitionStatus() itself is shared with the unauthenticated
      // doctor console route.
      const appointment = await prisma.appointment.findUnique({ where: { id: appointment_id } });
      if (!appointment || appointment.clinic_id !== auth.clinicId) {
        return notFound(`Appointment ${appointment_id} not found.`);
      }
      const updated = await transitionStatus(appointment_id, status, {
        note,
        actorUserId: auth.session.userId,
      });
      return ok(updated);
    }

    if (doctor_id !== undefined) {
      const reassigned = await reassignDoctor(appointment_id, String(doctor_id), auth.clinicId, auth.session.userId);
      return ok(reassigned);
    }

    const updated = await setPriority(appointment_id, auth.clinicId, Number(priority));
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating reception status', error);
  }
}
