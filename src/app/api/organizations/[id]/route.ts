import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { getOrganization, updateOrganization } from '@/services/organization-service';

// GET/PATCH the organization's own profile (Sprint 3) — name, address,
// contact info, timezone. Previously non-existent: the Settings nav item
// was a disabled "Soon" placeholder with no backing route at all.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    return ok(await getOrganization(auth.organizationId));
  } catch (error) {
    return serverError('Error fetching organization', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const updated = await updateOrganization(auth.organizationId, {
      name: body.name,
      address: body.address,
      contactEmail: body.contact_email,
      contactPhone: body.contact_phone,
      timezone: body.timezone,
    });
    return ok(updated);
  } catch (error) {
    return serverError('Error updating organization', error);
  }
}
