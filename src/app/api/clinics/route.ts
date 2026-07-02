import { NextResponse } from 'next/server';
import { listClinicsWithStaff } from '@/repositories/clinic-repository';

export async function GET() {
  try {
    const clinics = await listClinicsWithStaff();

    return NextResponse.json(clinics);
  } catch (error: any) {
    console.error('Error fetching clinics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
