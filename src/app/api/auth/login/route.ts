import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError, badRequest, forbidden, ok, serverError, tooManyRequests } from '@/api/http';
import { createSession, setSessionCookie } from '@/api/session';
import { verifyPassword } from '@/lib/password';
import { isPatient } from '@/domain/authorization';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/phone';
import { logger, withRequestId } from '@/api/logger';
import { recordAudit, resolveOrganizationIdForStaffUser } from '@/lib/audit';

// APS-040: B2B login is credentialed. The role is derived from the user row —
// a client-supplied role is never trusted (the pre-Sprint-2 body shape sent
// one; it is ignored). Patients authenticate via /api/auth/otp/*, never here.
//
// Milestone 1 Batch 3: a solo clinic owner onboards mobile-first (Quick Setup)
// and has NO email — "your mobile number is your username". So this route now
// accepts EITHER `email` OR `phone` as the identifier. The email path is
// unchanged (existing contract, incl. its exact error message); the phone path
// matches on User.phone_number. Everything after identity lookup (patient
// block, password check, is_active gate, session, audit) is shared.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const { email, phone, password } = await request.json();

      const usingEmail = Boolean(email);
      // Phone identifiers are normalized to E.164 (India default +91), so a
      // staff member can sign in with their bare 10-digit mobile — the same
      // value the account is stored under.
      const identifier = usingEmail
        ? String(email).trim().toLowerCase()
        : phone
          ? normalizePhone(String(phone))
          : '';

      if (!identifier || !password) {
        return badRequest('email (or phone) and password are required.');
      }

      // SEC-5: limit both the targeted account and the source IP — an
      // account-only limit is bypassable by rotating IPs, an IP-only limit is
      // bypassable by distributing across IPs.
      const rateLimit = checkRateLimit([
        { key: `login:identity:${identifier}`, limit: 5, windowMs: 15 * 60 * 1000 },
        { key: `login:ip:${clientIp(request)}`, limit: 20, windowMs: 15 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        logger.warn('auth.login rate-limited', { identifier });
        return tooManyRequests('Too many login attempts. Please try again later.', rateLimit.retryAfterSeconds);
      }

      const user = await prisma.user.findFirst({
        where: usingEmail ? { email: identifier } : { phone_number: identifier },
        include: { staffProfiles: true },
      });

      // One message for "no such user", "patient account" and "wrong password"
      // — never reveal which part failed. Message names whichever identifier
      // was used (the email wording is the existing public contract).
      const invalid = () => {
        logger.warn('auth.login failed', { identifier });
        return apiError(
          401,
          'Unauthorized',
          usingEmail ? 'Invalid email or password.' : 'Invalid phone number or password.'
        );
      };

      if (!user || isPatient(user.role)) return invalid();
      if (!(await verifyPassword(password, user.password_hash))) return invalid();

      // Batch 1: `is_active` is the login gate the schema documents but the
      // route never enforced — a deactivated staff member (see
      // onboarding-service.setStaffActive) could still sign in. Checked AFTER
      // the password so it can't be used to enumerate accounts, and given a
      // distinct message (they hold valid credentials; this is a status, not
      // a credential, failure).
      if (!user.is_active) {
        logger.warn('auth.login blocked deactivated account', { userId: user.id });
        return forbidden('This account has been deactivated. Contact your administrator.');
      }

      // Batch B: open the session into the caller's workspace. Exactly one
      // membership auto-opens into it; with several, none is set and the
      // Workspace Selector picks (UXS-043 Package 1). Owners with no staff
      // profile carry no active membership.
      const memberships = user.staffProfiles;
      const { rawToken, expires_at } = await createSession(
        user.id,
        user.role,
        null,
        memberships.length === 1 ? memberships[0].id : null
      );
      await setSessionCookie(rawToken, expires_at);

      const organizationId = await resolveOrganizationIdForStaffUser(user.id, user.role);
      await recordAudit({
        organizationId,
        actorUserId: user.id,
        action: 'user_login',
        detail: `${user.email ?? user.phone_number} (${user.role})`,
      });
      logger.info('auth.login succeeded', { userId: user.id, role: user.role });

      return ok({
        success: true,
        user: {
          id: user.id,
          phone_number: user.phone_number,
          email: user.email,
          role: user.role,
          // Batch A (APS-044 §9): a provisioned account signs in with a
          // temporary password and must set its own before any workspace is
          // usable — the client routes to the Mandatory Password Change screen
          // (UXS-043 Package 1). Server-enforced too, in requireStaffContext.
          must_change_password: user.must_change_password,
        },
        staffProfile: memberships[0] ?? null,
      });
    } catch (error) {
      return serverError('Error logging in B2B user', error);
    }
  });
}
