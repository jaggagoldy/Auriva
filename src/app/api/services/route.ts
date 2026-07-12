import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import {
  canAccessReception,
  canAccessDoctorWorkspace,
} from "@/domain/authorization";
import { createService, listServices } from "@/services/service-catalog-service";

// Milestone 1 (First Clinic Ready): the "Treatments & Services" catalog API.
// Always scoped to the caller's own clinic by requireStaffContext (a client-
// supplied clinic_id is ignored for profile-holding staff) — no cross-clinic
// access is possible.

// Reading the catalog is broad (any clinic staff — reception picks a treatment
// at booking, the doctor sees it at consult); super_admin passes via
// canAccessReception.
const canViewCatalog = (role: string) =>
  canAccessReception(role) || canAccessDoctorWorkspace(role);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext(canViewCatalog);
    if (!auth.ok) return auth.response;
    const includeInactive = request.nextUrl.searchParams.get("include_inactive") === "true";
    return ok(await listServices(auth.clinicId, { includeInactive }));
  } catch (error) {
    return serverError("Error listing treatments & services", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Product Office matrix: Owner + reception/admin staff (with the reception
    // capability) manage the catalog; plain doctors are read-only. super_admin
    // holds `reception` by default, so the owner passes; a doctor granted
    // `reception` (adaptive workspace) does too, while an ungranted doctor
    // fails here but can still GET.
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (typeof body.name !== "string") {
      return badRequest("name is required.");
    }
    if (typeof body.duration_minutes !== "number" || typeof body.price !== "number") {
      return badRequest("duration_minutes and price are required numbers.");
    }

    const service = await createService(auth.clinicId, {
      name: body.name,
      durationMinutes: body.duration_minutes,
      price: body.price,
      bufferMinutes:
        typeof body.buffer_minutes === "number" ? body.buffer_minutes : null,
      sortOrder: typeof body.sort_order === "number" ? body.sort_order : undefined,
    });
    return ok(service, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error creating treatment", error);
  }
}
