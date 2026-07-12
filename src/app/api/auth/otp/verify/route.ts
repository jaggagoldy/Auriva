import { NextRequest } from 'next/server';
import { apiError, badRequest, mapDomainError, ok, serverError, tooManyRequests } from '@/api/http';
import { createSession, setSessionCookie } from '@/api/session';
import { resolveHealthcareProfile } from '@/services/identity-service';
import {
  createHealthcareProfile,
  findOrCreateAccountForPhone,
  hasExistingAccountProfileLink,
  linkAccountToProfile,
} from '@/services/patient-service';
import type { PatientProfile } from '@prisma/client';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { logger, withRequestId } from '@/api/logger';
import { recordAudit, resolveOrganizationIdForPatientProfile } from '@/lib/audit';
import { verifyOtpChallenge } from '@/services/otp-service';

function minimalProfile(profile: PatientProfile) {
  return {
    id: profile.id,
    health_id: profile.health_id,
    full_name: profile.full_name,
    gender: profile.gender,
    date_of_birth: profile.date_of_birth,
    guardian_relation: profile.guardian_relation,
  };
}

// APS-029/010 Sprint 1 — real login. A phone number may resolve to more
// than one Healthcare Profile (family sharing a number); this route never
// auto-picks between them. First round-trip (no healthcare_profile_id):
// returns `requires_profile_selection` if there's more than one match.
// Second round-trip (client resends with the chosen id): finalizes login —
// resolves/creates the Account for this phone, links it to the chosen
// profile, and opens a REAL server session (no more localStorage).
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const { phone_number, code, healthcare_profile_id } = await request.json();

      if (!phone_number || !code) {
        return badRequest('phone_number and code are required.');
      }
      const formattedPhone = phone_number.trim();

      // SEC-5: verify remains the highest-value rate-limit target — this is
      // the brute-force surface for the OTP secret. Batch 1 added a real
      // per-challenge attempt cap (otp-service.ts) on top of this endpoint
      // limit; the two are independent defenses.
      const rateLimit = checkRateLimit([
        { key: `otp-verify:identity:${formattedPhone}`, limit: 5, windowMs: 15 * 60 * 1000 },
        { key: `otp-verify:ip:${clientIp(request)}`, limit: 20, windowMs: 15 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        return tooManyRequests('Too many verification attempts. Please try again later.', rateLimit.retryAfterSeconds);
      }

      // Batch 1 (SEC-3): verify the real one-time code. A single generic
      // message covers wrong/expired/locked so a caller can't distinguish
      // "no code outstanding" from "wrong code". Historical envelope quirk
      // preserved: label "Unauthorized" with HTTP 400.
      // Resolve profiles first so we know whether this is the profile-picker
      // round-trip. BUGFIX: the OTP must NOT be consumed when we only return
      // the picker — otherwise the follow-up call (with the chosen profile and
      // the same code) fails with "Invalid or expired code", and multi-profile
      // patients can never sign in.
      const resolution = await resolveHealthcareProfile({ phone: formattedPhone });
      const multipleProfiles = resolution.kind === 'exact' && resolution.profiles.length > 1;
      const needsSelection = multipleProfiles && !healthcare_profile_id;

      const otpResult = await verifyOtpChallenge(formattedPhone, code, { consume: !needsSelection });
      if (!otpResult.ok) {
        logger.warn('auth.otp_verify failed', { phone: formattedPhone, reason: otpResult.reason });
        return apiError(400, 'Unauthorized', 'Invalid or expired code. Request a new one.');
      }

      let targetProfile: PatientProfile;
      let matchedExistingProfile: boolean; // false only for the brand-new-profile branch below
      if (multipleProfiles) {
        if (healthcare_profile_id) {
          const chosen = resolution.profiles.find((p) => p.id === healthcare_profile_id);
          if (!chosen) {
            return badRequest('That profile is not linked to this phone number.');
          }
          targetProfile = chosen;
          matchedExistingProfile = true;
        } else {
          // More than one person on this number — return the picker. The code
          // was verified but deliberately NOT consumed (see above); the client
          // calls back with healthcare_profile_id and the same code.
          return ok({
            requires_profile_selection: true,
            profiles: resolution.profiles.map(minimalProfile),
          });
        }
      } else if (resolution.kind === 'exact' && resolution.profiles.length === 1) {
        targetProfile = resolution.profiles[0];
        matchedExistingProfile = true;
      } else {
        // First-ever login on this number — create the Healthcare Profile now
        // (AUTH-004 onboarding still fills in the real name afterward).
        targetProfile = await createHealthcareProfile({
          phone: formattedPhone,
          onboardingCompleted: false,
          verificationLevel: 'phone_verified',
        });
        matchedExistingProfile = false;
      }

      const account = await findOrCreateAccountForPhone(formattedPhone);
      // Read BEFORE linking — this is the "we found your profile" signal:
      // true only the first time this Account confirms a PRE-EXISTING Profile
      // (e.g. a clinic registered them and this is their first Auriva sign-in),
      // false for an ordinary returning-patient login or a brand-new profile.
      // Purely additive to the response; does not change any write behavior.
      const isNewDiscovery =
        matchedExistingProfile && !(await hasExistingAccountProfileLink(account.id, targetProfile.id));
      const linkedProfile = await linkAccountToProfile(account.id, targetProfile.id, { makePrimary: true });

      const { rawToken, expires_at } = await createSession(account.id, 'patient', linkedProfile.id);
      await setSessionCookie(rawToken, expires_at);

      const organizationId = await resolveOrganizationIdForPatientProfile(linkedProfile.id);
      await recordAudit({
        organizationId,
        actorUserId: account.id,
        action: 'user_login',
        detail: `${linkedProfile.full_name} (patient)`,
      });
      logger.info('auth.otp_verify succeeded', { userId: account.id, patientProfileId: linkedProfile.id });

      return ok({
        success: true,
        existing_profile_found: isNewDiscovery,
        user: {
          id: account.id,
          phone_number: account.phone_number,
          email: account.email,
          role: account.role,
        },
        patientProfile: linkedProfile,
      });
    } catch (error) {
      return mapDomainError(error) ?? serverError('Error verifying OTP', error);
    }
  });
}
