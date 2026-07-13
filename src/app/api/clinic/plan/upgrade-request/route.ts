import { NextRequest } from "next/server";
import { ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import prisma from "@/lib/prisma";
import { requestUpgrade } from "@/services/subscription-service";

// BRD-043 US-504 (Sprint 5): a clinic REQUESTS an upgrade. This records the
// request (audit + event) and returns — it never changes Organization.plan
// (ADR-004: Auriva applies the change administratively). Owner / Managing
// Doctor only.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffContext(canAccessAdminPortal);
    if (!auth.ok) return auth.response;

    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: { organization_id: true },
    });
    const body = await request.json().catch(() => ({}));

    const result = await requestUpgrade({
      clinicId: auth.clinicId,
      organizationId: clinic?.organization_id ?? "",
      actorUserId: auth.session.userId,
      targetPlan: typeof body.target_plan === "string" ? body.target_plan : undefined,
    });
    return ok(result);
  } catch (error) {
    return serverError("Error recording upgrade request", error);
  }
}
