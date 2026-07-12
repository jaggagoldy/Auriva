// Batch 3 (Booking Foundation): the public booking flow. Integration tests
// against the real DB — duplicate detection (never double-create a patient for
// a known phone) and inline creation are the two properties a regression would
// silently break.

import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { bookPublicAppointment, BookingsPausedError } from "./booking-service";
import { DoctorProfileNotFoundError } from "./appointment-service";

const userIds: string[] = [];
const orgIds: string[] = [];
const clinicIds: string[] = [];

function phone() {
  return `+1666${randomUUID().replace(/\D/g, "").slice(0, 7)}`;
}
function futureTime(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.patientProfile.deleteMany({ where: { registered_by_clinic_id: { in: clinicIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function setupDoctor() {
  const { organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  orgIds.push(organization.id);
  clinicIds.push(clinic.id);
  userIds.push(user.id);
  return { clinic, staffProfile };
}

describe("bookPublicAppointment", () => {
  it("creates a Healthcare Profile inline for an unknown phone and schedules", async () => {
    const { staffProfile } = await setupDoctor();
    const result = await bookPublicAppointment({
      doctorId: staffProfile.id,
      scheduledTime: futureTime(24),
      patientName: "Priya Sharma",
      patientPhone: phone(),
    });

    expect(result.isNewPatient).toBe(true);
    expect(result.patient.full_name).toBe("Priya Sharma");
    expect(result.patient.health_id).toMatch(/^AUR-/);
    expect(result.appointment.status).toBe("scheduled");
  });

  it("reuses the existing profile for a known phone (duplicate detection)", async () => {
    const { staffProfile } = await setupDoctor();
    const p = phone();

    const first = await bookPublicAppointment({
      doctorId: staffProfile.id,
      scheduledTime: futureTime(24),
      patientName: "Aarav Kumar",
      patientPhone: p,
    });
    const second = await bookPublicAppointment({
      doctorId: staffProfile.id,
      scheduledTime: futureTime(48),
      patientName: "Aarav Kumar",
      patientPhone: p,
    });

    expect(first.isNewPatient).toBe(true);
    expect(second.isNewPatient).toBe(false);
    expect(second.patient.health_id).toBe(first.patient.health_id);

    const profiles = await prisma.patientProfile.findMany({
      where: { contacts: { some: { type: "phone", value: p } } },
    });
    expect(profiles).toHaveLength(1); // never duplicated
  });

  it("refuses when the clinic has paused online bookings (accepting_bookings=false)", async () => {
    const { clinic, staffProfile } = await setupDoctor();
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { accepting_bookings: false },
    });

    await expect(
      bookPublicAppointment({
        doctorId: staffProfile.id,
        scheduledTime: futureTime(24),
        patientName: "Paused Patient",
        patientPhone: phone(),
      })
    ).rejects.toThrow(BookingsPausedError);

    // …and no appointment was created as a side effect.
    const appts = await prisma.appointment.findMany({ where: { clinic_id: clinic.id } });
    expect(appts).toHaveLength(0);
  });

  it("resumes booking once the clinic re-enables it", async () => {
    const { clinic, staffProfile } = await setupDoctor();
    await prisma.clinic.update({ where: { id: clinic.id }, data: { accepting_bookings: false } });
    await prisma.clinic.update({ where: { id: clinic.id }, data: { accepting_bookings: true } });

    const result = await bookPublicAppointment({
      doctorId: staffProfile.id,
      scheduledTime: futureTime(24),
      patientName: "Resumed Patient",
      patientPhone: phone(),
    });
    expect(result.appointment.status).toBe("scheduled");
  });

  it("rejects an unknown doctor", async () => {
    await expect(
      bookPublicAppointment({
        doctorId: "does-not-exist",
        scheduledTime: futureTime(24),
        patientName: "Nobody",
        patientPhone: phone(),
      })
    ).rejects.toThrow(DoctorProfileNotFoundError);
  });
});
