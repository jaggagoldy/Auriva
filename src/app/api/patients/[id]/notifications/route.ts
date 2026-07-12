import { NextRequest } from "next/server";
import { notFound, ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { countUnreadNotifications, listNotificationsForPatient } from "@/services/notification-service";

// PAT-1 (Release 1.2 Sprint 1) — a patient's own in-app notification feed.
// Patient-only, same as viewing your own invoices/lab orders: no staff view
// of another patient's notifications exists, because this is the patient's
// personal inbox, not a clinic-scoped operational record.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patientAuth = await requirePatientContext();
    if (!patientAuth.ok) return patientAuth.response;

    // DATA-3 convention: hide existence of another patient's resource via
    // 404 rather than confirming it with a 403.
    if (patientAuth.healthcareProfileId !== id) {
      return notFound(`Patient profile ${id} not found.`);
    }

    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForPatient(id),
      countUnreadNotifications(id),
    ]);
    return ok({ notifications, unreadCount });
  } catch (error) {
    return serverError("Error fetching notifications", error);
  }
}
