import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { getActivationStatus } from '@/services/onboarding-service';

// GET — the Organization Activated checklist (APS-030 Step 8): real,
// live-queried progress, never seeded or placeholder counts.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    return ok(await getActivationStatus(auth.organizationId));
  } catch (error) {
    return serverError('Error loading activation status', error);
  }
}
