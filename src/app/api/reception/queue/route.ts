import { NextRequest, NextResponse } from 'next/server';
import { requireStaffContext } from '@/lib/session';
import { getQueue } from '@/lib/services/queue-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedClinicId = searchParams.get('clinic_id');
  const doctorId = searchParams.get('doctor_id') ?? undefined;
  const dateParam = searchParams.get('date');
  const search = searchParams.get('search') ?? undefined;

  const auth = await requireStaffContext(['receptionist', 'super_admin'], requestedClinicId);
  if (!auth.ok) return auth.response;

  let date: Date | undefined;
  if (dateParam) {
    date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid date.' },
        { status: 400 }
      );
    }
  }

  try {
    const queue = await getQueue({ clinicId: auth.clinicId, doctorId, date, search });
    return NextResponse.json(queue);
  } catch (error: any) {
    console.error('Error fetching reception queue:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
