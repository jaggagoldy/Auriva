import { ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { listClinicsWithStaff } from '@/repositories/clinic-repository';

// GET /api/clinics — the branches of the caller's own organization. Sprint 3
// fix: this endpoint previously had no auth check and no where clause at
// all, returning every clinic on the platform (see docs — audit finding).
export async function GET() {
  try {
    const auth = await requireOrganizationContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;

    const clinics = await listClinicsWithStaff(auth.organizationId);
    return ok(clinics);
  } catch (error) {
    return serverError('Error fetching clinics', error);
  }
}
