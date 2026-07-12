import { NextRequest } from 'next/server';
import { mapDomainError, ok, serverError } from '@/api/http';
import { createSession, setSessionCookie } from '@/api/session';
import { createOrganization } from '@/services/onboarding-service';

// POST /api/organizations — self-serve org creation (WF-25). Public: creates
// the org + owner account and opens an owner session so the caller lands in
// the workspace immediately.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, clinic } = await createOrganization({
      orgName: body.org_name,
      address: body.address,
      ownerName: body.owner_name,
      ownerEmail: body.owner_email,
      password: body.password,
      archetype: body.archetype,
    });

    const { rawToken, expires_at } = await createSession(owner.id, owner.role);
    await setSessionCookie(rawToken, expires_at);

    return ok(
      {
        organization: { id: clinic.id, name: clinic.name },
        user: { id: owner.id, email: owner.email, role: owner.role },
      },
      201
    );
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating organization', error);
  }
}
