import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { createAppointmentEvent } from "@/repositories/appointment-repository";

export class FrontDeskOperationError extends Error {}

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  type: string;
  title: string;
  detail: string;
  actor?: string;
}

export interface FrontDeskQueueItem {
  id: string;
  patientName: string;
  patientPhone: string;
  healthId: string | null;
  doctorName: string;
  doctorId: string;
  specialty: string | null;
  scheduledTime: Date;
  status: string;
  bookingChannel: string;
  visitType: string;
  paymentStatus: PaymentStatus;
  priority: number;
  walkIn: boolean;
  notes: string | null;
  queueNumber: number | null;
  checkedInAt: Date | null;
}

/**
 * Fetches today's operational queue for Front Desk receptionists with multi-attribute filtering.
 */
export async function getFrontDeskQueue(
  clinicId: string,
  filter?: {
    doctorId?: string;
    status?: string;
    channel?: string;
    paymentStatus?: PaymentStatus;
    search?: string;
  }
): Promise<FrontDeskQueueItem[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const whereClause: Record<string, unknown> = {
    clinic_id: clinicId,
    scheduled_time: { gte: startOfDay, lte: endOfDay },
  };

  if (filter?.doctorId) whereClause.doctor_id = filter.doctorId;
  if (filter?.status) whereClause.status = filter.status;
  if (filter?.channel) whereClause.booking_channel = filter.channel;
  if (filter?.paymentStatus) whereClause.payment_status = filter.paymentStatus;

  if (filter?.search?.trim()) {
    const q = filter.search.trim().toLowerCase();
    whereClause.OR = [
      { patient: { full_name: { contains: q, mode: "insensitive" } } },
      { patient: { health_id: { contains: q, mode: "insensitive" } } },
    ];
  }

  const appts = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      patient: { select: { full_name: true, health_id: true, user: { select: { phone_number: true } } } },
      doctor: { select: { id: true, full_name: true, specialty: true } },
    },
    orderBy: [{ priority: "desc" }, { scheduled_time: "asc" }],
  });

  return appts.map((a) => ({
    id: a.id,
    patientName: a.patient.full_name,
    patientPhone: a.patient.user?.phone_number || "",
    healthId: a.patient.health_id,
    doctorName: a.doctor.full_name,
    doctorId: a.doctor.id,
    specialty: a.doctor.specialty,
    scheduledTime: a.scheduled_time,
    status: a.status,
    bookingChannel: a.booking_channel,
    visitType: a.visit_type,
    paymentStatus: a.payment_status,
    priority: a.priority,
    walkIn: a.walk_in,
    notes: a.notes,
    queueNumber: a.queue_number,
    checkedInAt: a.checked_in_at,
  }));
}

/**
 * Updates a patient's arrival / operational queue status at the front desk.
 */
export async function updateArrivalStatus(
  appointmentId: string,
  action: "check_in" | "mark_arrived" | "running_late" | "no_show",
  notes?: string
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { clinic: { select: { organization_id: true } } },
  });

  if (!appt) {
    throw new FrontDeskOperationError("Appointment not found.");
  }

  let newStatus = appt.status;
  let checkedInAt = appt.checked_in_at;

  if (action === "check_in" || action === "mark_arrived") {
    newStatus = "checked_in";
    checkedInAt = new Date();
  } else if (action === "no_show") {
    newStatus = "no_show";
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: newStatus,
        checked_in_at: checkedInAt,
        notes: notes ? `${appt.notes || ""}\n[FrontDesk]: ${notes}`.trim() : appt.notes,
      },
    });

    await createAppointmentEvent(tx, appointmentId, {
      type: action,
      from_status: appt.status,
      to_status: newStatus,
      note: notes || undefined,
    });

    return res;
  });

  // Publish Event
  await publishEvent({
    eventType: `scheduling.appointment.${action}`,
    organizationId: appt.clinic.organization_id,
    entityId: appt.id,
    correlationId: appt.id,
    payload: {
      appointmentId: appt.id,
      previousStatus: appt.status,
      newStatus: updated.status,
      action,
    },
  });

  return updated;
}

/**
 * Records payment settlement state at the front desk cashier counter.
 */
export async function recordPaymentSettlement(
  appointmentId: string,
  paymentStatus: PaymentStatus,
  notes?: string
) {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { clinic: { select: { organization_id: true } } },
  });

  if (!appt) {
    throw new FrontDeskOperationError("Appointment not found.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        payment_status: paymentStatus,
      },
    });

    await createAppointmentEvent(tx, appointmentId, {
      type: "payment_status_changed",
      from_status: appt.payment_status,
      to_status: paymentStatus,
      note: notes || undefined,
    });

    return res;
  });

  // Publish Event
  await publishEvent({
    eventType: "billing.payment.status_updated",
    organizationId: appt.clinic.organization_id,
    entityId: appt.id,
    correlationId: appt.id,
    payload: {
      appointmentId: appt.id,
      previousPaymentStatus: appt.payment_status,
      newPaymentStatus: paymentStatus,
    },
  });

  return updated;
}

/**
 * Retrieves the comprehensive chronological activity timeline for an appointment.
 */
export async function getAppointmentTimeline(appointmentId: string): Promise<TimelineEntry[]> {
  const apptEvents = await prisma.appointmentEvent.findMany({
    where: { appointment_id: appointmentId },
    orderBy: { created_at: "asc" },
  });

  const commLogs = await prisma.communicationLog.findMany({
    where: { appointment_id: appointmentId },
    orderBy: { created_at: "asc" },
  });

  const timeline: TimelineEntry[] = [];

  for (const ev of apptEvents) {
    timeline.push({
      id: ev.id,
      timestamp: ev.created_at,
      type: "APPOINTMENT_EVENT",
      title: ev.type.replace(/_/g, " ").toUpperCase(),
      detail: ev.note || `Status: ${ev.from_status || "new"} ➔ ${ev.to_status || "current"}`,
    });
  }

  for (const comm of commLogs) {
    timeline.push({
      id: comm.id,
      timestamp: comm.created_at,
      type: "COMMUNICATION_EVENT",
      title: `MESSAGE (${comm.channel})`,
      detail: `Template: ${comm.template_key}:${comm.template_version} | Status: ${comm.status}`,
    });
  }

  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return timeline;
}
