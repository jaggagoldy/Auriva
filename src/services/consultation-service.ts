// Milestone 1 (First Clinic Ready), Batch 5 — the solo visit: Today →
// Consultation → Payment, entirely inside the clinic workspace. This service
// ORCHESTRATES existing primitives; it invents no new status machine or ledger:
//   - transitionStatus (appointment-service) owns every status change,
//   - updateClinicalRecord (appointment-service) saves the notes/diagnosis/follow-up,
//   - transitionStatus already auto-drafts the visit invoice on completion,
//   - setDraftInvoiceItems (billing-service) re-prices that draft to the chosen
//     Treatment, and recordPayment (billing-service) collects the money.
// The one solo-specific rule: the visit's charge is the chosen Treatment's
// price, not the generic consultation fee.

import prisma from "@/lib/prisma";
import {
  transitionStatus,
  updateClinicalRecord,
  AppointmentNotFoundError,
} from "@/services/appointment-service";
import { setDraftInvoiceItems, recordPayment } from "@/services/billing-service";
import type { InvoiceItem, PaymentMethod } from "@/domain/invoice-status";

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
  treatmentId?: string | null;
}) {
  const appointment = await requireClinicAppointment(input.appointmentId, input.clinicId);
  if (appointment.status === "completed") {
    throw new ConsultationInputError("This visit is already completed.");
  }

  // 1) Validate the chosen treatment BEFORE completing, so a bad id never
  // leaves a completed-but-mispriced visit behind.
  let service = null;
  if (input.treatmentId) {
    service = await prisma.service.findFirst({
      where: { id: input.treatmentId, clinic_id: input.clinicId, is_active: true },
    });
    if (!service) throw new ConsultationInputError("That treatment isn't available in this clinic.");
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

  // 3) Advance to completed. `completed` is only reachable from
  // `in_consultation`; if the owner clicked straight from the schedule we step
  // through it first (Start is implicit).
  if (appointment.status !== "in_consultation") {
    await transitionStatus(input.appointmentId, "in_consultation", { actorUserId: input.actorUserId });
  }
  // Auto-drafts the fee-based invoice in the same txn.
  await transitionStatus(input.appointmentId, "completed", { actorUserId: input.actorUserId });

  const invoice = await prisma.invoice.findUnique({
    where: { appointment_id: input.appointmentId },
  });
  if (!invoice) {
    // Should never happen (completion always drafts one) — surfaced honestly.
    throw new ConsultationInputError("Visit completed but no invoice was drafted.");
  }

  // 4) Re-price to the chosen treatment (solo-specific rule). If no treatment
  // was chosen, keep the auto-drafted consultation-fee line as-is.
  if (service) {
    const items: InvoiceItem[] = [
      { description: service.name, qty: 1, unit_price: service.price, amount: service.price },
    ];
    const repriced = await setDraftInvoiceItems(invoice.id, input.clinicId, items);
    return { invoiceId: repriced.id, total: repriced.total, invoiceNumber: repriced.invoice_number };
  }

  return { invoiceId: invoice.id, total: invoice.total, invoiceNumber: invoice.invoice_number };
}

/** Collect the payment for a visit's invoice — thin wrapper over recordPayment. */
export async function collectVisitPayment(input: {
  invoiceId: string;
  clinicId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  actorUserId: string;
}) {
  return recordPayment({
    invoiceId: input.invoiceId,
    clinicId: input.clinicId,
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? null,
    receivedByUserId: input.actorUserId,
  });
}
