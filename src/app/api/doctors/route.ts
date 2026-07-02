import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { findStaffProfiles } from '@/repositories/staff-repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const doctors = await findStaffProfiles({
      specialty: searchParams.get('specialty'),
      clinicId: searchParams.get('clinic_id'),
    });

    return ok(doctors);
  } catch (error) {
    return serverError('Error fetching doctors', error);
  }
}
