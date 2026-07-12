import { NextRequest } from 'next/server';
import { mapDomainError, ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { updateDepartment } from '@/services/department-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deptId: string }> }
) {
  try {
    const { id, deptId } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const department = await updateDepartment(deptId, auth.organizationId, {
      name: body.name,
      headStaffId: body.head_staff_id,
      defaultConsultationFee: body.default_consultation_fee,
    });
    return ok(department);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating department', error);
  }
}
