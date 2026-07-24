// Batch F · M2 — Release Validation: the RBAC guarantee, exercised at the real
// enforcement choke points (requireStaffContext / requireOrganizationContext /
// requireLegalOwnerContext + the capability & permission predicates) with a
// real session per role. Positive AND negative cases for every one of the six
// staff roles — the matrix QA would otherwise click through by hand.

import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import {
  createSession,
  requireStaffContext,
  requireOrganizationContext,
  requireLegalOwnerContext,
} from "@/api/session";
import {
  canAccessReception,
  canAccessDoctorWorkspace,
  canAdministerOrganization,
  can,
} from "@/domain/authorization";

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
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

async function member(clinicId: string, organizationId: string, role: string) {
  const user = await prisma.user.create({
    data: { role, phone_number: `rbac-${role}-${randomUUID()}`, password_hash: "x" },
  });
  await prisma.staffProfile.create({
    data: { user_id: user.id, clinic_id: clinicId, full_name: `${role}-${randomUUID().slice(0, 4)}`, specialty: role === "doctor" ? "General Physician" : null },
  });
  await prisma.organizationMember.create({ data: { organization_id: organizationId, user_id: user.id, role } });
  userIds.push(user.id);
  return user;
}

/** Acts as `userId`/`role` for the duration of `fn`. */
async function as<T>(userId: string, role: string, fn: () => Promise<T>): Promise<T> {
  cookieStore.value = (await createSession(userId, role, null)).rawToken;
  try {
    return await fn();
  } finally {
    cookieStore.value = undefined;
  }
}

describe("RBAC validation — the six roles at the enforcement boundary", () => {
  it("Owner: full access incl. legal-owner-only actions", async () => {
    const { owner } = await createTestOrganization();
    userIds.push(owner.id);
    await as(owner.id, "super_admin", async () => {
      expect((await requireStaffContext(canAccessReception)).ok).toBe(true);
      expect((await requireStaffContext(canAccessDoctorWorkspace)).ok).toBe(true);
      expect((await requireOrganizationContext(canAdministerOrganization)).ok).toBe(true);
      const legal = await requireLegalOwnerContext();
      expect(legal.ok).toBe(true);
      if (legal.ok) expect(legal.isLegalOwner).toBe(true);
    });
    expect(can("plan:manage", "super_admin")).toBe(true);
    expect(can("team:assign_owner", "super_admin")).toBe(true);
  });

  it("Practice Manager: operational yes; clinical + legal-owner no", async () => {
    const { organization, clinic } = await createTestOrganization();
    const pm = await member(clinic.id, organization.id, "practice_manager");
    await as(pm.id, "practice_manager", async () => {
      // Operational org authority (team/settings/reports) — resolves the org.
      const org = await requireOrganizationContext(canAdministerOrganization);
      expect(org.ok).toBe(true);
      if (org.ok) expect(org.isLegalOwner).toBe(false);
      // ...but never the legal-owner actions.
      expect((await requireLegalOwnerContext()).ok).toBe(false);
      // ...and no clinical write surface.
      expect((await requireStaffContext(canAccessDoctorWorkspace)).ok).toBe(false);
    });
    expect(can("clinical_records:view", "practice_manager")).toBe(true);
    expect(can("clinical_records:edit", "practice_manager")).toBe(false);
    expect(can("plan:manage", "practice_manager")).toBe(false);
  });

  it("Doctor: clinical yes; org administration no", async () => {
    const { organization, clinic } = await createTestOrganization();
    const doc = await member(clinic.id, organization.id, "doctor");
    await as(doc.id, "doctor", async () => {
      expect((await requireStaffContext(canAccessDoctorWorkspace)).ok).toBe(true);
      expect((await requireOrganizationContext(canAdministerOrganization)).ok).toBe(false);
      expect((await requireStaffContext(canAccessReception)).ok).toBe(false);
    });
    expect(can("consultation:write", "doctor")).toBe(true);
    expect(can("reports:org", "doctor")).toBe(false);
  });

  it("Receptionist: front desk yes; clinical + admin no", async () => {
    const { organization, clinic } = await createTestOrganization();
    const rec = await member(clinic.id, organization.id, "receptionist");
    await as(rec.id, "receptionist", async () => {
      expect((await requireStaffContext(canAccessReception)).ok).toBe(true);
      expect((await requireStaffContext("reception")).ok).toBe(true); // billing/booking capability
      expect((await requireStaffContext(canAccessDoctorWorkspace)).ok).toBe(false);
      expect((await requireOrganizationContext(canAdministerOrganization)).ok).toBe(false);
    });
    expect(can("consultation:write", "receptionist")).toBe(false);
  });

  it("Nurse: shares the clinical surface by capability, but no doctor-role write + no reception", async () => {
    const { organization, clinic } = await createTestOrganization();
    const nurse = await member(clinic.id, organization.id, "nurse");
    await as(nurse.id, "nurse", async () => {
      // The doctor APIs role-gate to isDoctor||super_admin — a nurse is denied,
      // so they can never write a consultation even though they open /doctor.
      expect((await requireStaffContext(canAccessDoctorWorkspace)).ok).toBe(false);
      // No front-desk billing capability, no org admin.
      expect((await requireStaffContext("reception")).ok).toBe(false);
      expect((await requireOrganizationContext(canAdministerOrganization)).ok).toBe(false);
    });
    expect(can("vitals:write", "nurse")).toBe(true);
    expect(can("consultation:write", "nurse")).toBe(false);
  });

  it("Technician: diagnostics only — never the reception (billing) capability", async () => {
    const { organization, clinic } = await createTestOrganization();
    const tech = await member(clinic.id, organization.id, "technician");
    await as(tech.id, "technician", async () => {
      expect((await requireStaffContext("reception")).ok).toBe(false); // no billing/booking
      expect((await requireStaffContext(canAccessReception)).ok).toBe(false);
      expect((await requireStaffContext(canAccessDoctorWorkspace)).ok).toBe(false);
      expect((await requireOrganizationContext(canAdministerOrganization)).ok).toBe(false);
    });
    expect(can("diagnostics:results:write", "technician")).toBe(true);
    expect(can("consultation:write", "technician")).toBe(false);
  });
});
