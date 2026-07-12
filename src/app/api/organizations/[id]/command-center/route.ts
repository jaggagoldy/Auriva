import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { getOrganizationCommandCenterSnapshot } from '@/services/command-center-service';

// Live operational snapshot for the owner's Command Center (APS-045, Sprint
// 3: org-wide rollup across every branch). Owner (super_admin) only; polled
// by the client.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    return ok(await getOrganizationCommandCenterSnapshot(auth.organizationId));
  } catch (error) {
    return serverError('Error building command center snapshot', error);
  }
}
