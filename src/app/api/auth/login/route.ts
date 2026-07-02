import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/api/session';

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'email and role are required.' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Unauthorized', message: `Invalid credentials. No ${role} found with email ${email}.` },
        { status: 401 }
      );
    }

    // Issues a session cookie for the new /staff surface (receptionist,
    // super_admin). This does not change the credential check above — see
    // src/lib/session.ts for what this session guard does and doesn't cover.
    const { rawToken, expires_at } = await createSession(user.id, user.role);
    await setSessionCookie(rawToken, expires_at);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        email: user.email,
        role: user.role,
      },
      staffProfile: user.staffProfile,
    });
  } catch (error: any) {
    console.error('Error logging in B2B user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
