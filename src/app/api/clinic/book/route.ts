import { NextRequest } from "next/server";
import { badRequest, mapDomainError, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import prisma from "@/lib/prisma";
import { bookPublicAppointment } from "@/services/booking-service";

// In-clinic booking: the solo owner books a patient (new or returning) from
// inside /clinic — no public link, no new tab. Reception-capable, scoped to
// the caller's clinic; resolves the clinic's bookable doctor server-side and
// reuses the booking service with viaStaff (skips the online-booking pause).
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const patientName = typeof body.patient_name === "string" ? body.patient_name.trim() : "";
    const patientPhone = typeof body.patient_phone === "string" ? body.patient_phone.trim() : "";
    const scheduledTime = typeof body.scheduled_time === "string" ? body.scheduled_time : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() || undefined : undefined;

    if (patientName.length < 2) return badRequest("A patient name is required.");
    if (patientPhone.replace(/\D/g, "").length < 7) return badRequest("A valid phone number is required.");
    if (!scheduledTime) return badRequest("Pick a date and time.");

    // The clinic's bookable doctor — the owner's own profile, else any doctor
    // of the clinic (mirrors getClinicOverview's resolution).
    const doctor =
      (await prisma.staffProfile.findFirst({ where: { user_id: auth.session.userId, clinic_id: auth.clinicId } })) ??
      (await prisma.staffProfile.findFirst({ where: { clinic_id: auth.clinicId } }));
    if (!doctor) return badRequest("Add your clinic profile before booking a patient.");

    const result = await bookPublicAppointment({
      doctorId: doctor.id,
      scheduledTime,
      patientName,
      patientPhone,
      notes,
      viaStaff: true,
    });

    return ok(
      {
        success: true,
        appointment: { id: result.appointment.id, scheduled_time: result.appointment.scheduled_time, status: result.appointment.status },
        patient: result.patient,
        is_new_patient: result.isNewPatient,
      },
      201,
    );
  } catch (error) {
    return mapDomainError(error) ?? serverError("Error booking the patient", error);
  }
}
