import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { listTemplates, createTemplate, resolveClinicDoctor, ClinicalTemplateError } from "@/services/clinical-template-service";

// P6 Clinical Templates — the caller's own reusable consult notes.
//   GET  → { templates }
//   POST { name, subjective?, objective?, assessment?, plan?, advice?, exercises?, follow_up_days?, is_favourite? }
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const doctor = await resolveClinicDoctor(auth.clinicId, auth.session.userId);
    if (!doctor) return ok({ templates: [] });
    return ok({ templates: await listTemplates(auth.clinicId, doctor.id) });
  } catch (error) {
    return serverError("Error loading templates", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const doctor = await resolveClinicDoctor(auth.clinicId, auth.session.userId);
    if (!doctor) return badRequest("Add your clinic profile before creating templates.");
    const body = await request.json().catch(() => ({}));
    const template = await createTemplate(auth.clinicId, doctor.id, body);
    return ok({ template }, 201);
  } catch (error) {
    if (error instanceof ClinicalTemplateError) return badRequest(error.message);
    return serverError("Error creating the template", error);
  }
}
