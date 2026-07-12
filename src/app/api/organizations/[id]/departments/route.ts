import { NextRequest } from 'next/server';
import { mapDomainError, ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { createDepartment, listDepartments } from '@/services/department-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    return ok(await listDepartments(auth.organizationId));
  } catch (error) {
    return serverError('Error listing departments', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const department = await createDepartment({
      organizationId: auth.organizationId,
      clinicId: body.clinic_id ?? null,
      name: body.name,
      defaultConsultationFee: body.default_consultation_fee ?? null,
    });
    return ok(department, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating department', error);
  }
}
