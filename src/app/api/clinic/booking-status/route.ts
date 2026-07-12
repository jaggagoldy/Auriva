import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { updateClinicSettings } from "@/services/clinic-service";
import prisma from "@/lib/prisma";

// Milestone 1 Batch 2: the "Accepting Bookings" toggle for the caller's own
// clinic ("My Clinic"). Session-scoped (no clinic id in the URL) — the
// workspace top-bar switch just flips a boolean. Authorized with the
// `reception` capability per the Product Office matrix: the owner (super_admin
// holds reception by default) and reception staff who run the front desk can
// pause/resume online bookings; a plain doctor cannot.

export async function GET() {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;
    const clinic = await prisma.clinic.findUnique({
      where: { id: auth.clinicId },
      select: { id: true, accepting_bookings: true },
    });
    return ok({ accepting_bookings: clinic?.accepting_bookings ?? true });
  } catch (error) {
    return serverError("Error reading booking status", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (typeof body.accepting_bookings !== "boolean") {
      return badRequest("accepting_bookings (boolean) is required.");
    }

    const updated = await updateClinicSettings(auth.clinicId, {
      accepting_bookings: body.accepting_bookings,
    });
    return ok({ id: updated.id, accepting_bookings: updated.accepting_bookings });
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error updating booking status", error);
  }
}
