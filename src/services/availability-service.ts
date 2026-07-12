// Doctor weekly availability (Sprint 3 / OPS-001) — the real working-hours
// grid that replaced the "Availability... coming soon" placeholder in the
// doctor schedule UI. The recurring weekly grid lives here alongside Batch 4's
// date-specific personal time blocks (DoctorTimeBlock): availability is the
// recurring "I normally work these hours", a time block is the one-off "but
// not this specific window". getBookableSlots honors both.

import prisma from "@/lib/prisma";
import { SLOT_OCCUPYING_STATUSES } from "@/services/appointment-service";

export class AvailabilityInputError extends Error {}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface AvailabilityEntry {
  day_of_week: number; // 0=Sunday .. 6=Saturday
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
}

export function getAvailability(doctorId: string) {
  return prisma.doctorAvailability.findMany({
    where: { doctor_id: doctorId },
    orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
  });
}

/**
 * Replaces a doctor's entire weekly grid in one shot — the natural shape
 * for a small, editable table (a handful of rows), avoiding a fussier
 * per-row create/update/delete API for what's fundamentally "here is my
 * week now".
 */
export async function setAvailability(doctorId: string, entries: AvailabilityEntry[]) {
  for (const entry of entries) {
    if (entry.day_of_week < 0 || entry.day_of_week > 6) {
      throw new AvailabilityInputError("day_of_week must be between 0 (Sunday) and 6 (Saturday).");
    }
    if (!TIME_PATTERN.test(entry.start_time) || !TIME_PATTERN.test(entry.end_time)) {
      throw new AvailabilityInputError("Times must be in HH:MM 24-hour format.");
    }
    if (entry.start_time >= entry.end_time) {
      throw new AvailabilityInputError("Start time must be before end time.");
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.doctorAvailability.deleteMany({ where: { doctor_id: doctorId } });
    if (entries.length === 0) return [];
    await tx.doctorAvailability.createMany({
      data: entries.map((e) => ({
        doctor_id: doctorId,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
      })),
    });
    return tx.doctorAvailability.findMany({
      where: { doctor_id: doctorId },
      orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
    });
  });
}

export interface DaySlots {
  date: string; // "YYYY-MM-DD"
  slots: string[]; // ISO datetimes, one per bookable slot
}

/**
 * Real bookable slots for the next `days` calendar days, derived from the
 * doctor's weekly DoctorAvailability grid, the clinic's slot duration, and
 * existing appointments — replacing the patient booking dialog's former
 * "pick any time, clinic confirms" raw datetime input. A day with no
 * DoctorAvailability row (doctor hasn't configured hours yet) comes back
 * with an empty slots array; the caller falls back to the old free-text
 * input for that specific doctor rather than treating it as an error.
 */
