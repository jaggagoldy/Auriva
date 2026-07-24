// Batch 4 (Personal Time Blocking): the behavior that matters is that a block
// actually removes bookable slots — otherwise a patient books over the
// doctor's lunch/leave. Integration test against the real DB.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import {
  setAvailability,
  getBookableSlots,
  createTimeBlock,
  listTimeBlocks,
  deleteTimeBlock,
  AvailabilityInputError,
} from "./availability-service";

const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  await prisma.doctorTimeBlock.deleteMany({ where: { doctor: { user_id: { in: userIds } } } });
  await prisma.doctorAvailability.deleteMany({ where: { doctor: { user_id: { in: userIds } } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function doctorWithFullWeek() {
  const { organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  orgIds.push(organization.id);
  userIds.push(user.id);
  // Available every day 09:00–17:00 so slots exist on any upcoming date.
  await setAvailability(
    staffProfile.id,
    Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, start_time: "09:00", end_time: "17:00" }))
  );
  return staffProfile;
}

// A Date at a fixed local hour, N days from today (always in the future).
function localDateInDays(daysAhead: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe("personal time blocking", () => {
  it("removes slots that overlap a block, keeping the rest", async () => {
    const doctor = await doctorWithFullWeek();

    const before = await getBookableSlots(doctor.id, { days: 3 });
    const totalBefore = before.reduce((n, day) => n + day.slots.length, 0);
    expect(totalBefore).toBeGreaterThan(0);

    // Block tomorrow 10:00–11:00.
    const start = localDateInDays(1, 10);
    const end = localDateInDays(1, 11);
    await createTimeBlock(doctor.id, { startAt: start.toISOString(), endAt: end.toISOString(), reason: "Lunch" });

    const after = await getBookableSlots(doctor.id, { days: 3 });
    const totalAfter = after.reduce((n, day) => n + day.slots.length, 0);
    expect(totalAfter).toBeLessThan(totalBefore);

    // No surviving slot starts inside the blocked window.
    const survivingInWindow = after
      .flatMap((day) => day.slots)
      .filter((iso) => {
        const t = new Date(iso).getTime();
        return t >= start.getTime() && t < end.getTime();
      });
    expect(survivingInWindow).toHaveLength(0);
  });

  it("lists and deletes a block (scoped to the doctor)", async () => {
    const doctor = await doctorWithFullWeek();
    const block = await createTimeBlock(doctor.id, {
      startAt: localDateInDays(2, 14).toISOString(),
      endAt: localDateInDays(2, 15).toISOString(),
    });

    expect(await listTimeBlocks(doctor.id)).toHaveLength(1);
    expect(await deleteTimeBlock("some-other-doctor", block.id)).toBe(false); // not theirs
    expect(await deleteTimeBlock(doctor.id, block.id)).toBe(true);
    expect(await listTimeBlocks(doctor.id)).toHaveLength(0);
  });

  it("rejects a block whose end is not after its start", async () => {
    const doctor = await doctorWithFullWeek();
    await expect(
      createTimeBlock(doctor.id, {
        startAt: localDateInDays(1, 12).toISOString(),
        endAt: localDateInDays(1, 12).toISOString(),
      })
    ).rejects.toThrow(AvailabilityInputError);
  });
});

describe("P2 — recurring breaks and daily patient cap", () => {
  const fullWeekWith = (extra: { break_start?: string; break_end?: string; max_patients?: number }) =>
    Array.from({ length: 7 }, (_, d) => ({ day_of_week: d, start_time: "09:00", end_time: "17:00", ...extra }));

  it("removes slots overlapping a recurring daily break", async () => {
    const doctor = await doctorWithFullWeek();
    await setAvailability(doctor.id, fullWeekWith({ break_start: "13:00", break_end: "14:00" }));

    // Tomorrow is fully in the future, so its slots aren't clipped by "now".
    const tomorrow = (await getBookableSlots(doctor.id, { days: 2 }))[1].slots;
    expect(tomorrow.length).toBeGreaterThan(0);

    const insideBreak = tomorrow.filter((iso) => {
      const dt = new Date(iso);
      const minutes = dt.getHours() * 60 + dt.getMinutes();
      return minutes >= 13 * 60 && minutes < 14 * 60;
    });
    expect(insideBreak).toHaveLength(0);
  });

  it("caps a day's bookable slots at max_patients", async () => {
    const doctor = await doctorWithFullWeek();
    await setAvailability(doctor.id, fullWeekWith({ max_patients: 3 }));

    const days = await getBookableSlots(doctor.id, { days: 3 });
    expect(days[1].slots).toHaveLength(3); // tomorrow, no bookings yet
    expect(days[2].slots).toHaveLength(3);
  });

  it("rejects a break that falls outside the working hours", async () => {
    const doctor = await doctorWithFullWeek();
    await expect(
      setAvailability(doctor.id, [
        { day_of_week: 1, start_time: "09:00", end_time: "17:00", break_start: "08:00", break_end: "09:30" },
      ])
    ).rejects.toThrow(AvailabilityInputError);
  });

  it("rejects a break missing one of its two times", async () => {
    const doctor = await doctorWithFullWeek();
    await expect(
      setAvailability(doctor.id, [
        { day_of_week: 1, start_time: "09:00", end_time: "17:00", break_start: "13:00" },
      ])
    ).rejects.toThrow(AvailabilityInputError);
  });
});
