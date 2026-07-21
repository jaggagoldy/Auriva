import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { evaluateConsultationGate } from "@/services/billing-policy-service";
import { prepareConsultationInvoice } from "@/services/checkout-service";

// M3B B4 — the prepaid/hybrid consultation gate.
//   GET  ?appointment_id=  → { policy, required, satisfied, hardBlock, consultationFee, collected }
//   POST { action:"prepare",  appointment_id } → { invoiceId } (consultation invoice to collect up front)
//   POST { action:"override", appointment_id, reason } → audited soft-gate override
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const appointmentId = new URL(request.url).searchParams.get("appointment_id") ?? "";
    if (!appointmentId) return badRequest("appointment_id is required.");
    return ok(await evaluateConsultationGate(appointmentId, auth.clinicId));
  } catch (error) {
    return serverError("Error evaluating consultation gate", error);
  }
}

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const appointmentId = typeof body.appointment_id === "string" ? body.appointment_id : "";
      if (!appointmentId) return badRequest("appointment_id is required.");

      if (body.action === "prepare") {
        const invoiceId = await prepareConsultationInvoice(appointmentId, auth.clinicId, auth.session.userId);
        return ok({ invoiceId });
      }
      if (body.action === "override") {
        const clinic = await prisma.clinic.findUnique({ where: { id: auth.clinicId }, select: { organization_id: true } });
        await recordAudit({
          organizationId: clinic?.organization_id ?? null,
          actorUserId: auth.session.userId,
          action: "prepaid_gate_overridden",
          detail: `${appointmentId}${body.reason ? ` — ${String(body.reason)}` : ""}`,
        });
        return ok({ ok: true });
      }
      return badRequest("Unknown action.");
    } catch (error) {
      return serverError("Error in consultation gate", error);
    }
  });
}
