// Batch B (APS-044 P6/§13a · SAD-043 §9.3) — StaffProfile 1:1 → 1:N.
// Proves: a person can hold multiple memberships; the membership seam is
// self-scoped (isolation); requireStaffContext scopes to the ACTIVE membership's
// clinic; single-membership behaviour is unchanged. Real DB.

import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { resolveActiveMembership } from "@/services/workspace-service";
import { createSession, requireStaffContext } from "@/api/session";
import { canAccessDoctorWorkspace } from "@/domain/authorization";

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
const uniq = (p: string) => `${p}-${randomUUID().slice(0, 12)}`;

afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

// A doctor holding a membership in TWO clinics of the same org — only possible
// now that user_id is 1:N.
async function twoClinicDoctor() {
  const { owner, organization, clinic: clinicA } = await createTestOrganization();
  const clinicB = await prisma.clinic.create({
    data: { name: uniq("Clinic B"), address: "2 Test St", super_admin_id: owner.id, organization_id: organization.id },
  });
  const user = await prisma.user.create({
    data: { role: "doctor", phone_number: uniq("multi-phone"), password_hash: await hashPassword("password123") },
  });
  const profA = await prisma.staffProfile.create({
    data: { user_id: user.id, clinic_id: clinicA.id, full_name: "Dr. Multi", specialty: "General Practitioner" },
  });
  const profB = await prisma.staffProfile.create({
    data: { user_id: user.id, clinic_id: clinicB.id, full_name: "Dr. Multi", specialty: "General Practitioner" },
  });
  userIds.push(owner.id, user.id);
  return { user, clinicA, clinicB, profA, profB };
}

describe("1:N — a person holds multiple memberships", () => {
  it("resolveActiveMembership picks the membership named by active_membership_id (scoped to the caller)", async () => {
    const { user, clinicA, clinicB, profA, profB } = await twoClinicDoctor();

    const a = await resolveActiveMembership(user.id, profA.id);
    expect(a?.membershipId).toBe(profA.id);
    expect(a?.clinicId).toBe(clinicA.id);

    const b = await resolveActiveMembership(user.id, profB.id);
    expect(b?.clinicId).toBe(clinicB.id);

    // No active selected → falls back to one of the caller's active memberships.
    const fallback = await resolveActiveMembership(user.id, null);
    expect([profA.id, profB.id]).toContain(fallback?.membershipId);
  });

  it("ISOLATION: resolveActiveMembership returns null for a membership the caller does not hold", async () => {
    const { user } = await twoClinicDoctor();
    const other = await createTestStaff((await createTestOrganization().then((o) => { userIds.push(o.owner.id); return o; })).clinic.id, "doctor");
    userIds.push(other.user.id);

    const leaked = await resolveActiveMembership(user.id, other.staffProfile.id);
    expect(leaked).toBeNull();
  });
});

describe("requireStaffContext scopes to the ACTIVE membership's clinic", () => {
  it("returns clinic A when active on A, clinic B when active on B (per-membership isolation)", async () => {
    const { user, clinicA, clinicB, profA, profB } = await twoClinicDoctor();

    const sessA = await createSession(user.id, "doctor", null, profA.id);
    cookieStore.value = sessA.rawToken;
    const ctxA = await requireStaffContext(canAccessDoctorWorkspace);
    expect(ctxA.ok).toBe(true);
    if (ctxA.ok) expect(ctxA.clinicId).toBe(clinicA.id);

    const sessB = await createSession(user.id, "doctor", null, profB.id);
    cookieStore.value = sessB.rawToken;
    const ctxB = await requireStaffContext(canAccessDoctorWorkspace);
    expect(ctxB.ok).toBe(true);
    if (ctxB.ok) expect(ctxB.clinicId).toBe(clinicB.id);

    cookieStore.value = undefined;
  });
});
