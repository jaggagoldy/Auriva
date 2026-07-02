import { NextRequest } from 'next/server';
import { badRequest, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { parseDateOrNull } from '@/api/validation';
import { canAccessReception } from '@/domain/authorization';
import { getQueue } from '@/services/queue-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedClinicId = searchParams.get('clinic_id');
  const doctorId = searchParams.get('doctor_id') ?? undefined;
  const dateParam = searchParams.get('date');
  const search = searchParams.get('search') ?? undefined;

  const auth = await requireStaffContext(canAccessReception, requestedClinicId);
  if (!auth.ok) return auth.response;

  let date: Date | undefined;
  if (dateParam) {
    const parsed = parseDateOrNull(dateParam);
    if (!parsed) {
      return badRequest('Invalid date.');
    }
    date = parsed;
  }

  try {
    const queue = await getQueue({ clinicId: auth.clinicId, doctorId, date, search });
    return ok(queue);
  } catch (error) {
    return serverError('Error fetching reception queue', error);
  }
}
