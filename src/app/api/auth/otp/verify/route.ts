import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPatient } from '@/domain/authorization';

export async function POST(request: NextRequest) {
  try {
    const { phone_number, code } = await request.json();

    if (!phone_number || !code) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'phone_number and code are required.' },
        { status: 400 }
      );
    }

    const formattedPhone = phone_number.trim();

    // Verify OTP
    if (code !== '123456') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid OTP code. Please enter 123456.' },
        { status: 400 }
      );
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

    if (!user || !isPatient(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Patient profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        email: user.email,
        role: user.role,
      },
      patientProfile: user.patientProfile,
    });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
