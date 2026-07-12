import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import { startConsultation, completeVisit } from "@/services/consultation-service";

// Milestone 1 Batch 5: the solo visit's clinical steps, inside /clinic.
//   POST { action: "start", appointment_id }
//   POST { action: "complete", appointment_id, notes?, diagnosis?, follow_up_date?,
//          prescription_notes?, treatment_id? } → returns the invoice to collect.
// reception-capable (owner + front desk); scoped to the caller's clinic.
// H4 (observability): correlation-id wrapped — this is the clinical half of the
// pilot's core arrival→payment flow, the most support-call-prone path.
export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;

      const body = await request.json();
      const appointmentId = typeof body.appointment_id === "string" ? body.appointment_id : "";
      if (!appointmentId) return badRequest("appointment_id is required.");

      if (body.action === "start") {
        const appt = await startConsultation({
          appointmentId,
          clinicId: auth.clinicId,
          actorUserId: auth.session.userId,
        });
        return ok({ success: true, appointment_id: appt.id, status: appt.status });
      }

      if (body.action === "complete") {
        const result = await completeVisit({
          appointmentId,
          clinicId: auth.clinicId,
          actorUserId: auth.session.userId,
          chiefComplaint: typeof body.chief_complaint === "string" ? body.chief_complaint : undefined,
          notes: typeof body.notes === "string" ? body.notes : undefined,
          diagnosis: typeof body.diagnosis === "string" ? body.diagnosis : undefined,
          followUpDate: typeof body.follow_up_date === "string" ? body.follow_up_date : undefined,
          prescriptionNotes: typeof body.prescription_notes === "string" ? body.prescription_notes : undefined,
          prescriptionMedicinesJson:
            typeof body.prescription_medicines_json === "string" ? body.prescription_medicines_json : undefined,
          investigations: Array.isArray(body.investigations)
            ? body.investigations.filter((t: unknown): t is string => typeof t === "string")
            : undefined,
          treatmentId: typeof body.treatment_id === "string" ? body.treatment_id : null,
        });
        return ok({ success: true, ...result });
      }

      return badRequest('action must be "start" or "complete".');
    } catch (error) {
      return mapDomainError(error) ?? serverError("Error updating consultation", error);
    }
  });
}
