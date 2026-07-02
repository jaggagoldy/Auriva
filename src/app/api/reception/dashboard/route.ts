import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
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
    return ok(summary);
  } catch (error) {
    return serverError('Error building reception dashboard', error);
  }
}
