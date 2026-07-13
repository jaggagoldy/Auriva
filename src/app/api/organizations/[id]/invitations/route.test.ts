// BRD-043 US-103 (Sprint 1): rate-limit regression coverage for invitation
// creation — real route handler, real database, mirroring
// src/app/api/auth/login/route.test.ts's exact pattern.

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { __resetRateLimitsForTests } from "@/lib/rate-limit";
import { createTestOrganization, sessionCookieFor } from "@/test/fixtures";

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

afterAll(async () => {
  await prisma.invitation.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

function inviteRequest(orgId: string, body: unknown) {
  return {
    request: new NextRequest(`http://localhost/api/organizations/${orgId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ id: orgId }),
  };
}

describe("POST /api/organizations/[id]/invitations — rate limiting (US-103)", () => {
  it("429s the 21st invite-creation attempt from the same org within the window", async () => {
    __resetRateLimitsForTests();
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const cookie = await sessionCookieFor(owner.id, "super_admin");
    cookieStore.value = cookie.value;

    let lastResponse;
    for (let i = 0; i < 21; i++) {
      const { request, params } = inviteRequest(organization.id, {
        clinic_id: clinic.id,
        email: `bulk-${i}-${Date.now()}@test.local`,
        full_name: `Bulk Invite ${i}`,
        role: "receptionist",
      });
      lastResponse = await POST(request, { params });
    }
    expect(lastResponse!.status).toBe(429);
    expect(lastResponse!.headers.get("Retry-After")).toBeTruthy();
    cookieStore.value = undefined;
  });

  it("a legitimate single invite is unaffected", async () => {
    __resetRateLimitsForTests();
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const cookie = await sessionCookieFor(owner.id, "super_admin");
    cookieStore.value = cookie.value;

    const { request, params } = inviteRequest(organization.id, {
      clinic_id: clinic.id,
      email: `single-${Date.now()}@test.local`,
      full_name: "Single Invite",
      role: "receptionist",
    });
    const response = await POST(request, { params });
    expect(response.status).toBe(201);
    cookieStore.value = undefined;
  });
});
