import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { assignStaffDepartment } from '@/services/department-service';
import { setStaffActive, setStaffCapabilities } from '@/services/onboarding-service';
import { WORKSPACE_CAPABILITIES, type Capability } from '@/domain/authorization';

// PATCH — the owner's staff-management actions on one member: department
// assignment, activate/deactivate, and/or capability grants (Batch 2 — grant
// a doctor `reception` to make them a solo practitioner).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  try {
    const { id, staffId } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const text = await request.text();
    if (!text.trim()) {
      return badRequest('Request body is empty.');
    }
    const body = JSON.parse(text);
    if (
      body.department_id === undefined &&
      body.is_active === undefined &&
      body.capabilities === undefined
    ) {
      return badRequest('Provide department_id, is_active, and/or capabilities.');
    }

    if (body.capabilities !== undefined) {
      if (
        !Array.isArray(body.capabilities) ||
        !body.capabilities.every(
          (c: unknown): c is Capability =>
            typeof c === 'string' && (WORKSPACE_CAPABILITIES as readonly string[]).includes(c)
        )
      ) {
        return badRequest('capabilities must be an array of known capability keys.');
      }
    }

    let result;
    if (body.department_id !== undefined) {
      result = await assignStaffDepartment({
        organizationId: auth.organizationId,
        staffProfileId: staffId,
        departmentId: body.department_id,
      });
    }
    if (body.is_active !== undefined) {
      result = await setStaffActive({
        organizationId: auth.organizationId,
        staffProfileId: staffId,
        actorUserId: auth.session.userId,
        isActive: Boolean(body.is_active),
      });
    }
    if (body.capabilities !== undefined) {
      result = await setStaffCapabilities({
        organizationId: auth.organizationId,
        staffProfileId: staffId,
        actorUserId: auth.session.userId,
        capabilities: body.capabilities as Capability[],
      });
    }

    return ok(result);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating staff member', error);
  }
}
