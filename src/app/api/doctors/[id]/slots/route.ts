import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/api/http';
import { getBookableSlots } from '@/services/availability-service';
import { getCurrentSession } from '@/api/session';

// Real bookable slots for the patient booking dialog and Doctor Details
// page — gated the same way GET /api/doctors is (SEC-1: any signed-in
// session, not clinic tenancy), since this is cross-clinic marketplace
// browsing data, not a mutation or anything patient-specific.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return unauthorized('Sign in to continue.');
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 14) : 7;
    return ok(await getBookableSlots(id, { days }));
  } catch (error) {
    return serverError('Error fetching bookable slots', error);
  }
}
