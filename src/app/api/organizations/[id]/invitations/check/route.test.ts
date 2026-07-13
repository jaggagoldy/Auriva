// BRD-043 US-202 (Sprint 2): the live phone-check endpoint — real route
// handler, real database, owner-scoped (mirrors the invitations route test).

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
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

import { GET } from "./route";

const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

function checkRequest(orgId: string, phone: string) {
  return {
    request: new NextRequest(`http://localhost/api/organizations/${orgId}/invitations/check?phone=${encodeURIComponent(phone)}`),
    params: Promise.resolve({ id: orgId }),
  };
}

describe("GET /api/organizations/[id]/invitations/check", () => {
  it("returns available for an unknown phone; 401 without a session", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    // No session → unauthorized.
    cookieStore.value = undefined;
    const { request: unauthReq, params } = checkRequest(organization.id, "+15550313001");
    const unauth = await GET(unauthReq, { params });
    expect(unauth.status).toBe(401);

    // With owner session → 200 available.
    cookieStore.value = (await sessionCookieFor(owner.id, "super_admin")).value;
    const { request, params: p2 } = checkRequest(organization.id, "+15550313001");
    const res = await GET(request, { params: p2 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("available");
    cookieStore.value = undefined;
  });
});
