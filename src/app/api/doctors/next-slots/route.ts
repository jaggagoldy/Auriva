import { NextRequest } from 'next/server';
import { badRequest, ok, serverError, unauthorized } from '@/api/http';
import { getBookableSlots } from '@/services/availability-service';
import { getCurrentSession } from '@/api/session';

const MAX_IDS = 50;

// Batch "next available slot" lookup — powers Find Care's "Available today"
// filter and "Next slot: …" card text, reusing the same real slot engine
// booking uses (getBookableSlots) rather than a second, cheaper-but-wrong
// approximation. Bounded to the ids currently rendered on screen.
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return unauthorized('Sign in to continue.');
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      return badRequest('ids query parameter is required.');
    }
    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean).slice(0, MAX_IDS);

    const entries = await Promise.all(
      ids.map(async (id) => {
        const days = await getBookableSlots(id, { days: 7 });
        const nextSlot = days.flatMap((d) => d.slots)[0] ?? null;
        return [id, nextSlot] as const;
      })
    );

    return ok(Object.fromEntries(entries));
  } catch (error) {
    return serverError('Error fetching next available slots', error);
  }
}
