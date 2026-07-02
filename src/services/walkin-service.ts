import prisma from "@/lib/prisma";
import { findOrCreatePatientByPhone } from "@/services/patient-service";
import { assignQueueNumber, endOfDay, startOfDay, QUEUE_INCLUDE } from "@/services/queue-service";
import { DuplicateActiveAppointmentError, logAppointmentEvent } from "@/services/appointment-service";

export class DoctorNotFoundError extends Error {}

const ACTIVE_STATUSES = ["checked_in", "waiting", "doctor_ready", "in_consultation"] as const;

export async function registerWalkIn(params: {
  phoneNumber: string;
  fullName?: string;
  bloodGroup?: string;
  doctorId: string;
  clinicId: string;
  notes?: string;
  priority?: number;
  actorUserId?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const doctor = await tx.staffProfile.findUnique({ where: { id: params.doctorId } });
    if (!doctor || doctor.clinic_id !== params.clinicId) {
      throw new DoctorNotFoundError("Doctor not found in this clinic.");
    }

    const { user: patientUser, isNew: isNewPatient } = await findOrCreatePatientByPhone(
      tx,
      params.phoneNumber,
      { full_name: params.fullName, blood_group: params.bloodGroup }
    );
    const patientProfile = patientUser.patientProfile!;

    const today = new Date();
    const existingActive = await tx.appointment.findFirst({
      where: {
        patient_id: patientProfile.id,
        doctor_id: params.doctorId,
        status: { in: [...ACTIVE_STATUSES] },
        scheduled_time: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    });
    if (existingActive) {
      throw new DuplicateActiveAppointmentError(
        "This patient already has an active queue entry with this doctor today."
      );
    }

    const queueNumber = await assignQueueNumber(tx, params.doctorId, today);

    const appointment = await tx.appointment.create({
      data: {
        patient_id: patientProfile.id,
        doctor_id: params.doctorId,
        clinic_id: params.clinicId,
        scheduled_time: today,
        status: "waiting",
        checked_in_at: today,
        queue_number: queueNumber,
        walk_in: true,
        priority: params.priority ?? 0,
        notes: params.notes ?? null,
      },
      include: QUEUE_INCLUDE,
    });

    await logAppointmentEvent(tx, appointment.id, {
      type: "walk_in_registered",
      to_status: "waiting",
      actorUserId: params.actorUserId,
    });
    await logAppointmentEvent(tx, appointment.id, {
      type: "checked_in",
      to_status: "waiting",
      note: "Walk-in arrival",
      actorUserId: params.actorUserId,
    });

    return { appointment, isNewPatient };
  });
}
