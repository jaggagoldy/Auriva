import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError, badRequest, ok, serverError } from '@/api/http';
import { isPatient } from '@/domain/authorization';

export async function POST(request: NextRequest) {
  try {
    const { phone_number, code } = await request.json();

    if (!phone_number || !code) {
      return badRequest('phone_number and code are required.');
    }

    const formattedPhone = phone_number.trim();

    // Verify OTP. Historical quirk: label "Unauthorized" with HTTP 400.
    if (code !== '123456') {
      return apiError(400, 'Unauthorized', 'Invalid OTP code. Please enter 123456.');
    }

    // Find the user and patient profile
    const user = await prisma.user.findFirst({
      where: {
        phone_number: formattedPhone,
      },
      include: {
        patientProfile: true,
      },
    });

    // Historical quirk: label "Unauthorized" with HTTP 404.
    if (!user || !isPatient(user.role)) {
      return apiError(404, 'Unauthorized', 'Patient profile not found.');
    }

    return ok({
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        email: user.email,
        role: user.role,
      },
      patientProfile: user.patientProfile,
    });
  } catch (error) {
    return serverError('Error verifying OTP', error);
  }
}
