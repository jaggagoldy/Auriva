// P2 (Doctor Calendar) — the read model behind the Day/Week/Month calendar.
// Range-queryable (unlike getTodayAppointments, which is today-only, and
// getBookableSlots, which is anchored at "now"): returns the clinic's booked
// appointments and the doctor's time blocks grouped by local calendar day for
// any window. Available-slot overlay + quick-block layer on top of this.

import prisma from "@/lib/prisma";

export class ScheduleInputError extends Error {}

export interface ScheduleAppointment {
  id: string;
  time: string; // ISO
  patient_name: string;
  status: string;
  walk_in: boolean;
  invoice_status: string | null;
}
export interface ScheduleBlock {
  id: string;
  start: string; // ISO
  end: string; // ISO
  reason: string | null;
}
export interface ScheduleDay {
  date: string; // "YYYY-MM-DD" (local)
  appointments: ScheduleAppointment[];
  blocks: ScheduleBlock[];
}

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The clinic's schedule over [startDate, startDate + days). `startDate` is a
 * local "YYYY-MM-DD"; days is clamped to [1, 42] (a month view is at most six
 * weeks). Reuses the same clinic-doctor resolution as the overview.
 */
export async function getClinicSchedule(
  clinicId: string,
  ownerUserId: string,
  startDate: string,
  days: number
): Promise<ScheduleDay[]> {
  const dayCount = Math.min(Math.max(Math.trunc(days) || 7, 1), 42);

  const rangeStart = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(rangeStart.getTime())) {
    throw new ScheduleInputError("start must be a valid YYYY-MM-DD date.");
  }
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + dayCount);

  const doctor =
    (await prisma.staffProfile.findFirst({ where: { user_id: ownerUserId, clinic_id: clinicId } })) ??
    (await prisma.staffProfile.findFirst({ where: { clinic_id: clinicId } }));

  const [appts, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: { clinic_id: clinicId, scheduled_time: { gte: rangeStart, lt: rangeEnd } },
      select: {
        id: true,
        scheduled_time: true,
        status: true,
        walk_in: true,
        patient: { select: { full_name: true } },
        invoice: { select: { status: true } },
      },
      orderBy: { scheduled_time: "asc" },
    }),
    doctor
      ? prisma.doctorTimeBlock.findMany({
          where: { doctor_id: doctor.id, end_at: { gt: rangeStart }, start_at: { lt: rangeEnd } },
          orderBy: { start_at: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const daysArr: ScheduleDay[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    daysArr.push({ date: localDateKey(d), appointments: [], blocks: [] });
  }
  const byDate = new Map(daysArr.map((d) => [d.date, d]));

  for (const a of appts) {
    const day = byDate.get(localDateKey(a.scheduled_time));
    if (!day) continue;
    day.appointments.push({
      id: a.id,
      time: a.scheduled_time.toISOString(),
      patient_name: a.patient?.full_name ?? "Patient",
      status: a.status,
      walk_in: a.walk_in,
      invoice_status: a.invoice?.status ?? null,
    });
  }

  // A block is attached to the day it starts (a full-day holiday is a single
  // day; multi-day blocks — rare — show on their start day for now).
  for (const b of blocks) {
    const day = byDate.get(localDateKey(b.start_at));
    if (day) day.blocks.push({ id: b.id, start: b.start_at.toISOString(), end: b.end_at.toISOString(), reason: b.reason });
  }

  return daysArr;
}
