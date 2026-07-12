import { NextRequest } from 'next/server';
import { badRequest, ok, serverError, serviceUnavailable, tooManyRequests } from '@/api/http';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { logger, withRequestId } from '@/api/logger';
import { issueOtpChallenge } from '@/services/otp-service';
import { shouldEchoOtp } from '@/lib/config';
import { sendOtpSms } from '@/lib/sms';

// APS-029/010 Sprint 1: send no longer creates a Healthcare Profile. Identity
// resolution (who this phone number belongs to — possibly more than one
// Healthcare Profile) happens once the code is verified, in
// /api/auth/otp/verify — see identity-service.ts's resolveHealthcareProfile.
//
// Batch 1 (SEC-3): it now issues a REAL one-time code (see otp-service.ts)
// instead of the fixed "123456". The code is delivered by echoing it in the
// response ONLY in non-production (no SMS provider is wired yet — see
// config.ts / shouldEchoOtp); production never returns it.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const { phone_number } = await request.json();

      if (!phone_number) {
        return badRequest('phone_number is required.');
      }

      const formattedPhone = phone_number.trim();

      // SEC-5: limits SMS-bombing a phone number and scripted mass-send abuse.
      const rateLimit = checkRateLimit([
        { key: `otp-send:identity:${formattedPhone}`, limit: 5, windowMs: 15 * 60 * 1000 },
        { key: `otp-send:ip:${clientIp(request)}`, limit: 20, windowMs: 15 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        return tooManyRequests('Too many OTP requests. Please try again later.', rateLimit.retryAfterSeconds);
      }

      const { code } = await issueOtpChallenge(formattedPhone);

      // H1 / SEC-3: deliver via the configured provider (Twilio/MSG91/Exotel).
      // When none is configured (dev/test) this is the "log" channel, which
      // never fails and lets the echo below hand the code back for testing.
      const delivery = await sendOtpSms(formattedPhone, code);
      if (!delivery.ok) {
        logger.error('auth.otp_send delivery failed', { phone: formattedPhone, error: delivery.error });
        return serviceUnavailable('Could not send the verification code. Please try again.');
      }

      const echo = shouldEchoOtp();
      logger.info('auth.otp_send issued', { phone: formattedPhone, delivered: delivery.id ?? true, echoed: echo });

      return ok({
        success: true,
        message: echo
          ? `[DEV] OTP for ${formattedPhone}: ${code}`
          : `OTP sent to ${formattedPhone}`,
        // Non-production only, and only when no real provider is configured —
        // the pilot/demo/test reads the code from here. Never present in
        // production or when a real SMS provider is delivering it.
        ...(echo ? { otp: code } : {}),
      });
    } catch (error) {
      return serverError('Error sending OTP', error);
    }
  });
}
