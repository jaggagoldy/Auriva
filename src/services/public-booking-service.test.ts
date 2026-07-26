import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { setAvailability } from "./availability-service";
import {
  getPublicClinicBySlug,
  getPublicDoctorSlots,
  createPublicBooking,
  PublicClinicNotFoundError,
  PublicBookingsPausedError,
} from "./public-booking-service";
import { BookingChannel, VisitType, PaymentStatus } from "@prisma/client";

const userIds: string[] = [];
const orgIds: string[] = [];
const patientIds: string[] = [];

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { clinic: { organization_id: { in: orgIds } } } });
  await prisma.doctorAvailability.deleteMany({ where: { doctor: { user_id: { in: userIds } } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.patientProfile.deleteMany({ where: { id: { in: patientIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function setupPublicClinicFixture() {
  const { organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  orgIds.push(organization.id);
  userIds.push(user.id);

  const slug = `test-clinic-${Date.now()}`;
  await prisma.clinic.update({
    where: { id: clinic.id },
    data: { slug, online_booking_enabled: true, accepting_bookings: true },
  });

  await setAvailability(
    staffProfile.id,
    Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, start_time: "09:00", end_time: "17:00" }))
  );

  return { organization, clinic: { ...clinic, slug }, doctor: staffProfile };
}

describe("public-booking-service", () => {
  it("resolves a public clinic profile by its slug", async () => {
    const { clinic, doctor } = await setupPublicClinicFixture();
    const profile = await getPublicClinicBySlug(clinic.slug!);

    expect(profile.id).toBe(clinic.id);
    expect(profile.name).toBe(clinic.name);
    expect(profile.slug).toBe(clinic.slug);
    expect(profile.accepting_bookings).toBe(true);
    expect(profile.doctors).toHaveLength(1);
    expect(profile.doctors[0].id).toBe(doctor.id);
  });

  it("throws PublicClinicNotFoundError for an invalid slug", async () => {
    await expect(getPublicClinicBySlug("non-existent-slug-12345")).rejects.toThrow(
      PublicClinicNotFoundError
    );
  });

  it("fetches public bookable slots for a doctor", async () => {
    const { clinic, doctor } = await setupPublicClinicFixture();
    const slots = await getPublicDoctorSlots(doctor.id, 7);

    expect(slots).toHaveLength(7);
    const hasSlots = slots.some((s) => s.slots.length > 0);
    expect(hasSlots).toBe(true);
  });

  it("creates a public booking with manage_token and default enums", async () => {
    const { clinic, doctor } = await setupPublicClinicFixture();

    const slots = await getPublicDoctorSlots(doctor.id, 7);
    const firstAvailableSlot = slots.find((s) => s.slots.length > 0)!.slots[0];

    const phone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

    const result = await createPublicBooking({
      clinicId: clinic.id,
      doctorId: doctor.id,
      scheduledTime: firstAvailableSlot,
      patientName: "Alice Public",
      patientPhone: phone,
      bookingChannel: BookingChannel.DIRECT,
    });

    expect(result.appointmentId).toBeDefined();
    expect(result.manageToken).toBeDefined();
    expect(result.isNewPatient).toBe(true);
    expect(result.patient.full_name).toBe("Alice Public");

    // Verify DB fields & enums
    const dbAppt = await prisma.appointment.findUnique({
      where: { id: result.appointmentId },
    });

    expect(dbAppt).not.toBeNull();
    expect(dbAppt?.manage_token).toBe(result.manageToken);
    expect(dbAppt?.booking_channel).toBe(BookingChannel.DIRECT);
    expect(dbAppt?.visit_type).toBe(VisitType.IN_PERSON);
    expect(dbAppt?.payment_status).toBe(PaymentStatus.PENDING);
  });

  it("prevents booking when online bookings are paused", async () => {
    const { clinic, doctor } = await setupPublicClinicFixture();
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { accepting_bookings: false },
    });

    const slots = await getPublicDoctorSlots(doctor.id, 7);
    const firstAvailableSlot = slots.find((s) => s.slots.length > 0)!.slots[0];

    await expect(
      createPublicBooking({
        clinicId: clinic.id,
        doctorId: doctor.id,
        scheduledTime: firstAvailableSlot,
        patientName: "Bob Public",
        patientPhone: "+15550009999",
      })
    ).rejects.toThrow(PublicBookingsPausedError);
  });
});
