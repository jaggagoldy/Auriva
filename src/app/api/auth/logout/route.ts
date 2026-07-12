import { NextRequest } from 'next/server';
import { ok } from '@/api/http';
import { destroyCurrentSession, getCurrentSession } from '@/api/session';
import { withRequestId } from '@/api/logger';
import { isPatient } from '@/domain/authorization';
import { recordAudit, resolveOrganizationIdForPatientProfile, resolveOrganizationIdForStaffUser } from '@/lib/audit';

// OBS-3: audit the logout before destroying the session that identifies who
// is logging out — same reasoning as capturing "who" before a DELETE.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    const session = await getCurrentSession();
    await destroyCurrentSession();

    if (session) {
      const organizationId = isPatient(session.role)
        ? session.activeHealthcareProfileId
          ? await resolveOrganizationIdForPatientProfile(session.activeHealthcareProfileId)
          : null
        : await resolveOrganizationIdForStaffUser(session.userId, session.role);
      await recordAudit({
        organizationId,
        actorUserId: session.userId,
        action: 'user_logout',
        detail: session.role,
      });
    }

    return ok({ success: true });
  });
}
