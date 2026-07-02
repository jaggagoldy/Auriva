import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findOrCreatePatientByPhone, PhoneNumberInUseError } from '@/lib/services/patient-service';

export async function POST(request: NextRequest) {
  try {
    const { phone_number } = await request.json();

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'phone_number is required.' },
        { status: 400 }
      );
    }

    // Standardize phone number format (trim spaces)
    const formattedPhone = phone_number.trim();

    // Finds the existing patient, or creates one dynamically for local ease of testing!
    let user;
    try {
      ({ user } = await findOrCreatePatientByPhone(prisma, formattedPhone));
    } catch (err) {
      if (err instanceof PhoneNumberInUseError) {
        return NextResponse.json(
          { error: 'Forbidden', message: err.message },
          { status: 403 }
        );
      }
      throw err;
    }

    // Mock OTP logic
    const mockOTP = '123456';

    return NextResponse.json({
      success: true,
      message: `[MOCK TWILIO] OTP sent to ${formattedPhone}`,
      otp: mockOTP, // Return for testing convenience
      patient_profile_id: user.patientProfile?.id,
    });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
