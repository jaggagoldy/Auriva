// TEST-4: invalid-ownership regression coverage (DATA-3) — real route
// handler, real database, only next/headers mocked (cookies() throws
// outside a real request scope).

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTestPatient, sessionCookieFor } from "@/test/fixtures";

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

const createdUserIds: string[] = [];

afterAll(async () => {
  await prisma.patientProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

function invoicesRequest(id: string) {
  return {
    request: new NextRequest(`http://localhost/api/patients/${id}/invoices`),
    params: Promise.resolve({ id }),
  };
}

describe("GET /api/patients/[id]/invoices — ownership standardization", () => {
  it("returns 404 (not 403) when a patient requests another patient's invoices", async () => {
    const own = await createTestPatient();
    const other = await createTestPatient();
    createdUserIds.push(own.user.id, other.user.id);

    const cookie = await sessionCookieFor(own.user.id, "patient", own.profile.id);
    cookieStore.value = cookie.value;

    const { request, params } = invoicesRequest(other.profile.id);
    const response = await GET(request, { params });
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe("Not Found");
  });

  it("allows a patient to fetch their own invoices", async () => {
    const patient = await createTestPatient();
    createdUserIds.push(patient.user.id);

    const cookie = await sessionCookieFor(patient.user.id, "patient", patient.profile.id);
    cookieStore.value = cookie.value;

    const { request, params } = invoicesRequest(patient.profile.id);
    const response = await GET(request, { params });
    expect(response.status).toBe(200);
  });
});
