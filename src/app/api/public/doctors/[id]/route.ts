import { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/api/http';
import prisma from '@/lib/prisma';
import { getBookableSlots } from '@/services/availability-service';

// Batch 3 (Booking Foundation): the PUBLIC read behind a shared booking link.
// Unauthenticated by design (that is the whole point of a shareable link), so
// it exposes ONLY what a stranger needs to choose a slot — the doctor's
// professional identity, the clinic name/address, and bookable times. It
// deliberately does NOT include the doctor's email/phone (cf. debt D14 on the
// authenticated /api/doctors), and nothing patient-specific.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 14) : 7;

    const doctor = await prisma.staffProfile.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        specialty: true,
        // Milestone 1 Batch 2: the public page shows clinic details (address,
        // phone, working hours, directions) even when bookings are paused, so
        // it can offer "call the clinic" instead of a dead end. Still no
        // doctor email/phone (cf. D14) — only the clinic's own contact info.
        clinic: {
          select: {
            name: true,
            address: true,
            phone: true,
            opens_at: true,
            closes_at: true,
            working_days: true,
            latitude: true,
            longitude: true,
            accepting_bookings: true,
          },
        },
      },
    });
    if (!doctor) {
      return notFound('Doctor not found.');
    }

    // When the clinic has paused online bookings, expose the paused state and
    // no slots — the page shows clinic info + "call us" instead of times.
    const acceptingBookings = doctor.clinic.accepting_bookings;
    const slots = acceptingBookings ? await getBookableSlots(id, { days }) : [];
    return ok({ doctor, slots, accepting_bookings: acceptingBookings });
  } catch (error) {
    return serverError('Error loading public booking page', error);
  }
}
