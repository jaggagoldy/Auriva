// P2 (Doctor Calendar): the schedule read model must group the clinic's booked
// appointments and the doctor's time blocks into the right local day, over an
// arbitrary window. Integration test against the real DB.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff, createTestPatient } from "@/test/fixtures";
import { scheduleAppointment } from "@/services/appointment-service";
import { createTimeBlock } from "@/services/availability-service";
import { getClinicSchedule, ScheduleInputError } from "@/services/clinic-schedule-service";

const orgIds: string[] = [];
const userIds: string[] = [];
const clinicIds: string[] = [];

afterAll(async () => {
  await prisma.doctorTimeBlock.deleteMany({ where: { doctor: { user_id: { in: userIds } } } });
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.patientProfile.deleteMany({ where: { registered_by_clinic_id: { in: clinicIds } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

function atDaysAhead(daysAhead: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("getClinicSchedule", () => {
  it("groups appointments and blocks into the right local day", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
    const { profile } = await createTestPatient(clinic.id);
    orgIds.push(organization.id);
    clinicIds.push(clinic.id);
    userIds.push(owner.id, user.id);

    const tomorrow = atDaysAhead(1, 10);
    const dayAfter = atDaysAhead(2, 11);

    await scheduleAppointment({
      patientId: profile.id, doctorId: staffProfile.id, clinicId: clinic.id,
      scheduledTime: tomorrow.toISOString(),
    });
    await scheduleAppointment({
      patientId: profile.id, doctorId: staffProfile.id, clinicId: clinic.id,
      scheduledTime: dayAfter.toISOString(),
    });
    // A break block tomorrow 13:00–14:00.
    await createTimeBlock(staffProfile.id, {
      startAt: atDaysAhead(1, 13).toISOString(),
      endAt: atDaysAhead(1, 14).toISOString(),
      reason: "Lunch",
    });

    const schedule = await getClinicSchedule(clinic.id, owner.id, dateKey(tomorrow), 3);

    expect(schedule).toHaveLength(3);
    expect(schedule[0].date).toBe(dateKey(tomorrow));

    // Day 0 (tomorrow): the 10:00 appointment + the lunch block.
    expect(schedule[0].appointments).toHaveLength(1);
    expect(schedule[0].appointments[0].patient_name).toBe(profile.full_name);
    expect(schedule[0].blocks).toHaveLength(1);
    expect(schedule[0].blocks[0].reason).toBe("Lunch");

    // Day 1 (day after): the 11:00 appointment, no blocks.
    expect(schedule[1].appointments).toHaveLength(1);
    expect(schedule[1].blocks).toHaveLength(0);

    // Day 2: empty.
    expect(schedule[2].appointments).toHaveLength(0);
    expect(schedule[2].blocks).toHaveLength(0);
  });

  it("rejects an invalid start date", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    orgIds.push(organization.id);
    clinicIds.push(clinic.id);
    userIds.push(owner.id);
    await expect(getClinicSchedule(clinic.id, owner.id, "not-a-date", 7)).rejects.toThrow(ScheduleInputError);
  });

  it("clamps days to a sane window", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    orgIds.push(organization.id);
    clinicIds.push(clinic.id);
    userIds.push(owner.id);
    const huge = await getClinicSchedule(clinic.id, owner.id, dateKey(new Date()), 999);
    expect(huge.length).toBe(42); // month view cap
    const zero = await getClinicSchedule(clinic.id, owner.id, dateKey(new Date()), 0);
    expect(zero.length).toBe(7); // falls back to a week
  });
});
