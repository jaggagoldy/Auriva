import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getPolicySettings, setBillingPolicy, setPrepaidHardGate, InvalidBillingPolicyError } from "@/services/billing-policy-service";

// M3B B4 — clinic billing-policy settings. Owner/reception-capable.
//   GET   → { policy, hardGate }
//   PATCH { policy?, hardGate? } → updated settings
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    return ok(await getPolicySettings(auth.clinicId));
  } catch (error) {
    return serverError("Error loading billing policy", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const body = await request.json();
    if (typeof body.policy === "string") {
      await setBillingPolicy(auth.clinicId, body.policy, auth.session.userId);
    }
    if (typeof body.hardGate === "boolean") {
      await setPrepaidHardGate(auth.clinicId, body.hardGate, auth.session.userId);
    }
    return ok(await getPolicySettings(auth.clinicId));
  } catch (error) {
    if (error instanceof InvalidBillingPolicyError) return badRequest(error.message);
    return serverError("Error updating billing policy", error);
  }
}
