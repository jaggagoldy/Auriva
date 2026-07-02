import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const clinic_id = searchParams.get('clinic_id');

    const where: any = {};
    if (specialty) {
      where.specialty = {
        contains: specialty,
      };
    }
    if (clinic_id) {
      where.clinic_id = clinic_id;
    }

    const doctors = await prisma.staffProfile.findMany({
      where,
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            phone_number: true,
          },
        },
      },
    });

    return NextResponse.json(doctors);
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
