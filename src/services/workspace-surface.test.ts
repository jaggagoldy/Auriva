// Batch C · Milestone 1 (APS-045 §6) — capability-driven Surface resolution.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { resolveSurfacePath } from "@/domain/authorization";
import { getWorkspaceSurface } from "@/services/workspace-service";

describe("resolveSurfacePath (pure)", () => {
  it("solo owner-doctor (single-member clinic, full caps) → /clinic", () => {
    expect(resolveSurfacePath(["reception", "doctor_workspace", "admin_portal"], true)).toBe("/clinic");
  });
  it("same caps but not single-member → /admin cockpit", () => {
    expect(resolveSurfacePath(["reception", "doctor_workspace", "admin_portal"], false)).toBe("/admin");
  });
  it("doctor_workspace → /doctor", () => {
    expect(resolveSurfacePath(["doctor_workspace"], false)).toBe("/doctor");
  });
  it("reception → /staff", () => {
    expect(resolveSurfacePath(["reception"], false)).toBe("/staff");
  });
  it("no capabilities → null", () => {
    expect(resolveSurfacePath([], false)).toBeNull();
  });
});

const userIds: string[] = [];
afterAll(async () => {
  await prisma.session.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("getWorkspaceSurface (composed)", () => {
  it("solo owner-doctor → /clinic, and flips to /admin cockpit once a second member joins", async () => {
    const { owner, clinic } = await createTestOrganization();
    userIds.push(owner.id);
    const ownerProfile = await prisma.staffProfile.create({
      data: { user_id: owner.id, clinic_id: clinic.id, full_name: "Owner Doc", specialty: "General Practitioner" },
    });

    const solo = await getWorkspaceSurface({ userId: owner.id, role: "super_admin", activeMembershipId: ownerProfile.id });
    expect(solo.surfacePath).toBe("/clinic");

    // Hire the first teammate → the clinic is no longer single-member.
    const hire = await createTestStaff(clinic.id, "receptionist");
    userIds.push(hire.user.id);

    const grown = await getWorkspaceSurface({ userId: owner.id, role: "super_admin", activeMembershipId: ownerProfile.id });
    expect(grown.surfacePath).toBe("/admin");
  });

  it("a hired doctor → /doctor, a receptionist → /staff", async () => {
    const { owner, clinic } = await createTestOrganization();
    userIds.push(owner.id);
    const doc = await createTestStaff(clinic.id, "doctor");
    const rec = await createTestStaff(clinic.id, "receptionist");
    userIds.push(doc.user.id, rec.user.id);

    const docSurface = await getWorkspaceSurface({ userId: doc.user.id, role: "doctor", activeMembershipId: doc.staffProfile.id });
    expect(docSurface.surfacePath).toBe("/doctor");

    const recSurface = await getWorkspaceSurface({ userId: rec.user.id, role: "receptionist", activeMembershipId: rec.staffProfile.id });
    expect(recSurface.surfacePath).toBe("/staff");
  });

  it("a pure owner (no staff membership) → /admin cockpit", async () => {
    const { owner } = await createTestOrganization();
    userIds.push(owner.id);
    const surface = await getWorkspaceSurface({ userId: owner.id, role: "super_admin", activeMembershipId: null });
    expect(surface.surfacePath).toBe("/admin");
    expect(surface.clinicId).toBeNull();
  });
});
