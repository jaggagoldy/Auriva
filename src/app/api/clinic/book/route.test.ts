// BRD-043 US-104 (P0, Sprint 1): the highest-stakes of the 5 doctor-
// resolution call sites — a real booking must never be silently attributed
// to the wrong doctor. Real route handler, real database.

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff, sessionCookieFor } from "@/test/fixtures";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value ? { name, value: cookieStore.value } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

import { POST } from "./route";

const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];

afterAll(async () => {
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  // Clinic -> Appointment/PatientProfile-link etc. cascade on delete.
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

function bookRequest(body: unknown) {
  return new NextRequest("http://localhost/api/clinic/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/clinic/book — never guess the doctor (US-104)", () => {
  it("409s instead of silently booking onto an arbitrary doctor when the clinic has 2+ doctors", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctorA } = await createTestStaff(clinic.id, "doctor");
    const { user: doctorB } = await createTestStaff(clinic.id, "doctor");
    const { user: receptionist } = await createTestStaff(clinic.id, "receptionist");
    createdUserIds.push(doctorA.id, doctorB.id, receptionist.id);
    const cookie = await sessionCookieFor(receptionist.id, "receptionist");
    cookieStore.value = cookie.value;

    const response = await POST(
      bookRequest({
        patient_name: "Test Patient",
        patient_phone: "9999999999",
        scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    );
    expect(response.status).toBe(409);
    cookieStore.value = undefined;
  });

  it("books correctly onto the clinic's one doctor when unambiguous", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor } = await createTestStaff(clinic.id, "doctor");
    const { user: receptionist } = await createTestStaff(clinic.id, "receptionist");
    createdUserIds.push(doctor.id, receptionist.id);
    const cookie = await sessionCookieFor(receptionist.id, "receptionist");
    cookieStore.value = cookie.value;

    const response = await POST(
      bookRequest({
        patient_name: "Test Patient",
        patient_phone: "8888888888",
        scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    );
    expect(response.status).toBe(201);
    cookieStore.value = undefined;
  });
});
