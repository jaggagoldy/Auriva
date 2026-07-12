import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { listLabOrders, enterLabResult, cancelLabOrder } from "@/services/lab-service";

// Milestone 1: the solo clinic's lab loop, inside /clinic. Investigations
// ordered during a consult land here as a worklist — the owner results them
// at the desk (ordered → resulted) or cancels. reception-capable (solo owner
// + front desk); scoped to the caller's clinic.
//   GET                                        → every lab order for the clinic
//   PATCH { action: "result", lab_order_id, result_values?, result_notes? }
//   PATCH { action: "cancel", lab_order_id }
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const orders = await listLabOrders({ clinicId: auth.clinicId });
    return ok({ orders });
  } catch (error) {
    return serverError("Error fetching lab orders", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const labOrderId = typeof body.lab_order_id === "string" ? body.lab_order_id : "";
    if (!labOrderId) return badRequest("lab_order_id is required.");

    if (body.action === "cancel") {
      const order = await cancelLabOrder(labOrderId, auth.clinicId);
      return ok({ order });
    }

    if (body.action === "result") {
      const resultValues = Array.isArray(body.result_values)
        ? body.result_values
            .filter((v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null)
            .map((v: Record<string, unknown>) => ({
              test: typeof v.test === "string" ? v.test : "",
              value: typeof v.value === "string" ? v.value : "",
              unit: typeof v.unit === "string" ? v.unit : undefined,
              reference: typeof v.reference === "string" ? v.reference : undefined,
            }))
            .filter((v: { value: string }) => v.value.trim())
        : [];
      const order = await enterLabResult({
        labOrderId,
        clinicId: auth.clinicId,
        resultValues,
        resultNotes: typeof body.result_notes === "string" ? body.result_notes : null,
        resultedByUserId: auth.session.userId,
      });
      return ok({ order });
    }

    return badRequest('action must be "result" or "cancel".');
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating lab order", error);
  }
}
