import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError, badRequest, ok, serverError } from '@/api/http';
import { createSession, setSessionCookie } from '@/api/session';

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return badRequest('email and role are required.');
    }

    const formattedEmail = email.trim().toLowerCase();

    // Check if the user exists with matching email and role
    const user = await prisma.user.findFirst({
      where: {
        email: formattedEmail,
        role: role,
      },
      include: {
        staffProfile: true,
      },
    });

    if (!user) {
      return apiError(
        401,
        'Unauthorized',
        `Invalid credentials. No ${role} found with email ${email}.`
      );
    }

    // Issues a session cookie for the new /staff surface (receptionist,
    // super_admin). This does not change the credential check above — see
    // src/api/session.ts for what this session guard does and doesn't cover.
    const { rawToken, expires_at } = await createSession(user.id, user.role);
    await setSessionCookie(rawToken, expires_at);

    return ok({
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        email: user.email,
        role: user.role,
      },
      staffProfile: user.staffProfile,
    });
  } catch (error) {
    return serverError('Error logging in B2B user', error);
  }
}
