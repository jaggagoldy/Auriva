import { NextRequest, NextResponse } from 'next/server';
import { findStaffProfiles } from '@/repositories/staff-repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const doctors = await findStaffProfiles({
      specialty: searchParams.get('specialty'),
      clinicId: searchParams.get('clinic_id'),
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
