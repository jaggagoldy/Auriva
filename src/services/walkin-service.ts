import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { createHealthcareProfile } from "@/services/patient-service";
import { assignQueueNumber, endOfDay, startOfDay, QUEUE_INCLUDE } from "@/services/queue-service";
import { DuplicateActiveAppointmentError, logAppointmentEvent } from "@/services/appointment-service";

export class DoctorNotFoundError extends Error {}
export class HealthcareProfileNotFoundError extends Error {}
export class WalkInsDisabledError extends Error {}

const ACTIVE_STATUSES = ["checked_in", "waiting", "doctor_ready", "in_consultation"] as const;

export interface RegisterWalkInParams {
  // Reception already resolved (or the patient picked) an existing profile
  // via the search step — APS-029/010 Part I A9 Identity Resolution.
  healthcareProfileId?: string;
  // ...or these create a brand-new Healthcare Profile inline, covering both
  // ordinary registration and emergency (contact-less) registration.
  phoneNumber?: string;
  fullName?: string;
  bloodGroup?: string;
  gender?: string;
  dateOfBirth?: string;
  guardianName?: string;
  guardianRelation?: string;
  isEmergency?: boolean;
  doctorId: string;
  clinicId: string;
  notes?: string;
  priority?: number;
  actorUserId?: string | null;
}

export async function registerWalkIn(params: RegisterWalkInParams) {
  const result = await prisma.$transaction(async (tx) => {
    const doctor = await tx.staffProfile.findUnique({ where: { id: params.doctorId } });
    if (!doctor || doctor.clinic_id !== params.clinicId) {
      throw new DoctorNotFoundError("Doctor not found in this clinic.");
    }

    // Sprint 3: a clinic can turn off ordinary walk-ins (appointment-only
    // operation) — but this NEVER applies to emergencies. Treatment must
    // never be blocked (APS-029 Part I), so an emergency registration
    // bypasses this policy entirely, same as it bypasses identity checks.
    if (!params.isEmergency) {
      const clinic = await tx.clinic.findUnique({ where: { id: params.clinicId } });
      if (clinic && !clinic.allow_walk_ins) {
        throw new WalkInsDisabledError(
          "This clinic accepts booked appointments only — walk-ins are turned off."
        );
      }
    }

    let patientProfile;
    let isNewPatient = false;

    if (params.healthcareProfileId) {
      patientProfile = await tx.patientProfile.findUnique({ where: { id: params.healthcareProfileId } });
      if (!patientProfile) {
        throw new HealthcareProfileNotFoundError(
          `Healthcare Profile ${params.healthcareProfileId} not found.`
        );
      }
    } else {
      // Reception never blocks: full_name defaults to "Unknown Patient"
      // inside createHealthcareProfile when this is a true emergency
      // registration with no name given yet.
      patientProfile = await createHealthcareProfile(
        {
          full_name: params.fullName,
          gender: params.gender,
          date_of_birth: params.dateOfBirth,
          guardian_name: params.guardianName,
          guardian_relation: params.guardianRelation,
          blood_group: params.bloodGroup,
          phone: params.isEmergency ? null : params.phoneNumber,
          registeredByClinicId: params.clinicId,
          onboardingCompleted: true,
          verificationLevel: "unverified",
        },
        tx
      );
      isNewPatient = true;
    }

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

    return { appointment, isNewPatient, patientProfile };
  });

  const clinic = await prisma.clinic.findUnique({
    where: { id: result.appointment.clinic_id },
    select: { organization_id: true }
  });
  if (clinic) {
    await publishEvent({
      eventType: "appointment.booked",
      organizationId: clinic.organization_id,
      entityId: result.appointment.id,
      correlationId: result.appointment.id,
      actorId: params.actorUserId ?? null,
      payload: {
        appointmentId: result.appointment.id,
        patientId: result.appointment.patient_id,
        doctorId: result.appointment.doctor_id,
        clinicId: result.appointment.clinic_id,
        scheduledTime: result.appointment.scheduled_time,
        status: result.appointment.status,
      },
    });

    await publishEvent({
      eventType: "appointment.checked_in",
      organizationId: clinic.organization_id,
      entityId: result.appointment.id,
      correlationId: result.appointment.id,
      actorId: params.actorUserId ?? null,
      payload: {
        appointmentId: result.appointment.id,
        queueNumber: result.appointment.queue_number,
      },
    });
  }

  return result;
}

