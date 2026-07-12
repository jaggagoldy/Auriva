// TEST-3: authorization / permission-boundary regression coverage for the
// three guard functions every protected route goes through. Real Prisma
// queries against the real database (see src/test/fixtures.ts) — only
// `next/headers`' `cookies()` is mocked, since it throws outside an actual
// Next.js request scope; everything downstream of it is real code.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import {
  createTestOrganization,
  createTestPatient,
  createTestStaff,
  sessionCookieFor,
} from "@/test/fixtures";
import { requireStaffContext, requireAppointmentAccess, requirePlatformAdminContext } from "@/api/session";
import { canAccessReception, canAccessDoctorWorkspace } from "@/domain/authorization";

const cookieStore = vi.hoisted(() => ({ value: undefined as string | undefined }));

// Vitest hoists this above the imports above, so session.ts's own
// `import { cookies } from "next/headers"` resolves to this mock —
// cookies() throws outside a real Next.js request scope otherwise.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "auriva_staff_session" && cookieStore.value
        ? { name, value: cookieStore.value }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

async function signInAs(userId: string, role: string, activeHealthcareProfileId?: string | null) {
  const cookie = await sessionCookieFor(userId, role, activeHealthcareProfileId);
  cookieStore.value = cookie.value;
}

function signOut() {
  cookieStore.value = undefined;
}

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.patientProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

beforeEach(() => {
  signOut();
});

describe("requireStaffContext (permission boundaries)", () => {
  it("rejects an unauthenticated caller with 401", async () => {
    const result = await requireStaffContext(canAccessReception);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rejects a role the predicate doesn't authorize with 403", async () => {
    const { clinic } = await createTestOrganization();
    const { user } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(user.id);

    await signInAs(user.id, "doctor");
    // A doctor is not a receptionist — canAccessReception must reject them.
    const result = await requireStaffContext(canAccessReception);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("scopes a receptionist to their own clinic regardless of a different requested clinic_id", async () => {
    const orgA = await createTestOrganization();
    const orgB = await createTestOrganization();
    createdOrgIds.push(orgA.organization.id, orgB.organization.id);
    const { user } = await createTestStaff(orgA.clinic.id, "receptionist");
    createdUserIds.push(user.id);

    await signInAs(user.id, "receptionist");
    const result = await requireStaffContext(canAccessReception, orgB.clinic.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.clinicId).toBe(orgA.clinic.id); // never orgB's
  });

  it("rejects a super_admin requesting a clinic they don't own", async () => {
    const orgA = await createTestOrganization();
    const orgB = await createTestOrganization();
    createdOrgIds.push(orgA.organization.id, orgB.organization.id);

    await signInAs(orgA.owner.id, "super_admin");
    const result = await requireStaffContext(canAccessDoctorWorkspace, orgB.clinic.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  // Batch 2 (Adaptive Workspace): the capability-string form of the guard.
  it("rejects an ungranted doctor from the reception capability", async () => {
    const { clinic } = await createTestOrganization();
    const { user } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(user.id);

    await signInAs(user.id, "doctor");
    const result = await requireStaffContext("reception");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("admits a doctor GRANTED reception (the solo practitioner), scoped to their clinic", async () => {
    const { clinic, organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(user.id);
    await prisma.staffProfile.update({
      where: { id: staffProfile.id },
      data: { capabilities: JSON.stringify(["reception"]) },
    });

    await signInAs(user.id, "doctor");
    const result = await requireStaffContext("reception");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clinicId).toBe(clinic.id);
      expect(result.capabilities).toContain("reception");
      expect(result.capabilities).toContain("doctor_workspace");
    }
  });
});

describe("requireAppointmentAccess (permission boundaries)", () => {
  it("rejects a patient requesting another patient's appointments", async () => {
    const own = await createTestPatient();
    const other = await createTestPatient();
    createdUserIds.push(own.user.id, other.user.id);

    await signInAs(own.user.id, "patient", own.profile.id);
    const result = await requireAppointmentAccess({ patientId: other.profile.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("allows a patient to request their own appointments", async () => {
    const patient = await createTestPatient();
    createdUserIds.push(patient.user.id);

    await signInAs(patient.user.id, "patient", patient.profile.id);
    const result = await requireAppointmentAccess({ patientId: patient.profile.id });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scope).toEqual({ kind: "patient", patientId: patient.profile.id });
  });

  it("rejects a doctor requesting a different doctor's appointments", async () => {
    const { clinic } = await createTestOrganization();
    const doctorA = await createTestStaff(clinic.id, "doctor");
    const doctorB = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(doctorA.user.id, doctorB.user.id);

    await signInAs(doctorA.user.id, "doctor");
    const result = await requireAppointmentAccess({ doctorId: doctorB.staffProfile.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});

describe("requirePlatformAdminContext (permission boundaries)", () => {
  it("rejects a customer-organization super_admin (is_platform_admin=false)", async () => {
    const { owner } = await createTestOrganization();
    createdUserIds.push(owner.id);

    await signInAs(owner.id, "super_admin");
    const result = await requirePlatformAdminContext();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});
