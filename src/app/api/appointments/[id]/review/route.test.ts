// TEST-5 (Release 1.2 Sprint 1): PAT-2 review API route coverage — real
// route handler, real database, only next/headers mocked (cookies() throws
// outside a real request scope), mirroring the invoices route test.

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff, sessionCookieFor } from "@/test/fixtures";
import { scheduleAppointment, transitionStatus } from "@/services/appointment-service";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value
        ? { name, value: cookieStore.value }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

import { POST } from "./route";

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

function reviewRequest(appointmentId: string, body: unknown) {
  return {
    request: new NextRequest(`http://localhost/api/appointments/${appointmentId}/review`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ id: appointmentId }),
  };
}

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

  return { patientUser, patient, appointment };
}

describe("POST /api/appointments/[id]/review", () => {
  it("allows a patient to submit a review for their own completed appointment", async () => {
    const { patientUser, patient, appointment } = await completedAppointment();
    const cookie = await sessionCookieFor(patientUser.id, "patient", patient.id);
    cookieStore.value = cookie.value;

    const { request, params } = reviewRequest(appointment.id, { rating: 5, comment: "Great" });
    const response = await POST(request, { params });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.rating).toBe(5);
  });

  it("returns 404 when a patient reviews another patient's appointment", async () => {
    const { appointment } = await completedAppointment();
    const { user: otherUser, profile: otherPatient } = await createTestPatient();
    createdUserIds.push(otherUser.id);
    createdPatientProfileIds.push(otherPatient.id);

    const cookie = await sessionCookieFor(otherUser.id, "patient", otherPatient.id);
    cookieStore.value = cookie.value;

    const { request, params } = reviewRequest(appointment.id, { rating: 5 });
    const response = await POST(request, { params });
    expect(response.status).toBe(404);
  });

  it("returns 409 on a duplicate review for the same appointment", async () => {
    const { patientUser, patient, appointment } = await completedAppointment();
    const cookie = await sessionCookieFor(patientUser.id, "patient", patient.id);
    cookieStore.value = cookie.value;

    const first = reviewRequest(appointment.id, { rating: 4 });
    await POST(first.request, { params: first.params });

    const second = reviewRequest(appointment.id, { rating: 2 });
    const response = await POST(second.request, { params: second.params });
    expect(response.status).toBe(409);
  });

  it("returns 400 when rating is missing", async () => {
    const { patientUser, patient, appointment } = await completedAppointment();
    const cookie = await sessionCookieFor(patientUser.id, "patient", patient.id);
    cookieStore.value = cookie.value;

    const { request, params } = reviewRequest(appointment.id, {});
    const response = await POST(request, { params });
    expect(response.status).toBe(400);
  });
});
