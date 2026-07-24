// M3A C2 — billing-policy service. Integration against the real dev DB
// (project convention). Proves deterministic resolution and the AUDITED,
// idempotent setter (PO refinements 3 + "tested independently, deterministic").

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import {
  ClinicNotFoundError,
  InvalidBillingPolicyError,
  getBillingPolicy,
  resolveBillingPolicy,
  setBillingPolicy,
} from "@/services/billing-policy-service";

const createdClinicIds: string[] = [];

afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: createdClinicIds } } });
});

async function freshClinic() {
  const { clinic } = await createTestOrganization();
  createdClinicIds.push(clinic.id);
  return clinic;
}

describe("resolveBillingPolicy (deterministic, pure)", () => {
  it("passes recognized policies through unchanged", () => {
    expect(resolveBillingPolicy("prepaid")).toBe("prepaid");
    expect(resolveBillingPolicy("postpaid")).toBe("postpaid");
    expect(resolveBillingPolicy("hybrid")).toBe("hybrid");
  });

  it("falls back to postpaid for unknown / null / empty", () => {
    expect(resolveBillingPolicy("nonsense")).toBe("postpaid");
    expect(resolveBillingPolicy(null)).toBe("postpaid");
    expect(resolveBillingPolicy(undefined)).toBe("postpaid");
    expect(resolveBillingPolicy("")).toBe("postpaid");
  });

  it("is deterministic — same input, same output", () => {
    for (let i = 0; i < 5; i++) {
      expect(resolveBillingPolicy("hybrid")).toBe("hybrid");
      expect(resolveBillingPolicy("weird")).toBe("postpaid");
    }
  });
});

describe("getBillingPolicy", () => {
  it("returns the clinic's stored policy (default postpaid)", async () => {
    const clinic = await freshClinic();
    expect(await getBillingPolicy(clinic.id)).toBe("postpaid");
  });
});

describe("setBillingPolicy (audited)", () => {
  it("rejects an invalid policy without writing", async () => {
    const clinic = await freshClinic();
    await expect(setBillingPolicy(clinic.id, "gibberish")).rejects.toBeInstanceOf(
      InvalidBillingPolicyError
    );
    expect(await getBillingPolicy(clinic.id)).toBe("postpaid"); // unchanged
  });

  it("throws for a missing clinic", async () => {
    await expect(setBillingPolicy("does-not-exist", "prepaid")).rejects.toBeInstanceOf(
      ClinicNotFoundError
    );
  });

  it("changes the policy and writes exactly one audit entry", async () => {
    const clinic = await freshClinic();
    const result = await setBillingPolicy(clinic.id, "hybrid", clinic.super_admin_id);
    expect(result).toBe("hybrid");
    expect(await getBillingPolicy(clinic.id)).toBe("hybrid");

    const audits = await prisma.auditLog.findMany({
      where: { organization_id: clinic.organization_id, action: "billing_policy_changed" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].detail).toBe("postpaid → hybrid");
    expect(audits[0].actor_user_id).toBe(clinic.super_admin_id);
  });

  it("is a no-op (no second audit) when the policy is unchanged", async () => {
    const clinic = await freshClinic();
    await setBillingPolicy(clinic.id, "prepaid");
    await setBillingPolicy(clinic.id, "prepaid"); // same again
    const audits = await prisma.auditLog.findMany({
      where: { organization_id: clinic.organization_id, action: "billing_policy_changed" },
    });
    expect(audits).toHaveLength(1); // only the real change was audited
  });
});
