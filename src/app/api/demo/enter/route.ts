import { NextRequest } from "next/server";
import { notFound, ok, serverError, tooManyRequests } from "@/api/http";
import { createSession, setSessionCookie } from "@/api/session";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { logger, withRequestId } from "@/api/logger";
import { isDemoModeEnabled } from "@/lib/config";
import { enterDemo } from "@/services/demo-service";

// Milestone 1 Batch 6 (Demo Mode): "Skip & explore". Lazily creates/loads the
// sandbox "SmileCare Physiotherapy" clinic and opens a session for its owner,
// dropping the visitor straight into /clinic. Public (this IS the skip-signup
// path) but rate-limited by IP — seeding is a write, so it can't be spammed.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      // H2: operator kill-switch. When disabled, the feature is invisible (404),
      // not merely forbidden — don't advertise a surface that's turned off.
      if (!isDemoModeEnabled()) return notFound("Not found.");

      const rateLimit = checkRateLimit([
        { key: `demo-enter:ip:${clientIp(request)}`, limit: 20, windowMs: 60 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        return tooManyRequests("Too many attempts. Please try again later.", rateLimit.retryAfterSeconds);
      }

      const ids = await enterDemo();
      const { rawToken, expires_at } = await createSession(ids.ownerUserId, "super_admin");
      await setSessionCookie(rawToken, expires_at);
      logger.info("demo.enter", { clinicId: ids.clinicId });

      return ok({ success: true, redirect: "/clinic" });
    } catch (error) {
      return serverError("Error entering demo", error);
    }
  });
}
