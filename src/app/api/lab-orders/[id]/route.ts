import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import {
  canAccessDoctorWorkspace,
  canAccessReception,
} from '@/domain/authorization';
import { cancelLabOrder, enterLabResult } from '@/services/lab-service';

// PATCH — result entry ({ result_values, result_notes? }) by reception/
// super_admin (the MVP's stand-in for a lab-tech role, documented in
// APS-028 §6), or cancellation ({ action: "cancel" }) by the ordering side.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'cancel') {
      const auth = await requireStaffContext(
        (role) => canAccessReception(role) || canAccessDoctorWorkspace(role)
      );
      if (!auth.ok) return auth.response;
      return ok(await cancelLabOrder(id, auth.clinicId));
    }

    const auth = await requireStaffContext(canAccessReception);
    if (!auth.ok) return auth.response;

    if (!Array.isArray(body.result_values) && !body.result_notes) {
      return badRequest('result_values (array) or result_notes is required.');
    }

    const order = await enterLabResult({
      labOrderId: id,
      clinicId: auth.clinicId,
      resultValues: body.result_values ?? [],
      resultNotes: body.result_notes ?? null,
      resultedByUserId: auth.session.userId,
    });
    return ok(order);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating lab order', error);
  }
}
