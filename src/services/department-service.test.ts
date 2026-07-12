// TEST-4: duplicate-creation-attempt regression coverage (DATA-2) — real
// database, real Prisma queries.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import {
  createDepartment,
  DepartmentInputError,
  DepartmentNameConflictError,
} from "@/services/department-service";

const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.department.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("createDepartment", () => {
  it("creates a department successfully", async () => {
    const { organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const dept = await createDepartment({ organizationId: organization.id, name: "Cardiology" });
    expect(dept.name).toBe("Cardiology");
  });

  it("rejects a duplicate name within the same organization with a 409-shaped conflict", async () => {
    const { organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await createDepartment({ organizationId: organization.id, name: "Radiology" });
    await expect(
      createDepartment({ organizationId: organization.id, name: "Radiology" })
    ).rejects.toThrow(DepartmentNameConflictError);
  });

  it("allows the same department name in a different organization", async () => {
    const orgA = await createTestOrganization();
    const orgB = await createTestOrganization();
    createdOrgIds.push(orgA.organization.id, orgB.organization.id);

    await createDepartment({ organizationId: orgA.organization.id, name: "Pediatrics" });
    await expect(
      createDepartment({ organizationId: orgB.organization.id, name: "Pediatrics" })
    ).resolves.toBeTruthy();
  });

  it("rejects a blank name as a validation failure, not a conflict", async () => {
    const { organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await expect(
      createDepartment({ organizationId: organization.id, name: "   " })
    ).rejects.toThrow(DepartmentInputError);
  });

  it("rejects a clinic that doesn't belong to the organization (invalid ownership)", async () => {
    const orgA = await createTestOrganization();
    const orgB = await createTestOrganization();
    createdOrgIds.push(orgA.organization.id, orgB.organization.id);

    await expect(
      createDepartment({
        organizationId: orgA.organization.id,
        clinicId: orgB.clinic.id,
        name: "Cross-org Department",
      })
    ).rejects.toThrow(DepartmentInputError);
  });
});
