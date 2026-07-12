// TEST-4: conflict-detection regression coverage (already-existing
// guarantee, verified here rather than rebuilt — matches Sprint 2's OBS-3
// "verify, don't rebuild" approach for pre-existing protections).

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import { registerWalkIn } from "@/services/walkin-service";
import { DuplicateActiveAppointmentError } from "@/services/appointment-service";

const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];
const createdClinicIds: string[] = [];

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: createdClinicIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.patientProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("registerWalkIn — duplicate active appointment guard", () => {
  it("rejects a second same-day walk-in for the same patient + doctor", async () => {
    const { clinic, organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    createdClinicIds.push(clinic.id);
    const { user: doctorUser, staffProfile: doctor } = await createTestStaff(clinic.id, "doctor");
    const { user: patientUser, profile: patient } = await createTestPatient(clinic.id);
    createdUserIds.push(doctorUser.id, patientUser.id);

    await registerWalkIn({
      healthcareProfileId: patient.id,
      doctorId: doctor.id,
      clinicId: clinic.id,
    });

    await expect(
      registerWalkIn({
        healthcareProfileId: patient.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
      })
    ).rejects.toThrow(DuplicateActiveAppointmentError);
  });
});
