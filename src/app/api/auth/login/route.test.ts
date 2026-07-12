// TEST-3: authentication + audit-generation + standardized-error regression
// coverage for the B2B login route — real route handler, real database,
// only next/headers mocked (cookies() throws outside a real request scope).

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { __resetRateLimitsForTests } from "@/lib/rate-limit";
import { createTestOrganization } from "@/test/fixtures";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

import { POST } from "./route";

function loginRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

beforeEach(() => {
  __resetRateLimitsForTests();
});

describe("POST /api/auth/login", () => {
  it("rejects a wrong password with a standardized 401 envelope", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    const response = await POST(loginRequest({ email: owner.email, password: "wrong-password" }));
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: "Unauthorized", message: "Invalid email or password." });
  });

  it("rejects a missing field with a standardized 400 envelope", async () => {
    const response = await POST(loginRequest({ email: "someone@test.local" }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Bad Request");
  });

  it("logs in successfully, creates a session, and records a login audit entry", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    const response = await POST(loginRequest({ email: owner.email, password: "password123" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.user.id).toBe(owner.id);

    const session = await prisma.session.findFirst({ where: { user_id: owner.id } });
    expect(session).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { actor_user_id: owner.id, action: "user_login" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.organization_id).toBe(organization.id);
  });

  it("logs in a mobile-first owner by phone number (no email)", async () => {
    // Quick Setup owners have a phone_number as their username and no email.
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    const response = await POST(loginRequest({ phone: owner.phone_number, password: "password123" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.user.id).toBe(owner.id);
  });

  it("rejects a wrong password on the phone path with a phone-worded 401", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    const response = await POST(loginRequest({ phone: owner.phone_number, password: "nope" }));
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toEqual({ error: "Unauthorized", message: "Invalid phone number or password." });
  });

  it("blocks a deactivated account even with the correct password", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);
    await prisma.user.update({ where: { id: owner.id }, data: { is_active: false } });

    const response = await POST(loginRequest({ email: owner.email, password: "password123" }));
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Forbidden");
    // No session is opened for a blocked account.
    const session = await prisma.session.findFirst({ where: { user_id: owner.id } });
    expect(session).toBeNull();
  });

  it("rate-limits repeated failed attempts against the same account", async () => {
    const { owner, organization } = await createTestOrganization();
    createdUserIds.push(owner.id);
    createdOrgIds.push(organization.id);

    let lastResponse;
    for (let i = 0; i < 6; i++) {
      lastResponse = await POST(loginRequest({ email: owner.email, password: "wrong" }));
    }
    expect(lastResponse!.status).toBe(429);
    expect(lastResponse!.headers.get("Retry-After")).toBeTruthy();
  });
});
