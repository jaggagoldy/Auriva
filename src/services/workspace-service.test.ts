// Batch A · A3 (SAD-043 §3/§5/§6 · APS-044 §13a) — workspace session spine.
// Real DB. Focus: correct selection, session persistence, and membership
// isolation (no tenant leakage on switch).

import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import {
  listWorkspacesForUser,
  switchWorkspace,
  WorkspaceAccessError,
} from "@/services/workspace-service";

// login → setSessionCookie touches next/headers; the service functions don't.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));
import { POST as login } from "@/app/api/auth/login/route";

const userIds: string[] = [];
afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }); // cascades orgs/clinics/profiles
});

async function bareSession(userId: string, role: string) {
  return prisma.session.create({
    data: {
      user_id: userId,
      role,
      token_hash: `t-${randomUUID()}`,
      expires_at: new Date(Date.now() + 3_600_000),
    },
  });
}

describe("listWorkspacesForUser", () => {
  it("returns the caller's own active membership(s)", async () => {
    const { owner, clinic } = await createTestOrganization();
    const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
    userIds.push(owner.id, user.id);

    const workspaces = await listWorkspacesForUser(user.id);
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].membershipId).toBe(staffProfile.id);
    expect(workspaces[0].clinicId).toBe(clinic.id);
    expect(workspaces[0].role).toBe("doctor");
  });
});

describe("switchWorkspace", () => {
  it("switches to the caller's own membership and persists session + last_workspace", async () => {
    const { owner, clinic } = await createTestOrganization();
    const { user, staffProfile } = await createTestStaff(clinic.id, "receptionist");
    userIds.push(owner.id, user.id);
    const session = await bareSession(user.id, "receptionist");

    const ws = await switchWorkspace({ sessionId: session.id, userId: user.id, membershipId: staffProfile.id });
    expect(ws.membershipId).toBe(staffProfile.id);

    const after = await prisma.session.findUnique({ where: { id: session.id } });
    expect(after?.active_membership_id).toBe(staffProfile.id);
    const u = await prisma.user.findUnique({ where: { id: user.id } });
    expect(u?.last_workspace_id).toBe(staffProfile.id);
  });

  it("ISOLATION: refuses a membership the caller does not hold and leaves the session unchanged", async () => {
    const a = await createTestOrganization();
    const b = await createTestOrganization();
    const staffA = await createTestStaff(a.clinic.id, "doctor");
    const staffB = await createTestStaff(b.clinic.id, "doctor");
    userIds.push(a.owner.id, b.owner.id, staffA.user.id, staffB.user.id);
    const sessionA = await bareSession(staffA.user.id, "doctor");

    // A tries to switch INTO B's membership → forbidden, no leakage.
    await expect(
      switchWorkspace({ sessionId: sessionA.id, userId: staffA.user.id, membershipId: staffB.staffProfile.id })
    ).rejects.toThrow(WorkspaceAccessError);

    const after = await prisma.session.findUnique({ where: { id: sessionA.id } });
    expect(after?.active_membership_id).toBeNull(); // untouched
  });
});

describe("login opens the session into the caller's workspace", () => {
  it("sets Session.active_membership_id to the staff member's membership", async () => {
    const { owner, clinic } = await createTestOrganization();
    const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
    userIds.push(owner.id, user.id);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "password123" }),
    });
    const res = await login(req);
    expect(res.status).toBe(200);

    const session = await prisma.session.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
    });
    expect(session?.active_membership_id).toBe(staffProfile.id);
  });
});
