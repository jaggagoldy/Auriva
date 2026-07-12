import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from "@/api/http";
import { createSession, setSessionCookie, requireStaffContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { logger, withRequestId } from "@/api/logger";
import { startQuickSetup, configureQuickSetup } from "@/services/quick-setup-service";

// Milestone 1 Batch 3: the mobile-first Quick Setup for a solo clinic owner.
//   POST  — verify the OTP and create the account + clinic, then open a session.
//   PATCH — (authenticated) name the clinic and set working hours.

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const body = await request.json();
      const ownerName = typeof body.owner_name === "string" ? body.owner_name : "";
      const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const code = typeof body.code === "string" ? body.code : "";

      if (!mobile || !password || !code) {
        return badRequest("mobile, password and code are required.");
      }

      // Account creation is a sensitive mutation — throttle by IP and by the
      // mobile being claimed, same shape as the auth endpoints.
      const rateLimit = checkRateLimit([
        { key: `quick-setup:ip:${clientIp(request)}`, limit: 10, windowMs: 60 * 60 * 1000 },
        { key: `quick-setup:mobile:${mobile}`, limit: 5, windowMs: 60 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        return tooManyRequests("Too many attempts. Please try again later.", rateLimit.retryAfterSeconds);
      }

      const { owner, clinic, doctorProfile } = await startQuickSetup({
        ownerName,
        mobile,
        password,
        code,
      });

      const { rawToken, expires_at } = await createSession(owner.id, owner.role);
      await setSessionCookie(rawToken, expires_at);
      logger.info("onboarding.quick_setup started", { userId: owner.id, clinicId: clinic.id });

      return ok(
        { success: true, clinic_id: clinic.id, doctor_id: doctorProfile.id },
        201
      );
    } catch (error) {
      return mapDomainError(error) ?? serverError("Error starting quick setup", error);
    }
  });
}

export async function PATCH(request: NextRequest) {
  try {
    // The owner is a super_admin — canAccessAdminPortal resolves their clinic.
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const result = await configureQuickSetup({
      ownerUserId: auth.session.userId,
      clinicName: typeof body.clinic_name === "string" ? body.clinic_name : "",
      specialty: typeof body.specialty === "string" ? body.specialty : null,
      workingDays: Array.isArray(body.working_days) ? body.working_days : [],
      opensAt: typeof body.opens_at === "string" ? body.opens_at : "",
      closesAt: typeof body.closes_at === "string" ? body.closes_at : "",
    });

    return ok({
      success: true,
      clinic_id: result.clinicId,
      doctor_id: result.doctorId,
      booking_path: result.bookingPath,
    });
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error configuring clinic", error);
  }
}
