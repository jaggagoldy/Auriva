// BRD-043 US-505 (Sprint 5): the admin plan-toggle must be unreachable by a
// clinic Owner session — only an is_platform_admin account may change a plan.

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTestOrganization, sessionCookieFor } from "@/test/fixtures";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "auriva_staff_session" && cookieStore.value ? { name, value: cookieStore.value } : undefined),
    set: () => {},
    delete: () => {},
  }),
}));

import { PATCH } from "./route";

const createdOrgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

function req(orgId: string, plan: string) {
  return new NextRequest("http://localhost/api/admin/plan", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: orgId, plan }),
  });
}

describe("PATCH /api/admin/plan — access control (US-505)", () => {
  it("a clinic Owner (super_admin) session is FORBIDDEN", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    cookieStore.value = (await sessionCookieFor(owner.id, "super_admin")).value;

    const res = await PATCH(req(organization.id, "professional"));
    expect(res.status).toBe(403);
    // plan unchanged
    expect((await prisma.organization.findUnique({ where: { id: organization.id } }))?.plan).toBe("solo");
    cookieStore.value = undefined;
  });

  it("an is_platform_admin session CAN change the plan", async () => {
    const { organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const admin = await prisma.user.create({
      data: { role: "super_admin", phone_number: "+15550350001", is_platform_admin: true },
    });
    userIds.push(admin.id);
    cookieStore.value = (await sessionCookieFor(admin.id, "super_admin")).value;

    const res = await PATCH(req(organization.id, "professional"));
    expect(res.status).toBe(200);
    expect((await prisma.organization.findUnique({ where: { id: organization.id } }))?.plan).toBe("professional");
    cookieStore.value = undefined;
  });
});
