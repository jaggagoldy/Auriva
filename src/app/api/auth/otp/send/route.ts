import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { findOrCreatePatientByPhone } from '@/services/patient-service';

export async function POST(request: NextRequest) {
  try {
    const { phone_number } = await request.json();

    if (!phone_number) {
      return badRequest('phone_number is required.');
    }

    // Standardize phone number format (trim spaces)
    const formattedPhone = phone_number.trim();

    // Finds the existing patient, or creates one dynamically for local ease of testing!
    const { user } = await findOrCreatePatientByPhone(prisma, formattedPhone);

    // Mock OTP logic
    const mockOTP = '123456';

    return ok({
      success: true,
      message: `[MOCK TWILIO] OTP sent to ${formattedPhone}`,
      otp: mockOTP, // Return for testing convenience
      patient_profile_id: user.patientProfile?.id,
    });
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error sending OTP', error);
  }
}
