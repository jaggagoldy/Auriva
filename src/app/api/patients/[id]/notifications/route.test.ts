// TEST-5 (Release 1.2 Sprint 1): PAT-1 notification API permission-boundary
// coverage — real route handler, real database, only next/headers mocked
// (cookies() throws outside a real request scope), mirroring the invoices
// route test's exact pattern (DATA-3 hide-existence convention).

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { createTestPatient, sessionCookieFor } from "@/test/fixtures";
import { createNotificationOnce } from "@/services/notification-service";

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

import { GET } from "./route";
import { PATCH } from "./[notificationId]/route";

const createdUserIds: string[] = [];
const createdPatientProfileIds: string[] = [];

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { patient_profile_id: { in: createdPatientProfileIds } } });
  await prisma.patientProfile.deleteMany({ where: { id: { in: createdPatientProfileIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

function listRequest(id: string) {
  return {
    request: new NextRequest(`http://localhost/api/patients/${id}/notifications`),
    params: Promise.resolve({ id }),
  };
}

function patchRequest(id: string, notificationId: string) {
  return {
    request: new NextRequest(`http://localhost/api/patients/${id}/notifications/${notificationId}`, {
      method: "PATCH",
    }),
    params: Promise.resolve({ id, notificationId }),
  };
}

describe("GET /api/patients/[id]/notifications — ownership standardization", () => {
  it("returns 404 (not 403) when a patient requests another patient's notifications", async () => {
    const own = await createTestPatient();
    const other = await createTestPatient();
    createdUserIds.push(own.user.id, other.user.id);
    createdPatientProfileIds.push(own.profile.id, other.profile.id);

    const cookie = await sessionCookieFor(own.user.id, "patient", own.profile.id);
    cookieStore.value = cookie.value;

    const { request, params } = listRequest(other.profile.id);
    const response = await GET(request, { params });
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Not Found");
  });

  it("allows a patient to fetch their own notifications with an unread count", async () => {
    const patient = await createTestPatient();
    createdUserIds.push(patient.user.id);
    createdPatientProfileIds.push(patient.profile.id);

    await createNotificationOnce({
      sourceEventId: randomUUID(),
      patientProfileId: patient.profile.id,
      type: "appointment_booked",
      title: "Appointment confirmed",
      message: "Test message",
    });

    const cookie = await sessionCookieFor(patient.user.id, "patient", patient.profile.id);
    cookieStore.value = cookie.value;

    const { request, params } = listRequest(patient.profile.id);
    const response = await GET(request, { params });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.notifications).toHaveLength(1);
    expect(json.unreadCount).toBe(1);
  });
});

describe("PATCH /api/patients/[id]/notifications/[notificationId] — ownership standardization", () => {
  it("returns 404 when a patient tries to mark another patient's notification read", async () => {
    const owner = await createTestPatient();
    const attacker = await createTestPatient();
    createdUserIds.push(owner.user.id, attacker.user.id);
    createdPatientProfileIds.push(owner.profile.id, attacker.profile.id);

    await createNotificationOnce({
      sourceEventId: randomUUID(),
      patientProfileId: owner.profile.id,
      type: "appointment_booked",
      title: "Appointment confirmed",
      message: "Test message",
    });
    const [notification] = await prisma.notification.findMany({
      where: { patient_profile_id: owner.profile.id },
    });

    const cookie = await sessionCookieFor(attacker.user.id, "patient", attacker.profile.id);
    cookieStore.value = cookie.value;

    const { request, params } = patchRequest(attacker.profile.id, notification.id);
    const response = await PATCH(request, { params });
    expect(response.status).toBe(404);
  });

  it("allows a patient to mark their own notification read", async () => {
    const patient = await createTestPatient();
    createdUserIds.push(patient.user.id);
    createdPatientProfileIds.push(patient.profile.id);

    await createNotificationOnce({
      sourceEventId: randomUUID(),
      patientProfileId: patient.profile.id,
      type: "appointment_booked",
      title: "Appointment confirmed",
      message: "Test message",
    });
    const [notification] = await prisma.notification.findMany({
      where: { patient_profile_id: patient.profile.id },
    });

    const cookie = await sessionCookieFor(patient.user.id, "patient", patient.profile.id);
    cookieStore.value = cookie.value;

    const { request, params } = patchRequest(patient.profile.id, notification.id);
    const response = await PATCH(request, { params });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.read_at).not.toBeNull();
  });
});
