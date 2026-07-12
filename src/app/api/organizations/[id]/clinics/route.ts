import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { createClinic } from '@/services/onboarding-service';

// POST — adds a second (or third...) clinic/branch to an organization
// (Sprint 3's "Multi-Clinic Support" — the actual new capability the real
// Organization entity exists for).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (!body.name || !body.address) {
      return badRequest('name and address are required.');
    }

    const clinic = await createClinic({
      organizationId: auth.organizationId,
      ownerUserId: auth.session.userId,
      name: body.name,
      address: body.address,
    });
    return ok(clinic, 201);
  } catch (error) {
    // DATA-2/3: previously bare serverError() — createClinic's own
    // OnboardingInputError/ClinicNameConflictError fell through to a raw
    // 500 instead of the standardized 400/409 every other route gets via
    // mapDomainError.
    return mapDomainError(error) ?? serverError('Error creating clinic', error);
  }
}
