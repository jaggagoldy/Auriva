// Batch A (APS-044 §9 / SAD-043 §11) — the mandatory-password-change flow.
// Real DB (integration), same convention as the rest of the suite.

import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createTestOrganization, createTestStaff, sessionCookieFor } from "@/test/fixtures";
import { changePassword, PasswordChangeError, MIN_PASSWORD_LENGTH } from "@/services/credential-service";
import { requireStaffContext } from "@/api/session";
import { canAccessReception } from "@/domain/authorization";

// requireStaffContext reads the session cookie via next/headers — the same mock
// pattern the other route tests use. changePassword takes a userId directly and
// ignores cookies, so this mock is inert for the service-only cases.
const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value ? { name, value: cookieStore.value } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

const userIds: string[] = [];
async function makeUser(data: Parameters<typeof prisma.user.create>[0]["data"]) {
  const u = await prisma.user.create({ data });
  userIds.push(u.id);
  return u;
}

afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }); // cascades staff profiles / owned orgs
});

describe("changePassword — mandatory reset (provisioned account)", () => {
  it("succeeds without the current password, clears the flag, stamps password_set_at, and the new password verifies", async () => {
    const user = await makeUser({
      role: "receptionist",
      phone_number: `pw-mand-${Date.now()}`,
      password_hash: await hashPassword("temp-pass-123"),
      must_change_password: true,
    });

    await changePassword({ userId: user.id, newPassword: "brand-new-pass" });

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.must_change_password).toBe(false);
    expect(after?.password_set_at).not.toBeNull();
    expect(await verifyPassword("brand-new-pass", after?.password_hash)).toBe(true);
    expect(await verifyPassword("temp-pass-123", after?.password_hash)).toBe(false);
  });
});

describe("changePassword — voluntary change (no reset pending)", () => {
  it("rejects a wrong current password and accepts the correct one", async () => {
    const user = await makeUser({
      role: "doctor",
      phone_number: `pw-vol-${Date.now()}`,
      password_hash: await hashPassword("current-pass-9"),
      must_change_password: false,
    });

    await expect(
      changePassword({ userId: user.id, currentPassword: "wrong-one", newPassword: "next-pass-9" })
    ).rejects.toThrow(PasswordChangeError);

    await changePassword({ userId: user.id, currentPassword: "current-pass-9", newPassword: "next-pass-9" });
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await verifyPassword("next-pass-9", after?.password_hash)).toBe(true);
  });
});

describe("changePassword — validation", () => {
  it(`rejects a password shorter than ${MIN_PASSWORD_LENGTH} characters`, async () => {
    const user = await makeUser({
      role: "receptionist",
      phone_number: `pw-short-${Date.now()}`,
      password_hash: await hashPassword("temp-pass-123"),
      must_change_password: true,
    });
    await expect(changePassword({ userId: user.id, newPassword: "short" })).rejects.toThrow(PasswordChangeError);
  });

  it("rejects a patient (OTP-only, no password)", async () => {
    const user = await makeUser({ role: "patient", phone_number: `pw-pat-${Date.now()}` });
    await expect(changePassword({ userId: user.id, newPassword: "some-long-pass" })).rejects.toThrow(
      PasswordChangeError
    );
  });
});

describe("requireStaffContext — blocks a workspace until the password is changed", () => {
  it("denies a provisioned staff member (must_change_password), then allows after changePassword", async () => {
    const { owner, clinic } = await createTestOrganization();
    userIds.push(owner.id); // cascades the org + clinic on cleanup
    const { user } = await createTestStaff(clinic.id, "receptionist");
    userIds.push(user.id);
    // Simulate managed provisioning: a temp password + mandatory reset pending.
    await prisma.user.update({ where: { id: user.id }, data: { must_change_password: true } });

    cookieStore.value = (await sessionCookieFor(user.id, "receptionist")).value;

    const blocked = await requireStaffContext(canAccessReception);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.response.status).toBe(403);

    await changePassword({ userId: user.id, newPassword: "chosen-pass-1" });

    const allowed = await requireStaffContext(canAccessReception);
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.clinicId).toBe(clinic.id);

    cookieStore.value = undefined;
  });
});
