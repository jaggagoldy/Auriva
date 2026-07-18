// Batch C · Milestone 2 (APS-045 §7) — landing decision tree + switch surface.

import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { resolveLanding } from "@/services/workspace-service";
import { createSession } from "@/api/session";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value ? { name, value: cookieStore.value } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));
import { POST as switchWorkspaceRoute } from "@/app/api/workspace/switch/route";

const userIds: string[] = [];
const uniq = (p: string) => `${p}-${randomUUID().slice(0, 12)}`;
afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function twoClinicDoctor() {
  const { owner, organization, clinic: clinicA } = await createTestOrganization();
  const clinicB = await prisma.clinic.create({
    data: { name: uniq("Clinic B"), address: "2 St", super_admin_id: owner.id, organization_id: organization.id },
  });
  const user = await prisma.user.create({
    data: { role: "doctor", phone_number: uniq("phone"), password_hash: await hashPassword("password123") },
  });
  const profA = await prisma.staffProfile.create({
    data: { user_id: user.id, clinic_id: clinicA.id, full_name: "Dr. Multi", specialty: "GP" },
  });
  const profB = await prisma.staffProfile.create({
    data: { user_id: user.id, clinic_id: clinicB.id, full_name: "Dr. Multi", specialty: "GP" },
  });
  userIds.push(owner.id, user.id);
  return { user, profA, profB };
}

describe("resolveLanding", () => {
  it("owner with no membership → direct to the cockpit", async () => {
    const { owner } = await createTestOrganization();
    userIds.push(owner.id);
    const l = await resolveLanding({ userId: owner.id, role: "super_admin", activeMembershipId: null });
    expect(l.mode).toBe("direct");
    if (l.mode === "direct") expect(l.surfacePath).toBe("/admin");
  });

  it("exactly one membership → direct to its surface (auto-open, no selector)", async () => {
    const { owner, clinic } = await createTestOrganization();
    userIds.push(owner.id);
    const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
    userIds.push(user.id);
    const l = await resolveLanding({ userId: user.id, role: "doctor", activeMembershipId: staffProfile.id });
    expect(l.mode).toBe("direct");
    if (l.mode === "direct") {
      expect(l.surfacePath).toBe("/doctor");
      expect(l.activeMembershipId).toBe(staffProfile.id);
    }
  });

  it("multiple memberships, nothing remembered → Selector", async () => {
    const { user } = await twoClinicDoctor();
    const l = await resolveLanding({ userId: user.id, role: "doctor", activeMembershipId: null });
    expect(l.mode).toBe("selector");
    if (l.mode === "selector") expect(l.workspaces).toHaveLength(2);
  });

  it("multiple memberships, last workspace still valid → direct to the remembered one", async () => {
    const { user, profB } = await twoClinicDoctor();
    await prisma.user.update({ where: { id: user.id }, data: { last_workspace_id: profB.id } });
    const l = await resolveLanding({ userId: user.id, role: "doctor", activeMembershipId: null });
    expect(l.mode).toBe("direct");
    if (l.mode === "direct") expect(l.activeMembershipId).toBe(profB.id);
  });

  it("multiple memberships, remembered workspace no longer valid → Selector", async () => {
    const { user } = await twoClinicDoctor();
    await prisma.user.update({ where: { id: user.id }, data: { last_workspace_id: "not-a-membership-anymore" } });
    const l = await resolveLanding({ userId: user.id, role: "doctor", activeMembershipId: null });
    expect(l.mode).toBe("selector");
  });
});

describe("POST /api/workspace/switch returns the resolved surface (session-preserving)", () => {
  it("switching returns the surface for the newly-active membership", async () => {
    const { user, profA, profB } = await twoClinicDoctor();
    const sess = await createSession(user.id, "doctor", null, profA.id);
    cookieStore.value = sess.rawToken;

    const req = new NextRequest("http://localhost/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_id: profB.id }),
    });
    const res = await switchWorkspaceRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.workspace.membershipId).toBe(profB.id);
    expect(body.surfacePath).toBe("/doctor");

    cookieStore.value = undefined;
  });
});
