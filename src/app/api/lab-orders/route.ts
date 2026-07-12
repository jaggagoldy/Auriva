import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import {
  canAccessDoctorWorkspace,
  canAccessReception,
} from '@/domain/authorization';
import { createLabOrder, listLabOrders } from '@/services/lab-service';

// Lab orders (APS-042). Worklist: reception/super_admin AND doctors (a
// doctor reviews their own orders); creation: doctors only.
const canSeeWorklist = (role: string) =>
  canAccessReception(role) || canAccessDoctorWorkspace(role);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireStaffContext(canSeeWorklist, searchParams.get('clinic_id'));
    if (!auth.ok) return auth.response;

    const orders = await listLabOrders({
      clinicId: auth.clinicId,
      status: searchParams.get('status'),
      patientId: searchParams.get('patient_id'),
      doctorId: searchParams.get('doctor_id'),
    });
    return ok(orders);
  } catch (error) {
    return serverError('Error fetching lab orders', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffContext(canAccessDoctorWorkspace);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!body.patient_id || !body.doctor_id || !Array.isArray(body.tests)) {
      return badRequest('patient_id, doctor_id and tests are required.');
    }

    const order = await createLabOrder({
      clinicId: auth.clinicId,
      patientId: body.patient_id,
      doctorId: body.doctor_id,
      appointmentId: body.appointment_id ?? null,
      tests: body.tests,
      clinicalNote: body.clinical_note ?? null,
    });
    return ok(order, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating lab order', error);
  }
}
