// Batch A · A2 (APS-044 §9 / ERA-001 C5) — managed provisioning. Real DB.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createTestOrganization } from "@/test/fixtures";
import {
  provisionStaff,
  SeatLimitReachedError,
  DuplicateActiveMemberError,
  OnboardingInputError,
} from "@/services/onboarding-service";

const ownerIds: string[] = [];
let seq = 0;
const uniquePhone = () => `+9198${Date.now().toString().slice(-7)}${(seq++).toString().padStart(2, "0")}`;

afterAll(async () => {
  // Deleting the owner cascades org → clinic → staff profiles/members; the
  // provisioned staff users are independent rows, cleaned via phone prefix.
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
  await prisma.user.deleteMany({ where: { phone_number: { startsWith: "+9198" } } });
});

describe("provisionStaff — creates an active account with a temporary password", () => {
  it("creates User(must_change_password) + StaffProfile + OrganizationMember and returns a working temp password", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    ownerIds.push(owner.id);

    const result = await provisionStaff({
      organizationId: organization.id,
      clinicId: clinic.id,
      fullName: "Meera Nair",
      phone: uniquePhone(),
      role: "receptionist",
      actorUserId: owner.id,
    });

    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);

    const user = await prisma.user.findUnique({ where: { id: result.user.id } });
    expect(user?.role).toBe("receptionist");
    expect(user?.must_change_password).toBe(true);
    expect(await verifyPassword(result.temporaryPassword, user?.password_hash)).toBe(true);

    const profile = await prisma.staffProfile.findFirst({ where: { user_id: result.user.id } });
    expect(profile?.clinic_id).toBe(clinic.id);
    expect(profile?.membership_status).toBe("active");
    expect(profile?.specialty).toBeNull();

    const member = await prisma.organizationMember.findUnique({
      where: { organization_id_user_id: { organization_id: organization.id, user_id: result.user.id } },
    });
    expect(member?.role).toBe("receptionist");
  });

  it("sets a specialty for a provisioned doctor", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    ownerIds.push(owner.id);
    const result = await provisionStaff({
      organizationId: organization.id,
      clinicId: clinic.id,
      fullName: "Dr. Meera Iyer",
      phone: uniquePhone(),
      role: "doctor",
      specialty: "Dermatologist",
      actorUserId: owner.id,
    });
    const profile = await prisma.staffProfile.findFirst({ where: { user_id: result.user.id } });
    expect(profile?.specialty).toBe("Dermatologist");
  });
});

describe("provisionStaff — guards", () => {
  it("enforces the plan's seat ceiling (Solo: 1 receptionist)", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    ownerIds.push(owner.id);
    await provisionStaff({
      organizationId: organization.id, clinicId: clinic.id,
      fullName: "First Desk", phone: uniquePhone(), role: "receptionist", actorUserId: owner.id,
    });
    await expect(
      provisionStaff({
        organizationId: organization.id, clinicId: clinic.id,
        fullName: "Second Desk", phone: uniquePhone(), role: "receptionist", actorUserId: owner.id,
      })
    ).rejects.toThrow(SeatLimitReachedError);
  });

  it("rejects a mobile number that already has an account", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    ownerIds.push(owner.id);
    const phone = uniquePhone();
    await provisionStaff({
      organizationId: organization.id, clinicId: clinic.id,
      fullName: "Taken Phone", phone, role: "doctor", actorUserId: owner.id,
    });
    await expect(
      provisionStaff({
        organizationId: organization.id, clinicId: clinic.id,
        fullName: "Clash", phone, role: "doctor", actorUserId: owner.id,
      })
    ).rejects.toThrow(DuplicateActiveMemberError);
  });

  it("rejects a clinic that does not belong to the organization", async () => {
    const a = await createTestOrganization();
    const b = await createTestOrganization();
    ownerIds.push(a.owner.id, b.owner.id);
    await expect(
      provisionStaff({
        organizationId: a.organization.id, clinicId: b.clinic.id, // foreign clinic
        fullName: "Wrong Clinic", phone: uniquePhone(), role: "doctor", actorUserId: a.owner.id,
      })
    ).rejects.toThrow(OnboardingInputError);
  });
});
