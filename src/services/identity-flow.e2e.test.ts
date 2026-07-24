// Batch C · Milestone 3 — the Identity & Workspace flow, end to end:
//   provision → sign in with the temp password → forced change → workspace →
//   correct surface. Real DB + the real login route.

import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import { provisionStaff } from "@/services/onboarding-service";
import { changePassword } from "@/services/credential-service";
import { resolveLanding } from "@/services/workspace-service";
import { createSession, requireStaffContext } from "@/api/session";
import { canAccessReception } from "@/domain/authorization";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value ? { name, value: cookieStore.value } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));
import { POST as login } from "@/app/api/auth/login/route";

const ownerIds: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
  await prisma.user.deleteMany({ where: { phone_number: { startsWith: "+9177" } } });
});

describe("Identity & Workspace — full onboarding journey", () => {
  it("provision → temp login (forced change) → blocked → change → resolve → correct surface", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    ownerIds.push(owner.id);

    // 1) Owner provisions a receptionist (temp password, must_change_password).
    const phone = `+9177${Date.now().toString().slice(-8)}`;
    const provisioned = await provisionStaff({
      organizationId: organization.id,
      clinicId: clinic.id,
      fullName: "Meera Nair",
      phone,
      role: "receptionist",
      actorUserId: owner.id,
    });

    // 2) Staff signs in with the TEMPORARY password → login succeeds and 3)
    //    signals a forced password change to the client.
    const res = await login(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password: provisioned.temporaryPassword }),
      })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).user.must_change_password).toBe(true);

    const membership = await prisma.staffProfile.findFirst({ where: { user_id: provisioned.user.id } });
    const sess = await createSession(provisioned.user.id, "receptionist", null, membership!.id);
    cookieStore.value = sess.rawToken;

    // 3b) Every workspace is blocked until the password is changed.
    const blocked = await requireStaffContext(canAccessReception);
    expect(blocked.ok).toBe(false);

    // 4) Member sets their own password (mandatory reset skips the current one).
    await changePassword({ userId: provisioned.user.id, newPassword: "my-own-password" });

    // 5) Workspace resolves → 6) the correct surface for a receptionist.
    const allowed = await requireStaffContext(canAccessReception);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.clinicId).toBe(clinic.id);

    const landing = await resolveLanding({
      userId: provisioned.user.id,
      role: "receptionist",
      activeMembershipId: membership!.id,
    });
    expect(landing.mode).toBe("direct");
    if (landing.mode === "direct") expect(landing.surfacePath).toBe("/staff");

    cookieStore.value = undefined;
  });
});
