// Milestone 1 (First Clinic Ready), Batch 5 — the solo visit flow. Real DB:
// start → complete (clinical + treatment-priced invoice) → collect payment.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff, createTestPatient } from "@/test/fixtures";
import { createService } from "@/services/service-catalog-service";
import { scheduleAppointment } from "@/services/appointment-service";
import {
  startConsultation,
  completeVisit,
  collectVisitPayment,
  ConsultationInputError,
} from "@/services/consultation-service";

const orgIds: string[] = [];
const userIds: string[] = [];
const clinicIds: string[] = [];

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.invoice.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.prescription.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.labOrder.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.service.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.patientProfile.deleteMany({ where: { registered_by_clinic_id: { in: clinicIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function setupVisit() {
  const { owner, organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  const { profile } = await createTestPatient(clinic.id);
  orgIds.push(organization.id);
  clinicIds.push(clinic.id);
  userIds.push(owner.id, user.id);

  const appointment = await scheduleAppointment({
    patientId: profile.id,
    doctorId: staffProfile.id,
    clinicId: clinic.id,
    scheduledTime: new Date(Date.now() + 3600_000).toISOString(),
  });
  return { owner, clinic, staffProfile, patient: profile, appointment };
}

describe("solo visit flow", () => {
  it("starts, completes with a treatment price, and collects full payment", async () => {
    const { owner, clinic, appointment } = await setupVisit();
    const treatment = await createService(clinic.id, { name: "Follow-up session", durationMinutes: 30, price: 800 });

    const started = await startConsultation({
      appointmentId: appointment.id, clinicId: clinic.id, actorUserId: owner.id,
    });
    expect(started.status).toBe("in_consultation");

    const completed = await completeVisit({
      appointmentId: appointment.id, clinicId: clinic.id, actorUserId: owner.id,
      notes: "ROM improving.", diagnosis: "Mechanical LBP", treatmentId: treatment.id,
    });
    // Invoice is priced from the treatment, not the generic consult fee.
    expect(completed.total).toBe(800);

    const appt = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    expect(appt?.status).toBe("completed");
    expect(appt?.history_notes).toBe("ROM improving.");

    const paid = await collectVisitPayment({
      invoiceId: completed.invoiceId, clinicId: clinic.id, amount: 800, method: "cash", actorUserId: owner.id,
    });
    expect(paid.status).toBe("paid");

    const payments = await prisma.payment.findMany({ where: { invoice_id: completed.invoiceId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(800);
  });

  it("persists structured medicines + chief complaint to the Prescription store", async () => {
    const { owner, clinic, appointment, patient } = await setupVisit();
    const medicines = [
      { name: "Amoxicillin 500mg", dosage: "1 tab", frequency: "1-0-1", duration: "5 days" },
      { name: "Ibuprofen 400mg", dosage: "1 tab", frequency: "SOS", duration: "3 days" },
    ];

    await completeVisit({
      appointmentId: appointment.id,
      clinicId: clinic.id,
      actorUserId: owner.id,
      chiefComplaint: "Lower back pain, 3 days",
      notes: "ROM reduced.",
      diagnosis: "Mechanical LBP",
      prescriptionNotes: "Rest and warm compress.",
      prescriptionMedicinesJson: JSON.stringify(medicines),
      followUpDate: "2026-07-20",
    });

    // Chief complaint lands on the encounter (appointment) column.
    const appt = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    expect(appt?.chief_complaint).toBe("Lower back pain, 3 days");

    // Structured medicines reach Prescription.medicines_json — the shape the
    // printable prescription and the patient timeline read from.
    const rx = await prisma.prescription.findUnique({ where: { appointment_id: appointment.id } });
    expect(rx).not.toBeNull();
    expect(rx?.patient_id).toBe(patient.id);
    expect(JSON.parse(rx!.medicines_json)).toEqual(medicines);
    expect(rx?.notes).toBe("Rest and warm compress.");
    expect(rx?.follow_up_date?.toISOString().slice(0, 10)).toBe("2026-07-20");
  });

  it("turns investigations into a real LabOrder for the visit", async () => {
    const { owner, clinic, appointment, patient } = await setupVisit();

    await completeVisit({
      appointmentId: appointment.id,
      clinicId: clinic.id,
      actorUserId: owner.id,
      diagnosis: "R/O anemia",
      investigations: ["CBC", "  ", "Vitamin D"], // blank test is dropped
    });

    const orders = await prisma.labOrder.findMany({ where: { appointment_id: appointment.id } });
    expect(orders).toHaveLength(1);
    expect(orders[0].patient_id).toBe(patient.id);
    expect(orders[0].status).toBe("ordered");
    expect(JSON.parse(orders[0].tests_json)).toEqual([{ name: "CBC" }, { name: "Vitamin D" }]);
    expect(orders[0].clinical_note).toBe("R/O anemia");
  });

  it("creates no LabOrder when no investigations are ordered", async () => {
    const { owner, clinic, appointment } = await setupVisit();
    await completeVisit({ appointmentId: appointment.id, clinicId: clinic.id, actorUserId: owner.id, diagnosis: "Well" });
    const orders = await prisma.labOrder.findMany({ where: { appointment_id: appointment.id } });
    expect(orders).toHaveLength(0);
  });

  it("keeps the fee-based invoice when no treatment is chosen", async () => {
    const { owner, clinic, appointment } = await setupVisit();
    const completed = await completeVisit({
      appointmentId: appointment.id, clinicId: clinic.id, actorUserId: owner.id,
    });
    // A generic invoice still exists (auto-drafted) with a positive total.
    expect(completed.total).toBeGreaterThan(0);
    expect(completed.invoiceId).toBeTruthy();
  });

  it("rejects a treatment from another clinic", async () => {
    const { owner, clinic, appointment } = await setupVisit();
    const other = await createTestOrganization();
    orgIds.push(other.organization.id);
    clinicIds.push(other.clinic.id);
    const foreign = await createService(other.clinic.id, { name: "X", durationMinutes: 30, price: 500 });

    await expect(
      completeVisit({
        appointmentId: appointment.id, clinicId: clinic.id, actorUserId: owner.id, treatmentId: foreign.id,
      })
    ).rejects.toThrow(ConsultationInputError);
  });

  it("cannot start a consultation for an appointment in another clinic", async () => {
    const { owner, appointment } = await setupVisit();
    const other = await createTestOrganization();
    orgIds.push(other.organization.id);
    clinicIds.push(other.clinic.id);

    await expect(
      startConsultation({ appointmentId: appointment.id, clinicId: other.clinic.id, actorUserId: owner.id })
    ).rejects.toThrow(); // AppointmentNotFoundError (hide-existence)
  });

  it("rejects overpayment beyond the invoice total", async () => {
    const { owner, clinic, appointment } = await setupVisit();
    const treatment = await createService(clinic.id, { name: "Consult", durationMinutes: 30, price: 500 });
    const completed = await completeVisit({
      appointmentId: appointment.id, clinicId: clinic.id, actorUserId: owner.id, treatmentId: treatment.id,
    });
    await expect(
      collectVisitPayment({ invoiceId: completed.invoiceId, clinicId: clinic.id, amount: 999, method: "cash", actorUserId: owner.id })
    ).rejects.toThrow();
  });
});
