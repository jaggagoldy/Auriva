import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, notFound, ok, serverError } from '@/api/http';
import {
  getAppointmentWithEvents,
  rescheduleAppointment,
  transitionStatus,
  updateClinicalRecord,
  type ClinicalRecordPatch,
} from '@/services/appointment-service';
import { isAppointmentStatus } from '@/domain/appointment-status';
import { requirePatientContext, requireStaffContext } from '@/api/session';
import { canAccessDoctorWorkspace, canAccessReception } from '@/domain/authorization';

const CLINICAL_FIELDS = [
  'chief_complaint',
  'history_notes',
  'vitals_json',
  'diagnosis',
  'prescription_notes',
  'prescription_medicines_json',
  'follow_up_date',
] as const;

// SEC-1/SEC-2: PATCH (the doctor console's status/clinical write) requires a
// doctor/super_admin session scoped to the appointment's clinic. GET and
// DELETE below now close the previously-open tenancy gap (debt M3) — GET is
// reachable by staff (doctor/reception, clinic-scoped) or by the owning
// patient; DELETE (soft-cancel) is reachable by the owning patient or by
// reception/super_admin (clinic-scoped) — mirroring the shared
// AppointmentDrawer component, which only exposes cancel to reception
// (allowActions) and to the patient app, never the doctor console.

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

    const staffAuth = await requireStaffContext(
      (role) => canAccessDoctorWorkspace(role) || canAccessReception(role)
    );
    if (staffAuth.ok) {
      if (appointment.clinic_id !== staffAuth.clinicId) {
        return notFound(`Appointment ${id} not found.`); // do not reveal other clinics' data
      }
      return ok(appointment);
    }

    const patientAuth = await requirePatientContext();
    if (patientAuth.ok) {
      if (appointment.patient_id !== patientAuth.healthcareProfileId) {
        return notFound(`Appointment ${id} not found.`);
      }
      return ok(appointment);
    }

    return patientAuth.response;
  } catch (error) {
    return serverError('Error fetching appointment', error);
  }
}

// PATCH: transition status, save Consult Workbench clinical fields (doctor
// console), and/or reschedule (reception's "move this booking" action —
// Sprint 2). Independent concerns — a status change always goes through
// transitionStatus(); clinical documentation is a plain field write; a
// reschedule is its own guarded operation (rescheduleAppointment only
// allows moving appointments still in "scheduled"). A single request may
// combine any of these (e.g. "save vitals" vs. "sign & complete").
//
// Reschedule-only requests are authorized for reception/doctor-console staff
// (front-desk "move this booking" action) OR the owning patient
// (self-service reschedule, Patient Care) — mirroring GET/DELETE's
// staff-or-patient shape above. Any request that also touches
// status/clinical fields still requires the doctor console's session,
// unchanged from before.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { status, note, scheduled_time } = body;

    const clinicalPatch: ClinicalRecordPatch = {};
    let hasClinicalPatch = false;
    for (const field of CLINICAL_FIELDS) {
      if (body[field] !== undefined) {
        clinicalPatch[field] = body[field];
        hasClinicalPatch = true;
      }
    }
    const isRescheduleOnly = scheduled_time !== undefined && status === undefined && !hasClinicalPatch;

    const { id } = await params;
    const existing = await getAppointmentWithEvents(id);
    if (!existing) {
      return notFound(`Appointment ${id} not found.`);
    }

    if (isRescheduleOnly) {
      const staffAuth = await requireStaffContext(
        (role) => canAccessReception(role) || canAccessDoctorWorkspace(role)
      );
      if (staffAuth.ok) {
        if (existing.clinic_id !== staffAuth.clinicId) {
          return notFound(`Appointment ${id} not found.`); // do not reveal other clinics' data
        }
      } else {
        const patientAuth = await requirePatientContext();
        if (!patientAuth.ok) return patientAuth.response;
        if (existing.patient_id !== patientAuth.healthcareProfileId) {
          return notFound(`Appointment ${id} not found.`);
        }
      }

      const updated = await rescheduleAppointment(id, scheduled_time);
      return ok(updated);
    }

    // Status transitions and clinical documentation remain doctor-console-only.
    const auth = await requireStaffContext(canAccessDoctorWorkspace);
    if (!auth.ok) return auth.response;
    if (existing.clinic_id !== auth.clinicId) {
      return notFound(`Appointment ${id} not found.`); // do not reveal other clinics' data
    }

    if (status === undefined && !hasClinicalPatch && scheduled_time === undefined) {
      return badRequest('A status, clinical field, or scheduled_time update is required.');
    }
    if (status !== undefined && !isAppointmentStatus(status)) {
      return badRequest('A valid status is required.');
    }

    let updated;
    if (hasClinicalPatch) {
      updated = await updateClinicalRecord(id, clinicalPatch);
    }
    if (scheduled_time !== undefined) {
      updated = await rescheduleAppointment(id, scheduled_time);
    }
    if (status !== undefined) {
      updated = await transitionStatus(id, status, { note, actorUserId: auth.session.userId });
    }

    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating appointment status', error);
  }
}

// DELETE: soft cancel only — never a hard delete of a clinical record.
// Reachable by the owning patient (cancelling their own booking) or by
// reception/super_admin (front-desk cancel) — never the doctor console,
// matching AppointmentDrawer's allowActions gating.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getAppointmentWithEvents(id);
    if (!existing) {
      return notFound(`Appointment ${id} not found.`);
    }

    let actorUserId: string;
    const staffAuth = await requireStaffContext(canAccessReception);
    if (staffAuth.ok) {
      if (existing.clinic_id !== staffAuth.clinicId) {
        return notFound(`Appointment ${id} not found.`);
      }
      actorUserId = staffAuth.session.userId;
    } else {
      const patientAuth = await requirePatientContext();
      if (!patientAuth.ok) return patientAuth.response;
      if (existing.patient_id !== patientAuth.healthcareProfileId) {
        return notFound(`Appointment ${id} not found.`);
      }
      actorUserId = patientAuth.session.userId;
    }

    const updated = await transitionStatus(id, 'cancelled', { actorUserId });
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error cancelling appointment', error);
  }
}
