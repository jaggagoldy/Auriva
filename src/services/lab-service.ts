// Lab orders (APS-042): order from the consult, result at the desk, flag
// back to the doctor. Status changes go through transitionLabOrder-style
// checks here only (same choke-point pattern as appointments/invoices).

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { LabOrderStatus, canTransitionLabOrder } from "@/domain/lab-order-status";
import { publishEvent } from "@/lib/events";

export class LabOrderNotFoundError extends Error {}
export class InvalidLabOrderTransitionError extends Error {}
export class InvalidLabOrderInputError extends Error {}

const LAB_ORDER_INCLUDE = {
  patient: { select: { id: true, full_name: true } },
  doctor: { select: { id: true, full_name: true, specialty: true } },
  appointment: { select: { id: true, scheduled_time: true } },
} satisfies Prisma.LabOrderInclude;

export async function createLabOrder(input: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  tests: { name: string }[];
  clinicalNote?: string | null;
}) {
  const tests = (input.tests ?? []).filter((t) => t.name?.trim());
  if (!tests.length) {
    throw new InvalidLabOrderInputError("A lab order needs at least one test.");
  }

  return prisma.labOrder.create({
    data: {
      clinic_id: input.clinicId,
      patient_id: input.patientId,
      doctor_id: input.doctorId,
      appointment_id: input.appointmentId ?? null,
      tests_json: JSON.stringify(tests),
      clinical_note: input.clinicalNote ?? null,
    },
    include: LAB_ORDER_INCLUDE,
  });
}

export interface LabOrderSearchFilters {
  clinicId: string;
  status?: string | null;
  patientId?: string | null;
  doctorId?: string | null;
}

export function listLabOrders(filters: LabOrderSearchFilters) {
  const where: Prisma.LabOrderWhereInput = { clinic_id: filters.clinicId };
  if (filters.status) where.status = filters.status;
  if (filters.patientId) where.patient_id = filters.patientId;
  if (filters.doctorId) where.doctor_id = filters.doctorId;

  return prisma.labOrder.findMany({
    where,
    orderBy: { ordered_at: "desc" },
    include: LAB_ORDER_INCLUDE,
  });
}

/** Sprint 2: a patient's own lab orders across every clinic — same "see your own record" principle as listInvoicesForPatient. */
export function listLabOrdersForPatient(patientId: string) {
  return prisma.labOrder.findMany({
    where: { patient_id: patientId },
    orderBy: { ordered_at: "desc" },
    include: LAB_ORDER_INCLUDE,
  });
}

/** Result entry closes the loop: ordered → resulted, values + notes filed. */
export async function enterLabResult(input: {
  labOrderId: string;
  clinicId: string;
  resultValues: { test: string; value: string; unit?: string; reference?: string }[];
  resultNotes?: string | null;
  resultedByUserId?: string | null;
}) {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.labOrder.findFirst({
      where: { id: input.labOrderId, clinic_id: input.clinicId },
    });
    if (!order) throw new LabOrderNotFoundError(`Lab order ${input.labOrderId} not found.`);

    const from = order.status as LabOrderStatus;
    if (!canTransitionLabOrder(from, "resulted")) {
      throw new InvalidLabOrderTransitionError(
        `Cannot enter a result on a "${from}" lab order.`
      );
    }
    if (!input.resultValues?.length && !input.resultNotes?.trim()) {
      throw new InvalidLabOrderInputError("A result needs values or notes.");
    }

    return tx.labOrder.update({
      where: { id: order.id },
      data: {
        status: "resulted",
        result_values_json: JSON.stringify(input.resultValues ?? []),
        result_notes: input.resultNotes ?? null,
        resulted_at: new Date(),
        resulted_by_user_id: input.resultedByUserId ?? null,
      },
      include: LAB_ORDER_INCLUDE,
    });
  });

  // PAT-1: notification trigger. Additive — enterLabResult's own
  // behavior/return value is unchanged; this only adds an event emission
  // this lifecycle point never had before.
  const clinic = await prisma.clinic.findUnique({
    where: { id: input.clinicId },
    select: { organization_id: true },
  });
  if (clinic) {
    await publishEvent({
      eventType: "lab_order.resulted",
      organizationId: clinic.organization_id,
      entityId: updated.id,
      correlationId: updated.appointment?.id ?? updated.id,
      actorId: input.resultedByUserId,
      payload: { labOrderId: updated.id },
    });
  }

  return updated;
}

export async function cancelLabOrder(labOrderId: string, clinicId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.labOrder.findFirst({
      where: { id: labOrderId, clinic_id: clinicId },
    });
    if (!order) throw new LabOrderNotFoundError(`Lab order ${labOrderId} not found.`);

    const from = order.status as LabOrderStatus;
    if (!canTransitionLabOrder(from, "cancelled")) {
      throw new InvalidLabOrderTransitionError(`Cannot cancel a "${from}" lab order.`);
    }

    return tx.labOrder.update({
      where: { id: order.id },
      data: { status: "cancelled" },
      include: LAB_ORDER_INCLUDE,
    });
  });
}