export async function getBookableSlots(
  doctorId: string,
  { days = 7 }: { days?: number } = {}
): Promise<DaySlots[]> {
  const doctor = await prisma.staffProfile.findUnique({
    where: { id: doctorId },
    include: {
      clinic: {
        select: {
          default_slot_duration_minutes: true,
          buffer_minutes: true,
          allow_double_booking: true,
        },
      },
    },
  });
  if (!doctor) return [];

  const durationMinutes = doctor.clinic.default_slot_duration_minutes ?? 15;
  const bufferMinutes = doctor.clinic.buffer_minutes ?? 0;
  const allowDoubleBooking = doctor.clinic.allow_double_booking;

  const availability = await prisma.doctorAvailability.findMany({
    where: { doctor_id: doctorId, is_active: true },
  });
  if (availability.length === 0) return [];
  const byDayOfWeek = new Map(availability.map((row) => [row.day_of_week, row]));

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + days);

  const booked = await prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
      scheduled_time: { gte: rangeStart, lt: rangeEnd },
      status: { in: SLOT_OCCUPYING_STATUSES },
    },
    select: { scheduled_time: true },
  });
  const bookedTimes = booked.map((b) => b.scheduled_time.getTime());

  const conflicts = (candidate: Date) => {
    if (allowDoubleBooking) return false;
    const windowMs = bufferMinutes * 60_000;
    return bookedTimes.some((t) => Math.abs(t - candidate.getTime()) <= windowMs);
  };

  // Batch 4 (Personal Time Blocking): any block overlapping the range hides
  // every slot it covers. A slot [candidate, candidate+duration) is blocked
  // when it overlaps [start_at, end_at) — half-open on both sides so a block
  // ending exactly when a slot starts does not remove that slot.
  const blocks = await prisma.doctorTimeBlock.findMany({
    where: { doctor_id: doctorId, end_at: { gt: rangeStart }, start_at: { lt: rangeEnd } },
    select: { start_at: true, end_at: true },
  });
  const blockedRanges = blocks.map((b) => [b.start_at.getTime(), b.end_at.getTime()] as const);

  const isBlocked = (candidate: Date) => {
    const slotStart = candidate.getTime();
    const slotEnd = slotStart + durationMinutes * 60_000;
    return blockedRanges.some(([start, end]) => slotStart < end && slotEnd > start);
  };

  const result: DaySlots[] = [];
  for (let offset = 0; offset < days; offset++) {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + offset);
    // Local Y-M-D, not toISOString() — that converts to UTC first and would
    // shift the calendar date by one in any non-UTC server timezone (this
    // platform's clinics default to Asia/Kolkata, UTC+5:30).
    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

    const window = byDayOfWeek.get(day.getDay());
    if (!window) {
      result.push({ date: dateKey, slots: [] });
      continue;
    }

    const [startHour, startMinute] = window.start_time.split(":").map(Number);
    const [endHour, endMinute] = window.end_time.split(":").map(Number);
    const dayStart = new Date(day);
    dayStart.setHours(startHour, startMinute, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    const slots: string[] = [];
    for (
      let candidate = new Date(dayStart);
      candidate.getTime() + durationMinutes * 60_000 <= dayEnd.getTime();
      candidate = new Date(candidate.getTime() + durationMinutes * 60_000)
    ) {
      if (candidate.getTime() <= now.getTime()) continue; // no slots in the past, incl. today
      if (conflicts(candidate)) continue;
      if (isBlocked(candidate)) continue; // personal time block (lunch, leave, ...)
      slots.push(candidate.toISOString());
    }
    result.push({ date: dateKey, slots });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Personal time blocks (Batch 4) — date-specific time off a doctor manages for
// themselves. CRUD is scoped to the owning doctor in every function so one
// doctor can never read or delete another's blocks.
// ---------------------------------------------------------------------------

export interface TimeBlockInput {
  startAt: string;
  endAt: string;
  reason?: string | null;
}

/** Upcoming and in-progress blocks for a doctor (past blocks are not useful UI). */
export function listTimeBlocks(doctorId: string) {
  return prisma.doctorTimeBlock.findMany({
    where: { doctor_id: doctorId, end_at: { gt: new Date() } },
    orderBy: { start_at: "asc" },
  });
}

export async function createTimeBlock(doctorId: string, input: TimeBlockInput) {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AvailabilityInputError("start_at and end_at must be valid date-times.");
  }
  if (end.getTime() <= start.getTime()) {
    throw new AvailabilityInputError("end_at must be after start_at.");
  }
  const reason = typeof input.reason === "string" && input.reason.trim() ? input.reason.trim() : null;
  return prisma.doctorTimeBlock.create({
    data: { doctor_id: doctorId, start_at: start, end_at: end, reason },
  });
}

/** Removes a block — scoped to the doctor. Returns false if it wasn't theirs / didn't exist. */
export async function deleteTimeBlock(doctorId: string, blockId: string) {
  const result = await prisma.doctorTimeBlock.deleteMany({
    where: { id: blockId, doctor_id: doctorId },
  });
  return result.count > 0;
}
