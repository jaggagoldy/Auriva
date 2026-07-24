import { NextRequest } from "next/server";
import { mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getClinicSchedule } from "@/services/clinic-schedule-service";

// P2 (Doctor Calendar): the clinic's booked appointments + doctor time blocks
// grouped by day, over an arbitrary window. Reception-capable, scoped to the
// caller's own clinic.
//   GET /api/clinic/schedule?start=YYYY-MM-DD&days=7
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const params = new URL(request.url).searchParams;
    const start = params.get("start") ?? todayKey();
    const days = Number(params.get("days") ?? "7");

    const schedule = await getClinicSchedule(auth.clinicId, auth.session.userId, start, days);
    return ok({ start, days: schedule.length, schedule });
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error loading schedule", error);
  }
}
