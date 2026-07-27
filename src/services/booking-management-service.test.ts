import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { setAvailability } from "./availability-service";
import { createPublicBooking } from "./public-booking-service";
import {
  canCancelAppointment,
  canRescheduleAppointment,
  canSelfManage,
} from "./booking-policy-engine-service";
import {
  getBookingDetailsByToken,
  rescheduleBookingByToken,
  cancelBookingByToken,
  BookingNotFoundError,
  BookingPolicyViolationError,
  OptimisticConcurrencyError,
} from "./booking-management-service";
import { BookingChannel } from "@prisma/client";

const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { clinic: { organization_id: { in: orgIds } } } });
  await prisma.doctorAvailability.deleteMany({ where: { doctor: { user_id: { in: userIds } } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function setupBookingFixture(cancellationWindowHours: number | null = 24) {
  const { organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  orgIds.push(organization.id);
  userIds.push(user.id);

  const slug = `manage-clinic-${Date.now()}`;
  await prisma.clinic.update({
    where: { id: clinic.id },
    data: {
      slug,
      online_booking_enabled: true,
      accepting_bookings: true,
      self_service_enabled: true,
      cancellation_window_hours: cancellationWindowHours,
    },
  });

  await setAvailability(
    staffProfile.id,
    Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, start_time: "09:00", end_time: "17:00" }))
  );

  // Future booking 48h from now
  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const booking = await createPublicBooking({
    clinicId: clinic.id,
    doctorId: staffProfile.id,
    scheduledTime: futureDate.toISOString(),
    patientName: "Charlie Patient",
    patientPhone: "+15551239876",
    bookingChannel: BookingChannel.DIRECT,
  });

  return { organization, clinic, doctor: staffProfile, booking };
}

describe("booking-policy-engine-service", () => {
  it("allows self-management when enabled and token is active", () => {
    const res = canSelfManage(
      { id: "1", status: "scheduled", scheduled_time: new Date(), reschedule_count: 0, token_invalidated: false },
      { id: "c1", self_service_enabled: true, cancellation_window_hours: 24 }
    );
    expect(res.allowed).toBe(true);
  });

  it("blocks self-management when feature flag self_service_enabled is false", () => {
    const res = canSelfManage(
      { id: "1", status: "scheduled", scheduled_time: new Date(), reschedule_count: 0, token_invalidated: false },
      { id: "c1", self_service_enabled: false, cancellation_window_hours: 24 }
    );
    expect(res.allowed).toBe(false);
    expect(res.code).toBe("SELF_SERVICE_DISABLED");
  });

  it("blocks cancellation if within the cancellation window notice period", () => {
    const nearFuture = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours away
    const res = canCancelAppointment(
      { id: "1", status: "scheduled", scheduled_time: nearFuture, reschedule_count: 0, token_invalidated: false },
      { id: "c1", self_service_enabled: true, cancellation_window_hours: 24 }
    );
    expect(res.allowed).toBe(false);
    expect(res.code).toBe("CANCELLATION_WINDOW_EXCEEDED");
  });
});

describe("booking-management-service", () => {
  it("retrieves appointment details by manage_token", async () => {
    const { booking } = await setupBookingFixture();
    const details = await getBookingDetailsByToken(booking.manageToken);

    expect(details.id).toBe(booking.appointmentId);
    expect(details.patientName).toBe("Charlie Patient");
    expect(details.canCancel).toBe(true);
    expect(details.canReschedule).toBe(true);
  });

  it("reschedules an appointment and rotates manage_token", async () => {
    const { booking, doctor } = await setupBookingFixture();
    const newDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const res = await rescheduleBookingByToken({
      token: booking.manageToken,
      newScheduledTime: newDate.toISOString(),
    });

    expect(res.appointmentId).toBe(booking.appointmentId);
    expect(res.newToken).toBeDefined();
    expect(res.newToken).not.toBe(booking.manageToken);

    // Old token should no longer resolve
    await expect(getBookingDetailsByToken(booking.manageToken)).rejects.toThrow(BookingNotFoundError);

    // New token should resolve updated appointment
    const newDetails = await getBookingDetailsByToken(res.newToken);
    expect(newDetails.rescheduleCount).toBe(1);
  });

  it("cancels an appointment and invalidates manage_token", async () => {
    const { booking } = await setupBookingFixture();

    const res = await cancelBookingByToken({
      token: booking.manageToken,
      reason: "Scheduling conflict",
    });

    expect(res.status).toBe("cancelled");

    // Token should now fail policy check
    const appt = await prisma.appointment.findUnique({
      where: { id: booking.appointmentId },
    });
    expect(appt?.token_invalidated).toBe(true);
  });

  it("enforces optimistic concurrency control", async () => {
    const { booking } = await setupBookingFixture();
    const staleTime = new Date("2000-01-01T00:00:00.000Z").toISOString();

    await expect(
      cancelBookingByToken({
        token: booking.manageToken,
        expectedUpdatedAt: staleTime,
      })
    ).rejects.toThrow(OptimisticConcurrencyError);
  });
});
