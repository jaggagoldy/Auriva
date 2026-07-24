import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { withRequestId } from "@/api/logger";
import { canAccessAdminPortal, canAccessDoctorWorkspace } from "@/domain/authorization";
import {
  TreatmentPlanError,
  activatePlan,
  archivePlan,
  bookNextSession,
  cancelPlan,
  cancelSession,
  completePlan,
  createPlan,
  extendPlan,
  generatePlanDocument,
  getActivePlansForPatient,
  getPatientPlans,
  getPlan,
  getTreatmentFollowups,
  rescheduleSession,
  setSessionNote,
  updatePlanClinical,
} from "@/services/treatment-plan-service";

// C1 — Treatment Planning. Reception-capable to view/operate; CLINICAL content
// (create/activate/update/extend/complete/archive/cancel) requires the doctor
// or owner (Amendment 2 — reception manages operations, not clinical decisions).
function mapErr(error: unknown) {
  if (error instanceof TreatmentPlanError) return /not found/i.test(error.message) ? notFound(error.message) : badRequest(error.message);
  return null;
}
const CLINICAL_ACTIONS = new Set(["create", "activate", "update_clinical", "extend", "complete", "archive", "cancel"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const url = new URL(request.url);
    const planId = url.searchParams.get("plan_id");
    const patientId = url.searchParams.get("patient_id");
    const activePatientId = url.searchParams.get("active_patient_id");
    if (url.searchParams.get("followups")) return ok(await getTreatmentFollowups(auth.clinicId));
    if (planId) return ok(await getPlan(planId, auth.clinicId));
    if (activePatientId) return ok(await getActivePlansForPatient(activePatientId, auth.clinicId));
    if (patientId) return ok(await getPatientPlans(patientId, auth.clinicId));
    return badRequest("plan_id, patient_id, active_patient_id or followups is required.");
  } catch (error) {
    return mapErr(error) ?? serverError("Error loading treatment plans", error);
  }
}

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const auth = await requireStaffContext("reception");
      if (!auth.ok) return auth.response;
      const body = await request.json();
      const action = String(body.action ?? "");
      const actor = auth.session.userId;

      if (CLINICAL_ACTIONS.has(action) && !(canAccessDoctorWorkspace(auth.session.role) || canAccessAdminPortal(auth.session.role))) {
        return forbidden("Only a doctor or the practice owner can change a plan's clinical content.");
      }

      switch (action) {
        case "create": {
          const plan = await createPlan({
            clinicId: auth.clinicId,
            patientId: String(body.patient_id ?? ""),
            doctorId: String(body.doctor_id ?? ""),
            originAppointmentId: typeof body.origin_appointment_id === "string" ? body.origin_appointment_id : null,
            title: String(body.title ?? ""),
            serviceId: String(body.service_id ?? ""),
            sessionsPlanned: Number(body.sessions_planned),
            notes: typeof body.notes === "string" ? body.notes : null,
            actorUserId: actor,
          });
          if (body.activate) return ok(await activatePlan(plan.id, auth.clinicId, actor));
          return ok(plan);
        }
        case "activate": return ok(await activatePlan(String(body.plan_id), auth.clinicId, actor));
        case "complete": return ok(await completePlan(String(body.plan_id), auth.clinicId, actor));
        case "archive": return ok(await archivePlan(String(body.plan_id), auth.clinicId, actor));
        case "cancel": return ok(await cancelPlan(String(body.plan_id), auth.clinicId, actor));
        case "update_clinical":
          return ok(await updatePlanClinical(String(body.plan_id), auth.clinicId, { title: body.title, notes: body.notes }, actor));
        case "extend": return ok(await extendPlan(String(body.plan_id), auth.clinicId, Number(body.additional), actor));
        case "book_next": {
          if (typeof body.scheduled_time !== "string") return badRequest("scheduled_time is required.");
          return ok(await bookNextSession(String(body.plan_id), auth.clinicId, { scheduledTime: body.scheduled_time, doctorId: body.doctor_id ?? null }, actor));
        }
        case "cancel_session": return ok(await cancelSession(String(body.session_id), auth.clinicId, actor));
        case "reschedule_session": {
          if (typeof body.scheduled_time !== "string") return badRequest("scheduled_time is required.");
          return ok(await rescheduleSession(String(body.session_id), auth.clinicId, body.scheduled_time, actor));
        }
        case "set_note": {
          // Clinical note is doctor/owner-only; operational note is reception (Amendment 4).
          if (body.clinical_note !== undefined && !(canAccessDoctorWorkspace(auth.session.role) || canAccessAdminPortal(auth.session.role))) {
            return forbidden("Only a doctor or the owner can set a clinical note.");
          }
          return ok(await setSessionNote(String(body.session_id), auth.clinicId, { clinicalNote: body.clinical_note, operationalNote: body.operational_note }, actor));
        }
        case "print": {
          const doc = await generatePlanDocument(String(body.plan_id), auth.clinicId, actor);
          return doc ? ok(doc) : notFound("Could not generate the plan document.");
        }
        default: return badRequest("Unknown action.");
      }
    } catch (error) {
      return mapErr(error) ?? serverError("Error updating treatment plan", error);
    }
  });
}
