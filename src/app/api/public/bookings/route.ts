import { NextRequest } from "next/server";
import { BookingChannel } from "@prisma/client";
import { badRequest, mapDomainError, ok, serverError, tooManyRequests } from "@/api/http";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { logger, withRequestId } from "@/api/logger";
import prisma from "@/lib/prisma";
import { createPublicBooking } from "@/services/public-booking-service";

export async function POST(request: NextRequest) {
  return withRequestId(request, async () => {
    try {
      const body = await request.json();
      const doctorId = typeof body.doctor_id === "string" ? body.doctor_id.trim() : "";
      const patientName = typeof body.patient_name === "string" ? body.patient_name.trim() : "";
      const patientPhone = typeof body.patient_phone === "string" ? body.patient_phone.trim() : "";
      const scheduledTime = typeof body.scheduled_time === "string" ? body.scheduled_time : "";
      const notes = typeof body.notes === "string" ? body.notes : undefined;
      const channelInput = typeof body.booking_channel === "string" ? body.booking_channel.toUpperCase() : "DIRECT";

      if (!doctorId || !scheduledTime) {
        return badRequest("doctor_id and scheduled_time are required.");
      }
      if (patientName.length < 2) {
        return badRequest("A patient name is required.");
      }
      if (patientPhone.replace(/\D/g, "").length < 7) {
        return badRequest("A valid phone number is required.");
      }

      // Rate limiting source IP, target phone, and target doctor
      const rateLimit = checkRateLimit([
        { key: `public-book:ip:${clientIp(request)}`, limit: 10, windowMs: 15 * 60 * 1000 },
        { key: `public-book:phone:${patientPhone}`, limit: 5, windowMs: 60 * 60 * 1000 },
        { key: `public-book:doctor:${doctorId}`, limit: 20, windowMs: 60 * 60 * 1000 },
      ]);
      if (!rateLimit.allowed) {
        logger.warn("public.booking rate-limited", { phone: patientPhone });
        return tooManyRequests("Too many booking attempts. Please try again later.", rateLimit.retryAfterSeconds);
      }

      const doctor = await prisma.staffProfile.findUnique({
        where: { id: doctorId },
        select: { clinic_id: true },
      });

      if (!doctor) {
        return badRequest("Doctor not found.");
      }

      const channel = Object.values(BookingChannel).includes(channelInput as BookingChannel)
        ? (channelInput as BookingChannel)
        : BookingChannel.DIRECT;

      const result = await createPublicBooking({
        clinicId: doctor.clinic_id,
        doctorId,
        scheduledTime,
        patientName,
        patientPhone,
        notes,
        bookingChannel: channel,
      });

      logger.info("public.booking created", {
        appointmentId: result.appointmentId,
        manageToken: result.manageToken,
        isNewPatient: result.isNewPatient,
      });

      return ok(
        {
          success: true,
          appointment: {
            id: result.appointmentId,
            scheduled_time: result.scheduledTime,
            status: result.status,
            manage_token: result.manageToken,
          },
          patient: result.patient,
          is_new_patient: result.isNewPatient,
          manage_token: result.manageToken,
          doctor_name: result.doctorName,
          clinic_name: result.clinicName,
        },
        201
      );
    } catch (error) {
      return mapDomainError(error) ?? serverError("Error creating public booking", error);
    }
  });
}
