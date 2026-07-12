// Find Care / Doctor Details ratings — real Review rows only, no synthetic
// counters. A clinic's displayed rating is derived by aggregating across its
// doctors' reviews rather than a second, parallel clinic-review model.
//
// PAT-2 (Release 1.2 Sprint 1) added createReview() — the write side this
// file never had. It reuses this file's existing read-side aggregation
// (getDoctorRatingSummary(s)/getClinicRatingSummaries below) with no
// changes to either.

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface RatingSummary {
  average: number | null;
  count: number;
}

export class ReviewAppointmentNotFoundError extends Error {}
export class AppointmentNotCompletedError extends Error {}
export class DuplicateReviewError extends Error {}
export class ReviewInputError extends Error {}

/**
 * The write side of patient feedback (PAT-2). A review is always tied to
 * one specific completed appointment — enforced by Review.appointment_id
 * being @unique, so a second attempt on the same appointment hits that
 * constraint (mapped to DuplicateReviewError below) rather than silently
 * creating a duplicate row.
 */
export async function createReview(input: {
  appointmentId: string;
  patientProfileId: string;
  rating: number;
  comment?: string | null;
}) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, patient_id: input.patientProfileId },
    select: { id: true, patient_id: true, doctor_id: true, status: true, clinic: { select: { organization_id: true } } },
  });
  // Hides both "doesn't exist" and "belongs to another patient" behind the
  // same 404 — the codebase-wide cross-identity convention (DATA-3).
  if (!appointment) {
    throw new ReviewAppointmentNotFoundError(`Appointment ${input.appointmentId} not found.`);
  }
  if (appointment.status !== "completed") {
    throw new AppointmentNotCompletedError("Only a completed appointment can be reviewed.");
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new ReviewInputError("Rating must be a whole number from 1 to 5.");
  }

  let review;
  try {
    review = await prisma.review.create({
      data: {
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DuplicateReviewError("You have already submitted a review for this appointment.");
    }
    throw error;
  }

  // organizationId is returned alongside the review (rather than
  // re-resolved by the caller via resolveOrganizationIdForPatientProfile's
  // registered-clinic provenance field) because the appointment's own
  // clinic is the precise, always-present organization this review
  // actually pertains to — for the caller's recordAudit() call.
  return { review, organizationId: appointment.clinic.organization_id };
}

export async function getDoctorRatingSummary(doctorId: string): Promise<RatingSummary> {
  const result = await prisma.review.aggregate({
    where: { doctor_id: doctorId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { average: result._avg.rating, count: result._count.rating };
}

/** Batch version for list screens (Find Care) — one query instead of N. */
export async function getDoctorRatingSummaries(
  doctorIds: string[]
): Promise<Record<string, RatingSummary>> {
  if (doctorIds.length === 0) return {};
  const rows = await prisma.review.groupBy({
    by: ["doctor_id"],
    where: { doctor_id: { in: doctorIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const summaries: Record<string, RatingSummary> = {};
  for (const row of rows) {
    summaries[row.doctor_id] = { average: row._avg.rating, count: row._count.rating };
  }
  return summaries;
}

export function listDoctorReviews(doctorId: string) {
  return prisma.review.findMany({
    where: { doctor_id: doctorId },
    orderBy: { created_at: "desc" },
    include: { patient: { select: { full_name: true } } },
  });
}

/** A clinic's rating is the average across every review of every doctor practicing there. */
export async function getClinicRatingSummaries(
  clinicIds: string[]
): Promise<Record<string, RatingSummary>> {
  if (clinicIds.length === 0) return {};
  const doctors = await prisma.staffProfile.findMany({
    where: { clinic_id: { in: clinicIds } },
    select: { id: true, clinic_id: true },
  });
  const doctorIds = doctors.map((d) => d.id);
  const doctorSummaries = await getDoctorRatingSummaries(doctorIds);

  const byClinic: Record<string, { total: number; count: number }> = {};
  for (const doctor of doctors) {
    const summary = doctorSummaries[doctor.id];
    if (!summary || summary.average == null) continue;
    const bucket = (byClinic[doctor.clinic_id] ??= { total: 0, count: 0 });
    bucket.total += summary.average * summary.count;
    bucket.count += summary.count;
  }

  const result: Record<string, RatingSummary> = {};
  for (const clinicId of clinicIds) {
    const bucket = byClinic[clinicId];
    result[clinicId] = bucket && bucket.count > 0
      ? { average: bucket.total / bucket.count, count: bucket.count }
      : { average: null, count: 0 };
  }
  return result;
}
