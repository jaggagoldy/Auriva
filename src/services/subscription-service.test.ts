// BRD-043 Sprint 5 (US-502/504/505). The load-bearing guarantee: a clinic can
// NEVER change its own plan. requestUpgrade records a request but leaves
// Organization.plan untouched; only setOrganizationPlan (admin path) mutates
// it. Real DB.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import { getClinicPlan, requestUpgrade, setOrganizationPlan, PlanInputError } from "@/services/subscription-service";

const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("getClinicPlan (read-only)", () => {
  it("returns the current plan + live seat usage + tier definitions", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const plan = await getClinicPlan(clinic.id);
    expect(plan?.plan).toBe("solo");
    expect(plan?.plan_label).toBe("Solo");
    expect(plan?.seats_used).toBe(0);
    expect(plan?.seats_max).toBe(2);
    expect(plan?.tiers.professional.maxDoctors).toBe(5);
  });
});

describe("requestUpgrade (US-504) — never mutates the plan", () => {
  it("records an audit entry + returns unchanged plan, WITHOUT changing Organization.plan", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const before = (await prisma.organization.findUnique({ where: { id: organization.id } }))?.plan;
    const result = await requestUpgrade({
      clinicId: clinic.id,
      organizationId: organization.id,
      actorUserId: owner.id,
      targetPlan: "professional",
    });
    const after = (await prisma.organization.findUnique({ where: { id: organization.id } }))?.plan;

    expect(before).toBe("solo");
    expect(after).toBe("solo"); // ← the whole point: unchanged
    expect(result.requested).toBe(true);
    expect(result.current_plan).toBe("solo");
    expect(await prisma.auditLog.count({ where: { organization_id: organization.id, action: "subscription_upgrade_requested" } })).toBe(1);
  });
});

describe("setOrganizationPlan (US-505) — the only mutator", () => {
  it("changes Organization.plan and writes an audit entry", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await setOrganizationPlan({ organizationId: organization.id, plan: "professional", actorUserId: "auriva-ops" });
    expect((await prisma.organization.findUnique({ where: { id: organization.id } }))?.plan).toBe("professional");
    // and the Plan screen now reflects the higher ceiling
    expect((await getClinicPlan(clinic.id))?.seats_max).toBe(14);
  });

  it("rejects an unknown plan value", async () => {
    const { organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await expect(
      setOrganizationPlan({ organizationId: organization.id, plan: "enterprise-plus", actorUserId: "ops" })
    ).rejects.toThrow(PlanInputError);
  });
});
