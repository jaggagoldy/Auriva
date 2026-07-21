// Milestone 1 (First Clinic Ready), Batch 5 — the solo visit: Today →
// Consultation → Checkout, entirely inside the clinic workspace. This service
// ORCHESTRATES existing primitives; it invents no new status machine or ledger:
//   - transitionStatus (appointment-service) owns every status change,
//   - updateClinicalRecord (appointment-service) saves the notes/diagnosis/follow-up,
//   - completion settles the visit's ServiceEvents into the invoice (M3A/B1).
// S1 Batch A: the legacy single-Treatment re-price + collectVisitPayment wrapper
// were retired — charges are ServiceEvents (B1), payment is the Checkout Workspace.

import prisma from "@/lib/prisma";
import {
  transitionStatus,
  updateClinicalRecord,
  AppointmentNotFoundError,
} from "@/services/appointment-service";
import { recommendTests } from "@/services/test-recommendation-service";

export class ConsultationInputError extends Error {}

/** Loads an appointment and asserts it belongs to the caller's clinic — a
 * visit from another clinic is indistinguishable from one that doesn't exist. */
async function requireClinicAppointment(appointmentId: string, clinicId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinic_id: clinicId },
  });
  if (!appointment) throw new AppointmentNotFoundError("Appointment not found in this clinic.");
  return appointment;
}

/** The left clinical-context rail for the consultation workbench — real,
 * scoped patient data (no fake vitals): profile allergies/conditions, the
 * medicines from their most recent visit, and their recent completed visits. */
export async function getConsultationContext(appointmentId: string, clinicId: string) {
  const appt = await requireClinicAppointment(appointmentId, clinicId);
  const [patient, visits] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { id: appt.patient_id },
      select: { full_name: true, blood_group: true, allergies: true, chronic_conditions: true, date_of_birth: true, gender: true },
    }),
    prisma.appointment.findMany({
      where: { patient_id: appt.patient_id, id: { not: appt.id }, status: "completed" },
      orderBy: { scheduled_time: "desc" },
      take: 6,
      select: { id: true, scheduled_time: true, diagnosis: true, prescription_notes: true, prescription_medicines_json: true, notes: true },
    }),
  ]);

  function parseMeds(json: string | null): { name: string; dosage?: string; frequency?: string; duration?: string }[] {
    if (!json) return [];
    try {
      const arr = JSON.parse(json);
      return Array.isArray(arr) ? arr.filter((m) => m && typeof m.name === "string") : [];
    } catch {
      return [];
    }
  }

  return {
    // C1: ids the workbench needs to create a Treatment Plan.
    patient_id: appt.patient_id,
    doctor_id: appt.doctor_id,
    patient: patient
      ? {
          full_name: patient.full_name,
          blood_group: patient.blood_group,
          allergies: patient.allergies,
          chronic_conditions: patient.chronic_conditions,
          date_of_birth: patient.date_of_birth ? patient.date_of_birth.toISOString() : null,
          gender: patient.gender,
        }
      : null,
    // "Current medicines" = what was prescribed at the most recent completed visit.
    current_medicines: visits.length ? parseMeds(visits[0].prescription_medicines_json) : [],
    past_visits: visits.map((v) => ({
      id: v.id,
      date: v.scheduled_time.toISOString(),
      title: v.diagnosis?.trim() || "Consultation",
      subtitle: v.prescription_notes?.trim() || v.notes?.trim() || "",
    })),
  };
}

/** Start seeing the patient: scheduled/waiting → in_consultation. */
export async function startConsultation(input: {
  appointmentId: string;
  clinicId: string;
  actorUserId: string;
}) {
  await requireClinicAppointment(input.appointmentId, input.clinicId);
  return transitionStatus(input.appointmentId, "in_consultation", { actorUserId: input.actorUserId });
}

/**
 * Complete the visit: saves clinical documentation, marks the appointment
 * completed (auto-drafts the invoice), then re-prices that draft to the chosen
 * treatment. Returns the invoice so the caller can collect payment next.
 */
export async function completeVisit(input: {
  appointmentId: string;
  clinicId: string;
  actorUserId: string;
  chiefComplaint?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  followUpDate?: string | null;
  prescriptionNotes?: string | null;
  prescriptionMedicinesJson?: string | null;
  testCodes?: string[] | null;
}) {
  const appointment = await requireClinicAppointment(input.appointmentId, input.clinicId);
  if (appointment.status === "completed") {
    throw new ConsultationInputError("This visit is already completed.");
  }

  // 2) Clinical documentation (only if anything was provided). Structured
  // medicines route to Prescription.medicines_json so they flow to the
  // printable prescription and the patient timeline — not just free text.
  if (
    input.chiefComplaint !== undefined ||
    input.notes !== undefined ||
    input.diagnosis !== undefined ||
    input.followUpDate !== undefined ||
    input.prescriptionNotes !== undefined ||
    input.prescriptionMedicinesJson !== undefined
  ) {
    await updateClinicalRecord(input.appointmentId, {
      chief_complaint: input.chiefComplaint ?? undefined,
      history_notes: input.notes ?? undefined,
      diagnosis: input.diagnosis ?? undefined,
      follow_up_date: input.followUpDate ?? undefined,
      prescription_notes: input.prescriptionNotes ?? undefined,
      prescription_medicines_json: input.prescriptionMedicinesJson ?? undefined,
    });
  }

  // 2b) Investigations are RECOMMENDED tests (P5) — referral records the
  // patient acts on from their Health Vault, not lab management. One row per
  // catalog test; unknown codes are ignored.
  const testCodes = (input.testCodes ?? []).map((c) => c.trim()).filter(Boolean);
  if (testCodes.length > 0) {
    await recommendTests({
      clinicId: input.clinicId,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      appointmentId: appointment.id,
      testCodes,
    });
  }

  // 3) Advance to completed. `completed` is only reachable from
  // `in_consultation`; if the owner clicked straight from the schedule we step
  // through it first (Start is implicit).
  if (appointment.status !== "in_consultation") {
    await transitionStatus(input.appointmentId, "in_consultation", { actorUserId: input.actorUserId });
  }
  // Auto-drafts the fee-based invoice in the same txn.
  await transitionStatus(input.appointmentId, "completed", { actorUserId: input.actorUserId });

  // M3A C3: 1:N link → findFirst. The completion hook has just drafted exactly
  // one consultation-fee invoice for this appointment; earliest wins for
  // determinism.
  const invoice = await prisma.invoice.findFirst({
    where: { appointment_id: input.appointmentId },
    orderBy: { created_at: "asc" },
  });
  if (!invoice) {
    // Should never happen (completion always settles/drafts one) — surfaced honestly.
    throw new ConsultationInputError("Visit completed but no invoice was drafted.");
  }

  // S1 Batch A: the legacy single-treatment re-price is gone — charges are the
  // visit's ServiceEvents, settled by the M3A engine on completion (B1).
  return { invoiceId: invoice.id, total: invoice.total, invoiceNumber: invoice.invoice_number };
}
