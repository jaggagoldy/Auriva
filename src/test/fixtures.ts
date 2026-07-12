// TEST-3: shared fixtures for API regression tests. Creates real rows via
// the real Prisma client (same one the app uses) — these are integration
// tests against the actual database, not mocks of it, so a regression in
// real authorization/query logic is actually caught.

import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE_NAME } from "@/api/session";

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${randomUUID().slice(0, 8)}`;
}

export async function createTestOrganization() {
  const owner = await prisma.user.create({
    data: {
      role: "super_admin",
      phone_number: unique("owner-phone"),
      email: `${unique("owner")}@test.local`,
      password_hash: await hashPassword("password123"),
    },
  });
  const organization = await prisma.organization.create({
    data: { name: unique("Test Org"), owner_user_id: owner.id },
  });
  const clinic = await prisma.clinic.create({
    data: {
      name: unique("Test Clinic"),
      address: "1 Test St",
      super_admin_id: owner.id,
      organization_id: organization.id,
    },
  });
  return { owner, organization, clinic };
}

export async function createTestStaff(
  clinicId: string,
  role: "doctor" | "receptionist" = "receptionist"
) {
  const user = await prisma.user.create({
    data: {
      role,
      phone_number: unique(`${role}-phone`),
      email: `${unique(role)}@test.local`,
      password_hash: await hashPassword("password123"),
    },
  });
  const staffProfile = await prisma.staffProfile.create({
    data: {
      user_id: user.id,
      clinic_id: clinicId,
      full_name: unique("Test Staff"),
      specialty: role === "doctor" ? "General Practitioner" : null,
    },
  });
  return { user, staffProfile };
}

export async function createTestPatient(registeredByClinicId?: string) {
  const profile = await prisma.patientProfile.create({
    data: {
      full_name: unique("Test Patient"),
      blood_group: "O-Positive",
      health_id: `AUR-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      registered_by_clinic_id: registeredByClinicId ?? null,
    },
  });
  const user = await prisma.user.create({
    data: {
      role: "patient",
      phone_number: unique("patient-phone"),
    },
  });
  await prisma.patientProfile.update({ where: { id: profile.id }, data: { user_id: user.id } });
  return { user, profile };
}

/** Creates a real Session row and returns the cookie header value a request
 * should carry to authenticate as this user — bypasses setSessionCookie()
 * (which needs next/headers' request scope) by handing back the raw value
 * directly for a test to attach to a constructed NextRequest/cookie mock. */
export async function sessionCookieFor(
  userId: string,
  role: string,
  activeHealthcareProfileId?: string | null
) {
  const { rawToken } = await createSession(userId, role, activeHealthcareProfileId);
  return { name: SESSION_COOKIE_NAME, value: rawToken };
}
