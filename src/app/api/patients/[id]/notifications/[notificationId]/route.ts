import { NextRequest } from "next/server";
import { mapDomainError, notFound, ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { markNotificationRead } from "@/services/notification-service";

// PAT-1 (Release 1.2 Sprint 1) — mark a single notification read. Patient-only,
// same reasoning as the GET route in the parent folder.
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; notificationId: string }> }
) {
  try {
    const { id, notificationId } = await params;

    const patientAuth = await requirePatientContext();
    if (!patientAuth.ok) return patientAuth.response;

    if (patientAuth.healthcareProfileId !== id) {
      return notFound(`Patient profile ${id} not found.`);
    }

    const notification = await markNotificationRead(notificationId, id);
    return ok(notification);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating notification", error);
  }
}
