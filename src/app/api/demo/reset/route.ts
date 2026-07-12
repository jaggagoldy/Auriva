import { NextRequest } from "next/server";
import { forbidden, notFound, ok, serverError, tooManyRequests } from "@/api/http";
import { requireStaffContext, createSession, setSessionCookie } from "@/api/session";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { logger } from "@/api/logger";
import { isDemoModeEnabled } from "@/lib/config";
import prisma from "@/lib/prisma";
import { resetDemo } from "@/services/demo-service";

// Milestone 1 Batch 6 (Demo Mode): one-click "Reset demo" — wipes the sandbox
// clinic's content and rebuilds the original story. Requires a reception-capable
// session AND that session's clinic to belong to the demo organization, so it
// is unreachable from any real clinic's workspace (resetDemo() is also safe by
// construction — it only ever touches the is_demo org). The reset preserves the
// owner/clinic ids, but we re-issue the session cookie defensively so the tour
// continues seamlessly.
export async function POST(request: NextRequest) {
  try {
    if (!isDemoModeEnabled()) return notFound("Not found.");

    // Reset wipes+reseeds ~50 rows and is reachable by anyone who entered the
    // demo — rate-limit by IP so one visitor can't thrash the shared sandbox.
    const rateLimit = checkRateLimit([
      { key: `demo-reset:ip:${clientIp(request)}`, limit: 10, windowMs: 60 * 60 * 1000 },
    ]);
    if (!rateLimit.allowed) {
      return tooManyRequests("Too many resets. Please try again later.", rateLimit.retryAfterSeconds);
    }

    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: { organization: { select: { is_demo: true } } },
    });
    if (!clinic?.organization.is_demo) {
      return forbidden("Reset is only available inside the demo clinic.");
    }

    const ids = await resetDemo();
    const { rawToken, expires_at } = await createSession(ids.ownerUserId, "super_admin");
    await setSessionCookie(rawToken, expires_at);
    logger.info("demo.reset", { clinicId: ids.clinicId });

    return ok({ success: true });
  } catch (error) {
    return serverError("Error resetting demo", error);
  }
}
