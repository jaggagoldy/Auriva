import { NextRequest } from "next/server";
import { mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getPracticeProfile, updatePracticeProfile, PracticeProfileError } from "@/services/practice-profile-service";

// P3 Practice Setup — the whole clinic + owning-doctor profile as one document.
//   GET   → { clinic, doctor }
//   PATCH { clinic?, doctor? } → updated { clinic, doctor }
// Reception-capable (the solo owner), scoped to the caller's clinic.
export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    return ok(await getPracticeProfile(auth.clinicId, auth.session.userId));
  } catch (error) {
    return serverError("Error loading the practice profile", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const body = await request.json().catch(() => ({}));
    const result = await updatePracticeProfile(auth.clinicId, auth.session.userId, {
      clinic: body.clinic && typeof body.clinic === "object" ? body.clinic : undefined,
      doctor: body.doctor && typeof body.doctor === "object" ? body.doctor : undefined,
    });
    return ok(result);
  } catch (error) {
    if (error instanceof PracticeProfileError) {
      return Response.json({ error: "Bad Request", message: error.message }, { status: 400 });
    }
    return mapDomainError(error) ?? serverError("Error saving the practice profile", error);
  }
}
