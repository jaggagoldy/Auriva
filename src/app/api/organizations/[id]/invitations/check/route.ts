import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requireOrganizationContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { checkInvitePhone } from '@/services/onboarding-service';

// BRD-043 US-202 (Sprint 2): the inline, live duplicate-phone check behind
// the invite form's mobile-number field. Read-only, owner-scoped. Returns
// one of the prototype's three states so the form can show
// Available / Already invited / Already active while the user types.
// Server-side re-validation still happens at submit (createInvitation's
// US-205 guard) — this endpoint is UX, not the security boundary.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const phone = request.nextUrl.searchParams.get('phone') ?? '';
    return ok(await checkInvitePhone(auth.organizationId, phone));
  } catch (error) {
    return serverError('Error checking invitation phone', error);
  }
}
