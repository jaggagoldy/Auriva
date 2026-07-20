import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import {
  ServiceCaptureError,
  addVisitClinicalService,
  listVisitServiceEvents,
  openVisitCapture,
  removeVisitServiceEvent,
  setVisitServiceEventQty,
} from "@/services/service-capture-service";
import {
  InvalidServiceEventInputError,
  InvalidServiceEventTransitionError,
  ServiceEventNotFoundError,
  ServiceEventPermissionError,
} from "@/services/service-event-service";

// M3B B1 — Doctor Service Capture. The consultation workbench's Services
// section reads/writes a visit's clinical ServiceEvents through here. Scoped to
// the caller's clinic by requireStaffContext (client clinic_id is ignored).
//   GET  ?appointment_id=                         → list the visit's charges
//   POST { action:"open",    appointment_id }     → seed base consultation + list
//   POST { action:"add",     appointment_id, service_id? | {name,category,unit_price}, qty? }
//   POST { action:"set_qty", id, qty }
//   POST { action:"remove",  id }
// Every mutation returns the refreshed list so the client renders from server truth.

function mapCaptureError(error: unknown) {
  if (error instanceof ServiceEventPermissionError) return forbidden(error.message);
  if (error instanceof ServiceEventNotFoundError) return notFound(error.message);
  if (
    error instanceof ServiceCaptureError ||
    error instanceof InvalidServiceEventTransitionError ||
    error instanceof InvalidServiceEventInputError
  ) {
    return badRequest(error.message);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const appointmentId = new URL(request.url).searchParams.get("appointment_id") ?? "";
    if (!appointmentId) return badRequest("appointment_id is required.");
    return ok(await listVisitServiceEvents(appointmentId, auth.clinicId));
  } catch (error) {
    return mapCaptureError(error) ?? serverError("Error listing visit services", error);
  }
}

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const actorUserId = auth.session.userId;

      if (body.action === "open") {
        const appointmentId = typeof body.appointment_id === "string" ? body.appointment_id : "";
        if (!appointmentId) return badRequest("appointment_id is required.");
        return ok(await openVisitCapture(appointmentId, auth.clinicId, actorUserId));
      }

      if (body.action === "add") {
        const appointmentId = typeof body.appointment_id === "string" ? body.appointment_id : "";
        if (!appointmentId) return badRequest("appointment_id is required.");
        const list = await addVisitClinicalService(appointmentId, auth.clinicId, actorUserId, {
          serviceId: typeof body.service_id === "string" ? body.service_id : null,
          name: typeof body.name === "string" ? body.name : undefined,
          category: typeof body.category === "string" ? body.category : undefined,
          unitPrice: typeof body.unit_price === "number" ? body.unit_price : undefined,
          qty: typeof body.qty === "number" ? body.qty : undefined,
        });
        return ok(list);
      }

      if (body.action === "set_qty") {
        const id = typeof body.id === "string" ? body.id : "";
        if (!id || typeof body.qty !== "number") return badRequest("id and qty are required.");
        return ok(await setVisitServiceEventQty(id, auth.clinicId, body.qty));
      }

      if (body.action === "remove") {
        const id = typeof body.id === "string" ? body.id : "";
        if (!id) return badRequest("id is required.");
        return ok(await removeVisitServiceEvent(id, auth.clinicId));
      }

      return badRequest("Unknown action.");
    } catch (error) {
      return mapCaptureError(error) ?? serverError("Error capturing visit service", error);
    }
  });
}
