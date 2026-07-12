// B3 (Release 1.2 Batch 2) — the reminder half of "booking confirmation +
// one appointment reminder." Booking confirmation is a real state change
// (an appointment was booked) and flows through the existing Event Platform
// exactly like every other trigger in src/lib/event-handlers.ts. A reminder
// is different: nothing state-changes when "3 hours before the visit"
// arrives — it's a time-based condition, not an event. Rather than force a
// fake EventLog row for something that didn't happen, this module finds
// appointments that have crossed into the reminder window and publishes a
// real "appointment.reminder_due" event for each — from that point on it's
// back on the existing Event Platform (idempotent, retried, audited) like
// everything else.

import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { logger } from "@/api/logger";

// Deliberately short and fixed, not configurable per clinic: this is
// intended to catch same-day and next-day bookings alike (a solo/physio
// practice books heavily close-in), not just next-day appointments. A
// longer, day-before window would silently skip every same-day booking.
const REMINDER_WINDOW_HOURS = 3;

// How often the sweep in src/instrumentation.ts runs. Exported so the
// interval and the query window stay defined in one place.
export const REMINDER_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Appointments whose scheduled_time has entered the reminder window and are
 * still actually happening (only "scheduled" — already-checked-in patients
 * don't need a reminder, cancelled/completed/no_show ones shouldn't get one).
 */
async function findAppointmentsDueForReminder(now: Date) {
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
  return prisma.appointment.findMany({
    where: {
      status: "scheduled",
      scheduled_time: { gte: now, lte: windowEnd },
    },
    select: { id: true, clinic: { select: { organization_id: true } } },
  });
}

/**
 * Publishes "appointment.reminder_due" for every appointment currently in
 * the window. Idempotency is NOT re-implemented here — publishEvent is
 * called with a deterministic eventId (`appointment-reminder-<id>`), so the
 * Event Platform's own EventLog upsert + per-handler COMPLETED-skip
 * (src/lib/events.ts) already makes repeat sweep ticks over the same
 * appointment a no-op after the first successful delivery. Failures here are
 * per-appointment and logged, not thrown — one bad lookup must not abort the
 * rest of the sweep.
 */
export async function runAppointmentReminderSweep(now: Date = new Date()): Promise<void> {
  const due = await findAppointmentsDueForReminder(now);
  for (const appointment of due) {
    try {
      await publishEvent({
        eventType: "appointment.reminder_due",
        organizationId: appointment.clinic.organization_id,
        entityId: appointment.id,
        correlationId: appointment.id,
        eventId: `appointment-reminder-${appointment.id}`,
        payload: { appointmentId: appointment.id },
      });
    } catch (error) {
      logger.error("[Reminder Sweep] Failed to publish reminder event", { appointmentId: appointment.id, error });
    }
  }
}
