import { NextRequest } from 'next/server';
import { ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { getDashboardSummary } from '@/services/reception-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedClinicId = searchParams.get('clinic_id');

  // Batch 2: the front desk is gated by the `reception` capability, not the
  // receptionist role — a solo practitioner (doctor granted `reception`) has it.
  const auth = await requireStaffContext('reception', requestedClinicId);
  if (!auth.ok) return auth.response;

  try {
    const summary = await getDashboardSummary(auth.clinicId);
    return ok(summary);
  } catch (error) {
    return serverError('Error building reception dashboard', error);
  }
}
