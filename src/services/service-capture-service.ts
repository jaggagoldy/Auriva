// M3B Checkpoint B1 — Doctor Service Capture (orchestration).
//
// The thin, clinic-scoped layer the consultation workbench calls to capture a
// visit's clinical charges as ServiceEvents. It composes the pure M3A/M3B
// primitives (service-event-service) and adds two things they intentionally
// don't have: (1) clinic-scoping/authorization of the appointment, and (2) the
// base Consultation line.
//
// Design note (the consultation fee is now a ServiceEvent): a captured visit's
// charges must include the consultation itself, or the settlement engine's
// events-only path would drop it. So opening capture seeds a base Consultation
// event (priced by the existing fee-resolution chain). Everything the doctor
// adds stacks on top, and Complete Visit settles them all through the M3A
// engine — one path. This is the fee→event unification the C3 debt register
// earmarked; it is confined to the workbench flow (an appointment completed
// WITHOUT capture still takes the unchanged legacy consultation-fee draft).
//
// Scope guard (B1): doctors capture CLINICAL services only. Financial charges
// (reception) are a later checkpoint; permission-by-kind enforces it.

import prisma from "@/lib/prisma";
import { resolveConsultationFee } from "@/services/billing-service";
import {
  addServiceEvent,
  listServiceEventsForAppointment,
  removeServiceEvent,
  updateServiceEventQty,
} from "@/services/service-event-service";
import { ServiceCategory, isServiceCategory } from "@/domain/service-catalog";

export class ServiceCaptureError extends Error {}

const CAPTURE_ROLE = "doctor" as const; // clinical capture in the consult surface

async function requireClinicAppointment(appointmentId: string, clinicId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinic_id: clinicId },
    select: {
      id: true,
      clinic_id: true,
      patient_id: true,
      doctor_id: true,
      follow_up_source_appointment_id: true,
    },
  });
  if (!appointment) throw new ServiceCaptureError("Appointment not found in this clinic.");
  return appointment;
}

/** Draft + finalized events for a visit (the capture list). */
export async function listVisitServiceEvents(appointmentId: string, clinicId: string) {
  await requireClinicAppointment(appointmentId, clinicId);
  return listServiceEventsForAppointment(appointmentId);
}

/**
 * Open capture for a visit: idempotently seed the base Consultation event (if
 * the visit has no Consultation-category charge yet), then return the list.
 * Safe to call on every workbench mount.
 */
export async function openVisitCapture(appointmentId: string, clinicId: string, actorUserId?: string | null) {
  const appt = await requireClinicAppointment(appointmentId, clinicId);

  const hasConsultation = await prisma.serviceEvent.count({
    where: {
      appointment_id: appointmentId,
      category: "Consultation",
      status: { in: ["draft", "finalized"] },
    },
  });

  if (hasConsultation === 0) {
    await prisma.$transaction(async (tx) => {
      const { fee, doctorName } = await resolveConsultationFee(tx, {
        doctorId: appt.doctor_id,
        isFollowUp: Boolean(appt.follow_up_source_appointment_id),
      });
      await tx.serviceEvent.create({
        data: {
          clinic_id: clinicId,
          patient_id: appt.patient_id,
          appointment_id: appointmentId,
          name: `${appt.follow_up_source_appointment_id ? "Follow-up consultation" : "Consultation"} — ${doctorName}`,
          category: "Consultation",
          kind: "clinical",
          unit_price: fee,
          qty: 1,
          amount: fee,
          status: "draft",
          needs_catalog_review: false,
          added_by_user_id: actorUserId ?? null,
          added_by_role: CAPTURE_ROLE,
        },
      });
    });
  }

  return listServiceEventsForAppointment(appointmentId);
}

interface AddClinicalInput {
  serviceId?: string | null; // catalog service (snapshotted)
  // ad-hoc (when serviceId is absent):
  name?: string;
  category?: string;
  unitPrice?: number;
  qty?: number;
}

/**
 * Add a clinical service to a visit — either from the catalog (snapshotted) or
 * ad-hoc (flagged for catalog review). `kind` is always clinical in B1; the
 * service layer's permission-by-kind rejects a financial catalog service.
 */
export async function addVisitClinicalService(
  appointmentId: string,
  clinicId: string,
  actorUserId: string | null | undefined,
  input: AddClinicalInput
) {
  const appt = await requireClinicAppointment(appointmentId, clinicId);

  if (!input.serviceId) {
    // Ad-hoc: doctor names a clinical service and its price.
    const category = (input.category ?? "Procedure") as ServiceCategory;
    if (!isServiceCategory(category)) throw new ServiceCaptureError("Unknown service category.");
    if (!input.name?.trim()) throw new ServiceCaptureError("A service name is required.");
    if (input.unitPrice == null || !Number.isInteger(input.unitPrice) || input.unitPrice < 0) {
      throw new ServiceCaptureError("A valid price is required.");
    }
  }

  await addServiceEvent(
    {
      clinicId,
      patientId: appt.patient_id,
      appointmentId,
      serviceId: input.serviceId ?? null,
      name: input.name,
      category: input.category,
      kind: "clinical",
      unitPrice: input.unitPrice,
      qty: input.qty ?? 1,
    },
    { userId: actorUserId ?? null, role: CAPTURE_ROLE }
  );

  return listServiceEventsForAppointment(appointmentId);
}

/** Change a draft line's quantity; returns the refreshed list. */
export async function setVisitServiceEventQty(id: string, clinicId: string, qty: number) {
  const event = await prisma.serviceEvent.findUnique({ where: { id }, select: { clinic_id: true, appointment_id: true } });
  if (!event || event.clinic_id !== clinicId) throw new ServiceCaptureError("Service not found in this clinic.");
  await updateServiceEventQty(id, qty);
  return listServiceEventsForAppointment(event.appointment_id);
}

/** Remove a draft line; returns the refreshed list. */
export async function removeVisitServiceEvent(id: string, clinicId: string) {
  const event = await prisma.serviceEvent.findUnique({ where: { id }, select: { clinic_id: true, appointment_id: true } });
  if (!event || event.clinic_id !== clinicId) throw new ServiceCaptureError("Service not found in this clinic.");
  await removeServiceEvent(id);
  return listServiceEventsForAppointment(event.appointment_id);
}
