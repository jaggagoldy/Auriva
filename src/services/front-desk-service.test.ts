import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { setAvailability } from "./availability-service";
import { createPublicBooking } from "./public-booking-service";
import {
  getFrontDeskQueue,
  updateArrivalStatus,
  recordPaymentSettlement,
  getAppointmentTimeline,
} from "./front-desk-service";
import { BookingChannel, PaymentStatus } from "@prisma/client";

const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  await prisma.appointmentEvent.deleteMany({ where: { appointment: { clinic: { organization_id: { in: orgIds } } } } });
  await prisma.appointment.deleteMany({ where: { clinic: { organization_id: { in: orgIds } } } });
  await prisma.doctorAvailability.deleteMany({ where: { doctor: { user_id: { in: userIds } } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function setupFrontDeskFixture() {
  const { organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  orgIds.push(organization.id);
  userIds.push(user.id);

  const slug = `frontdesk-clinic-${Date.now()}`;
  await prisma.clinic.update({
    where: { id: clinic.id },
    data: { slug, online_booking_enabled: true, accepting_bookings: true },
  });

  await setAvailability(
    staffProfile.id,
    Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, start_time: "09:00", end_time: "17:00" }))
  );

  const todayDate = new Date();
  todayDate.setHours(11, 0, 0, 0);

  const booking = await createPublicBooking({
    clinicId: clinic.id,
    doctorId: staffProfile.id,
    scheduledTime: todayDate.toISOString(),
    patientName: "David Desk",
    patientPhone: "+15554443333",
    bookingChannel: BookingChannel.DIRECT,
  });

  return { organization, clinic, doctor: staffProfile, booking };
}

describe("front-desk-service — Front Desk Operations", () => {
  it("fetches today's operational queue with channel & payment status badges", async () => {
    const { clinic, booking } = await setupFrontDeskFixture();
    const queue = await getFrontDeskQueue(clinic.id);

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(booking.appointmentId);
    expect(queue[0].patientName).toBe("David Desk");
    expect(queue[0].bookingChannel).toBe(BookingChannel.DIRECT);
    expect(queue[0].paymentStatus).toBe(PaymentStatus.PENDING);
  });

  it("updates arrival status to checked_in and logs timeline event", async () => {
    const { booking } = await setupFrontDeskFixture();

    const updated = await updateArrivalStatus(booking.appointmentId, "check_in", "Arrived on time");
    expect(updated.status).toBe("checked_in");
    expect(updated.checked_in_at).not.toBeNull();

    const timeline = await getAppointmentTimeline(booking.appointmentId);
    expect(timeline.length).toBeGreaterThan(0);
    const checkInEvent = timeline.find((t) => t.title.includes("CHECK IN"));
    expect(checkInEvent).toBeDefined();
  });

  it("records payment settlement state to PAID", async () => {
    const { booking } = await setupFrontDeskFixture();

    const updated = await recordPaymentSettlement(booking.appointmentId, PaymentStatus.PAID, "Collected ₹500 at desk");
    expect(updated.payment_status).toBe(PaymentStatus.PAID);

    const timeline = await getAppointmentTimeline(booking.appointmentId);
    const paymentEvent = timeline.find((t) => t.title.includes("PAYMENT STATUS CHANGED"));
    expect(paymentEvent).toBeDefined();
  });
});
