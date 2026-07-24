// BRD-043 US-103 (Sprint 1): rate-limit regression coverage for invitation
// acceptance — real route handler, real database, public/unauthenticated
// endpoint (no next/headers mocking needed for the request itself; a
// session is opened on success, which needs the same next/headers mock as
// the login route test).

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { __resetRateLimitsForTests } from "@/lib/rate-limit";
import { createTestOrganization } from "@/test/fixtures";
import { createInvitation } from "@/services/onboarding-service";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

import { POST } from "./route";

const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.invitation.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

function acceptRequest(token: string, body: unknown) {
  return {
    request: new NextRequest(`http://localhost/api/invitations/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ token }),
  };
}

describe("POST /api/invitations/[token]/accept — rate limiting (US-103)", () => {
  it("429s the 6th accept attempt against the same token within the window", async () => {
    __resetRateLimitsForTests();
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `rl-${Date.now()}@test.local`,
      fullName: "Rate Limited Invitee",
      role: "receptionist",
    });

    let lastResponse;
    for (let i = 0; i < 6; i++) {
      const { request, params } = acceptRequest(invitation.token, { password: "wrong-on-purpose" });
      lastResponse = await POST(request, { params });
    }
    expect(lastResponse!.status).toBe(429);
    expect(lastResponse!.headers.get("Retry-After")).toBeTruthy();
  });

  it("a legitimate single acceptance is unaffected", async () => {
    __resetRateLimitsForTests();
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `ok-${Date.now()}@test.local`,
      fullName: "Fine Invitee",
      role: "receptionist",
    });

    const { request, params } = acceptRequest(invitation.token, { password: "password123" });
    const response = await POST(request, { params });
    expect(response.status).toBe(201);
    const body = await response.json();
    createdUserIds.push(body.user.id);
  });
});
