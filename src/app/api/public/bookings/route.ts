import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from '@/api/http';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { logger, withRequestId } from '@/api/logger';
import { bookPublicAppointment } from '@/services/booking-service';

// Batch 3 (Booking Foundation): the PUBLIC, unauthenticated booking endpoint.
// This is the only mutating endpoint in the app reachable with no session, so
// it is deliberately narrow — it can create a scheduled appointment and, if
// needed, an inline unverified Healthcare Profile, and nothing else. Spam and
// abuse are contained by rate limiting both the source IP and the target
// phone number (SEC-5, same shape as the auth endpoints); slot/limit/status
// validation is enforced downstream by scheduleAppointment.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const body = await request.json();
      const doctorId = typeof body.doctor_id === 'string' ? body.doctor_id.trim() : '';
      const patientName = typeof body.patient_name === 'string' ? body.patient_name.trim() : '';
      const patientPhone = typeof body.patient_phone === 'string' ? body.patient_phone.trim() : '';
      const scheduledTime = typeof body.scheduled_time === 'string' ? body.scheduled_time : '';
      const notes = typeof body.notes === 'string' ? body.notes : undefined;

      if (!doctorId || !scheduledTime) {
        return badRequest('doctor_id and scheduled_time are required.');
      }
      if (patientName.length < 2) {
        return badRequest('A patient name is required.');
      }
      if (patientPhone.replace(/\D/g, '').length < 7) {
        return badRequest('A valid phone number is required.');
      }

      // SEC-5: throttle the source IP and the phone number a booking is made
      // for — an IP-only limit is bypassable across a botnet, a phone-only
      // limit lets one IP spam many numbers.
      //
      // H3 (pilot-blocking, per Product Office): a THIRD, per-doctor cap. The IP
      // limit is spoofable without a trusted proxy and the phone limit only
      // bounds a single number, so a spammer rotating phones could still flood
      // one clinic's public calendar (denial-of-availability — the booking
      // funnel is the pilot clinic's most valuable public asset). This bounds
      // fake bookings against any one doctor's calendar regardless of IP/phone
      // rotation. Generous enough to never limit a genuinely busy public day.
      const rateLimit = checkRateLimit([
        { key: `public-book:ip:${clientIp(request)}`, limit: 10, windowMs: 15 * 60 * 1000 },
        { key: `public-book:phone:${patientPhone}`, limit: 5, windowMs: 60 * 60 * 1000 },
        { key: `public-book:doctor:${doctorId}`, limit: 20, windowMs: 60 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        logger.warn('public.booking rate-limited', { phone: patientPhone });
        return tooManyRequests('Too many booking attempts. Please try again later.', rateLimit.retryAfterSeconds);
      }

      const result = await bookPublicAppointment({
        doctorId,
        scheduledTime,
        patientName,
        patientPhone,
        notes,
      });

      logger.info('public.booking created', {
        appointmentId: result.appointment.id,
        isNewPatient: result.isNewPatient,
      });

      return ok(
        {
          success: true,
          appointment: {
            id: result.appointment.id,
            scheduled_time: result.appointment.scheduled_time,
            status: result.appointment.status,
          },
          patient: result.patient,
          is_new_patient: result.isNewPatient,
        },
        201
      );
    } catch (error) {
      return mapDomainError(error) ?? serverError('Error creating public booking', error);
    }
  });
}
