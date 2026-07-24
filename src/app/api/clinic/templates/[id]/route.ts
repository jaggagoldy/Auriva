import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { updateTemplate, deleteTemplate, ClinicalTemplateError } from "@/services/clinical-template-service";

// P6 — update (edit / favourite) or delete one of the caller's templates.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const template = await updateTemplate(id, auth.clinicId, body);
    return ok({ template });
  } catch (error) {
    if (error instanceof ClinicalTemplateError) return badRequest(error.message);
    return serverError("Error updating the template", error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    await deleteTemplate(id, auth.clinicId);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof ClinicalTemplateError) return badRequest(error.message);
    return serverError("Error deleting the template", error);
  }
}
