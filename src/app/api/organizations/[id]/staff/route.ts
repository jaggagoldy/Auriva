import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { provisionStaff } from '@/services/onboarding-service';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

// Managed provisioning (APS-044 §9 / ERA-001 C5): the Organization creates a
// staff account directly with a temporary password, instead of sending an
// invite link. Owner (super_admin) only — requireOrganizationContext validates
// the caller owns the requested organization. The temporary password is
// returned ONCE for the owner to relay out-of-band (no SMS — ADR-003).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    // Provisioning creates a real credentialed account — throttle by org and by
    // IP, matching the invite-create endpoint's protection.
    const rateLimit = checkRateLimit([
      { key: `provision:org:${id}`, limit: 20, windowMs: 60 * 60 * 1000 },
      { key: `provision:ip:${clientIp(request)}`, limit: 30, windowMs: 60 * 60 * 1000 },
    ]);
    if (!rateLimit.allowed) {
      return tooManyRequests('Too many accounts created. Please try again later.', rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    if (!body.clinic_id) {
      return badRequest('clinic_id is required — which branch this account belongs to.');
    }

    const result = await provisionStaff({
      organizationId: auth.organizationId,
      clinicId: body.clinic_id,
      fullName: body.full_name,
      phone: body.phone,
      role: body.role,
      specialty: body.specialty ?? null,
      actorUserId: auth.session.userId,
    });
    return ok(result, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error provisioning staff', error);
  }
}
