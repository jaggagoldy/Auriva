// TEST-5 (Release 1.2 Sprint 1): PAT-2 review write-side regression
// coverage — success, duplicate rejection, not-completed rejection,
// cross-patient ownership rejection, and rating validation.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { scheduleAppointment, transitionStatus } from "@/services/appointment-service";
import {
  AppointmentNotCompletedError,
  createReview,
  DuplicateReviewError,
  ReviewAppointmentNotFoundError,
  ReviewInputError,
} from "@/services/review-service";

const createdOrgIds: string[] = [];
const createdClinicIds: string[] = [];
const createdUserIds: string[] = [];
const createdPatientProfileIds: string[] = [];

afterAll(async () => {
  await prisma.review.deleteMany({ where: { patient_id: { in: createdPatientProfileIds } } });
  await prisma.notification.deleteMany({ where: { patient_profile_id: { in: createdPatientProfileIds } } });
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: createdClinicIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.patientProfile.deleteMany({ where: { id: { in: createdPatientProfileIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

async function completedAppointment() {
  const { organization, clinic } = await createTestOrganization();
  createdOrgIds.push(organization.id);
  createdClinicIds.push(clinic.id);
  const { user: doctorUser, staffProfile: doctor } = await createTestStaff(clinic.id, "doctor");
  const { user: patientUser, profile: patient } = await createTestPatient(clinic.id);
  createdUserIds.push(doctorUser.id, patientUser.id);
  createdPatientProfileIds.push(patient.id);

  const appointment = await scheduleAppointment({
    patientId: patient.id,
    doctorId: doctor.id,
    clinicId: clinic.id,
    scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  await transitionStatus(appointment.id, "in_consultation");
  await transitionStatus(appointment.id, "completed");

  return { organization, clinic, doctor, patient, appointment };
}

describe("createReview", () => {
  it("creates a review for a completed appointment the patient owns", async () => {
    const { patient, appointment, organization } = await completedAppointment();
    const { review, organizationId } = await createReview({
      appointmentId: appointment.id,
      patientProfileId: patient.id,
      rating: 5,
      comment: "Great visit",
    });
    expect(review.rating).toBe(5);
    expect(review.appointment_id).toBe(appointment.id);
    expect(organizationId).toBe(organization.id);
  });

  it("rejects a second review for the same appointment", async () => {
    const { patient, appointment } = await completedAppointment();
    await createReview({ appointmentId: appointment.id, patientProfileId: patient.id, rating: 4 });
    await expect(
      createReview({ appointmentId: appointment.id, patientProfileId: patient.id, rating: 2 })
    ).rejects.toThrow(DuplicateReviewError);
  });

  it("rejects a review for an appointment that isn't completed", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    createdClinicIds.push(clinic.id);
    const { user: doctorUser, staffProfile: doctor } = await createTestStaff(clinic.id, "doctor");
    const { user: patientUser, profile: patient } = await createTestPatient(clinic.id);
    createdUserIds.push(doctorUser.id, patientUser.id);
    createdPatientProfileIds.push(patient.id);

    const appointment = await scheduleAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    await expect(
      createReview({ appointmentId: appointment.id, patientProfileId: patient.id, rating: 5 })
    ).rejects.toThrow(AppointmentNotCompletedError);
  });

  it("rejects a review submitted against another patient's appointment", async () => {
    const { appointment } = await completedAppointment();
    const { user: otherUser, profile: otherPatient } = await createTestPatient();
    createdUserIds.push(otherUser.id);
    createdPatientProfileIds.push(otherPatient.id);

    await expect(
      createReview({ appointmentId: appointment.id, patientProfileId: otherPatient.id, rating: 5 })
    ).rejects.toThrow(ReviewAppointmentNotFoundError);
  });

  it("rejects an out-of-range or non-integer rating", async () => {
    const { patient, appointment } = await completedAppointment();
    await expect(
      createReview({ appointmentId: appointment.id, patientProfileId: patient.id, rating: 0 })
    ).rejects.toThrow(ReviewInputError);

    const { patient: patient2, appointment: appointment2 } = await completedAppointment();
    await expect(
      createReview({ appointmentId: appointment2.id, patientProfileId: patient2.id, rating: 3.5 })
    ).rejects.toThrow(ReviewInputError);
  });

  it("generates a review-prompt notification when the appointment completes", async () => {
    const { patient } = await completedAppointment();
    const start = Date.now();
    let notification = null;
    while (Date.now() - start < 3000 && !notification) {
      notification = await prisma.notification.findFirst({
        where: { patient_profile_id: patient.id, type: "review_prompt" },
      });
      if (!notification) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(notification).not.toBeNull();
  });
});
