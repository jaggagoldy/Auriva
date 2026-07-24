// BRD-043 US-104 (P0, Sprint 1): regression coverage for the shared
// doctor-resolution helper — real database, matching the existing
// onboarding-service.test.ts convention. Every case here is a scenario the
// pre-fix code got silently wrong: a clinic with 2+ doctors, or a
// receptionist's own profile being mistaken for "the doctor."

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { AmbiguousDoctorError, resolveClinicDoctor } from "@/services/doctor-resolution";

const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];

afterAll(async () => {
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("resolveClinicDoctor", () => {
  it("resolves the caller's own profile when the caller is themselves a doctor", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(doctor.id);

    const resolved = await resolveClinicDoctor(clinic.id, doctor.id);
    expect(resolved?.id).toBe(staffProfile.id);
    void owner;
  });

  it("resolves the clinic's one doctor when the caller has no profile of their own (solo clinic — unchanged behavior)", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(doctor.id);

    // owner has no StaffProfile of their own — the pre-fix fallback used to
    // grab "any" row here; with exactly one doctor this is still correct.
    const resolved = await resolveClinicDoctor(clinic.id, owner.id);
    expect(resolved?.id).toBe(staffProfile.id);
  });

  it("never mistakes a receptionist's own profile for a doctor", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: receptionist } = await createTestStaff(clinic.id, "receptionist");
    createdUserIds.push(receptionist.id);

    // No doctor exists at all yet — the receptionist's own row must NOT be
    // returned as "the doctor" (this was the actual pre-fix bug: the
    // fallback had no role filter).
    const resolved = await resolveClinicDoctor(clinic.id, receptionist.id);
    expect(resolved).toBeNull();
  });

  it("refuses to guess when 2+ active doctors exist and the caller isn't one of them", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctorA } = await createTestStaff(clinic.id, "doctor");
    const { user: doctorB } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(doctorA.id, doctorB.id);

    await expect(resolveClinicDoctor(clinic.id, owner.id)).rejects.toThrow(AmbiguousDoctorError);
  });

  it("resolves an explicit doctor_id even when the clinic has 2+ doctors", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctorA, staffProfile: profileA } = await createTestStaff(clinic.id, "doctor");
    const { user: doctorB } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(doctorA.id, doctorB.id);

    const resolved = await resolveClinicDoctor(clinic.id, owner.id, profileA.id);
    expect(resolved?.id).toBe(profileA.id);
  });

  it("returns null when the clinic has no doctor at all", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const resolved = await resolveClinicDoctor(clinic.id, "nonexistent-user-id");
    expect(resolved).toBeNull();
  });

  it("excludes a deactivated doctor from resolution", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    createdUserIds.push(doctor.id);
    await prisma.staffProfile.update({ where: { id: staffProfile.id }, data: { is_active: false } });

    const resolved = await resolveClinicDoctor(clinic.id, owner.id);
    expect(resolved).toBeNull();
  });
});
