import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const clinics = await prisma.clinic.findMany({
      include: {
        staffProfiles: {
          select: {
            id: true,
            full_name: true,
            specialty: true,
          },
        },
      },
    });

    return NextResponse.json(clinics);
  } catch (error: any) {
    console.error('Error fetching clinics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
