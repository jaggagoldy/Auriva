import { NextRequest, NextResponse } from 'next/server';
import { requireStaffContext } from '@/api/session';
import { canAccessReception } from '@/domain/authorization';
import { getDashboardSummary } from '@/services/reception-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedClinicId = searchParams.get('clinic_id');

  const auth = await requireStaffContext(canAccessReception, requestedClinicId);
  if (!auth.ok) return auth.response;

  try {
    const summary = await getDashboardSummary(auth.clinicId);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Error building reception dashboard:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
