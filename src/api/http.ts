// Standard HTTP response builders for every route handler.
//
// The envelopes below are the EXISTING public contracts, centralized — not a
// redesign. One historical quirk is deliberately preserved (clients may depend
// on it; tracked in docs/technical-debt.md):
//   1. `apiError(400, "Not Found", ...)` — POST /api/appointments reports
//      missing patient/doctor/clinic with label "Not Found" but HTTP 400.
// (Note: `serverError()`'s `details` field, once always returned, is now
//  suppressed in production as of H2 — see its own comment below.)

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { logger } from "@/api/logger";
import { reportAlert } from "@/lib/alerts";
import {
  AppointmentNotFoundError,
  CancellationNotAllowedError,
  ClinicNotFoundError,
  DoctorProfileNotFoundError,
  DoctorSlotConflictError,
  DuplicateActiveAppointmentError,
  InvalidScheduleInputError,
  InvalidTransitionError,
  MaxAppointmentsExceededError,
  PatientProfileNotFoundError,
  RescheduleNotAllowedError,
} from "@/services/appointment-service";
import { QueueAppointmentNotFoundError } from "@/services/queue-service";
import {
  DoctorNotFoundError,
  HealthcareProfileNotFoundError,
  WalkInsDisabledError,
} from "@/services/walkin-service";
import { PhoneNumberInUseError } from "@/services/patient-service";
import {
  InvalidInvoiceTransitionError,
  InvalidPaymentError,
  InvoiceNotFoundError,
} from "@/services/billing-service";
import {
  InvalidLabOrderInputError,
  InvalidLabOrderTransitionError,
  LabOrderNotFoundError,
} from "@/services/lab-service";
import {
  ClinicNameConflictError,
  DuplicateActiveMemberError,
  EmailInUseError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvitationNotPendingError,
  SeatLimitReachedError,
  OnboardingInputError,
} from "@/services/onboarding-service";
import { AmbiguousDoctorError } from "@/services/doctor-resolution";
import {
  InvalidReassignmentError,
  MemberNotFoundError,
  OwnerProtectedError,
  ReconciliationRequiredError,
} from "@/services/membership-service";
import { PlanInputError } from "@/services/subscription-service";
import { ClinicInputError } from "@/services/clinic-service";
import {
  DepartmentInputError,
  DepartmentNameConflictError,
  DepartmentNotFoundError,
} from "@/services/department-service";
import { AvailabilityInputError } from "@/services/availability-service";
import { ServiceInputError, ServiceNotFoundError } from "@/services/service-catalog-service";
import { BookingsPausedError } from "@/services/booking-service";
import { QuickSetupError, QuickSetupPhoneInUseError } from "@/services/quick-setup-service";
import { ConsultationInputError } from "@/services/consultation-service";
import {
  InvalidReleaseTransitionError,
  ReleaseInputError,
  ReleaseNotFoundError,
} from "@/services/release-service";
import { SprintInputError, SprintNotFoundError } from "@/services/sprint-service";
import { EventHandlerNotFoundError, EventNotFoundError } from "@/services/event-log-service";
import { NotificationNotFoundError } from "@/services/notification-service";
import {
  AppointmentNotCompletedError,
  DuplicateReviewError,
  ReviewAppointmentNotFoundError,
  ReviewInputError,
} from "@/services/review-service";

/** Success envelope: the payload as-is (existing contract — no wrapper). */
export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Error envelope: `{ error: <label>, message }`. */
export function apiError(status: number, label: string, message: string) {
  return NextResponse.json({ error: label, message }, { status });
}

export const badRequest = (message: string) =>
  apiError(400, "Bad Request", message);
export const unauthorized = (message: string) =>
  apiError(401, "Unauthorized", message);
export const forbidden = (message: string) =>
  apiError(403, "Forbidden", message);
export const notFound = (message: string) =>
  apiError(404, "Not Found", message);
export const conflict = (message: string) =>
  apiError(409, "Conflict", message);
/**
 * OBS-2: available for semantically-distinct validation failures (the
 * request is well-formed JSON but fails a domain rule, as opposed to
 * `badRequest`'s malformed-request 400). No existing route's status code
 * changes to use this — that would be a contract change, out of scope for
 * standardization work. It exists so any *new* validation-shaped error has
 * a standard home instead of every service reaching for 400 by default.
 */
export const unprocessableEntity = (message: string) =>
  apiError(422, "Unprocessable Entity", message);
/** INF-5: readiness-check failure envelope (dependency, e.g. the database, unreachable). */
export const serviceUnavailable = (message: string) =>
  apiError(503, "Service Unavailable", message);

/** 429 envelope for SEC-5 rate limiting, with a `Retry-After` header (seconds). */
export function tooManyRequests(message: string, retryAfterSeconds: number) {
  const response = apiError(429, "Too Many Requests", message);
  response.headers.set("Retry-After", String(Math.ceil(retryAfterSeconds)));
  return response;
}

/**
 * Logs and returns the 500 envelope `{ error: "Internal Server Error" }`.
 *
 * H2 (security hardening): the internal error message is included as `details`
 * only OUTSIDE production. In production it is logged (full context, server-
 * side) but never returned — leaking raw exception text (Prisma internals,
 * stack-shaped messages, file paths) to a caller is an information-disclosure
 * finding. Non-production keeps `details` for developer ergonomics.
 */
export function serverError(context: string, error: unknown) {
  logger.error(context, error);
  record5xxAndMaybeAlert(context);
  const body: { error: string; details?: string } = { error: "Internal Server Error" };
  if (process.env.NODE_ENV !== "production") {
    body.details = (error as { message?: string } | null)?.message;
  }
  return NextResponse.json(body, { status: 500 });
}

// RG-001 alert trigger #3: a 5xx error-RATE spike (distinct from any single
// error). An in-memory rolling one-minute window — one alert when the count
// crosses the threshold, then reportAlert's own dedupe suppresses repeats. Same
// single-instance caveat as the rate limiter (documented); good enough to catch
// "production is broadly failing right now" for a single-instance pilot.
const FIVE_XX_WINDOW_MS = 60 * 1000;
const FIVE_XX_THRESHOLD = 10;
let fiveXxWindow = { start: Date.now(), count: 0 };

/** Test-only: reset the 5xx window. */
export function __reset5xxWindowForTests() {
  fiveXxWindow = { start: Date.now(), count: 0 };
}

function record5xxAndMaybeAlert(context: string) {
  const now = Date.now();
  if (now - fiveXxWindow.start > FIVE_XX_WINDOW_MS) {
    fiveXxWindow = { start: now, count: 0 };
  }
  fiveXxWindow.count += 1;
  if (fiveXxWindow.count === FIVE_XX_THRESHOLD) {
    void reportAlert({
      severity: "critical",
      title: "High 5xx error rate",
      detail: `${FIVE_XX_THRESHOLD}+ server errors in the last minute (latest context: ${context}).`,
    });
  }
}

/**
 * Maps known domain/service errors to their historical HTTP responses.
 * Returns null for unrecognized errors — callers fall through to
 * serverError(). Replaces the instanceof-chains previously duplicated
 * across five route files.
 */
export function mapDomainError(error: unknown): NextResponse | null {
  if (
    error instanceof AppointmentNotFoundError ||
    error instanceof QueueAppointmentNotFoundError ||
    error instanceof DoctorNotFoundError ||
    error instanceof HealthcareProfileNotFoundError
  ) {
    return notFound(error.message);
  }
  if (
    error instanceof InvalidTransitionError ||
    error instanceof DuplicateActiveAppointmentError ||
    error instanceof DoctorSlotConflictError ||
    error instanceof RescheduleNotAllowedError ||
    error instanceof MaxAppointmentsExceededError ||
    error instanceof CancellationNotAllowedError ||
    error instanceof WalkInsDisabledError ||
    error instanceof BookingsPausedError
  ) {
    return conflict(error.message);
  }
  if (error instanceof PhoneNumberInUseError) {
    return forbidden(error.message);
  }
  if (
    error instanceof PatientProfileNotFoundError ||
    error instanceof DoctorProfileNotFoundError ||
    error instanceof ClinicNotFoundError
  ) {
    // Historical quirk #1: label "Not Found", HTTP 400.
    return apiError(400, "Not Found", error.message);
  }
  if (error instanceof InvalidScheduleInputError) {
    return badRequest(error.message);
  }
  // Billing + lab (APS-041/042) — same status conventions as appointments.
  if (error instanceof InvoiceNotFoundError || error instanceof LabOrderNotFoundError) {
    return notFound(error.message);
  }
  if (
    error instanceof InvalidInvoiceTransitionError ||
    error instanceof InvalidLabOrderTransitionError
  ) {
    return conflict(error.message);
  }
  if (error instanceof InvalidPaymentError || error instanceof InvalidLabOrderInputError) {
    return badRequest(error.message);
  }
  // Onboarding (APS-044).
  if (error instanceof InvitationNotFoundError) {
    return notFound(error.message);
  }
  if (
    error instanceof EmailInUseError ||
    error instanceof InvitationNotPendingError ||
    error instanceof ClinicNameConflictError ||
    // BRD-043 Sprint 2: re-inviting an already-active member (US-205) and
    // exceeding the plan's seat ceiling (US-503) are both 409 conflicts —
    // the request is well-formed but conflicts with current team state.
    error instanceof DuplicateActiveMemberError ||
    error instanceof SeatLimitReachedError
  ) {
    return conflict(error.message);
  }
  // BRD-043 US-102 (Sprint 1): 72h invitation window, enforced server-side
  // regardless of what the acceptance page showed when it was opened.
  if (error instanceof InvitationExpiredError) {
    return conflict(error.message);
  }
  if (error instanceof OnboardingInputError) {
    return badRequest(error.message);
  }
  // BRD-043 US-104 (P0, Sprint 1): a clinic has 2+ active doctors and the
  // caller didn't say which one — refusing to guess is a 409, not a 500.
  if (error instanceof AmbiguousDoctorError) {
    return conflict(error.message);
  }
  // BRD-043 Sprint 4: membership lifecycle.
  if (error instanceof OwnerProtectedError) {
    return forbidden(error.message);
  }
  if (error instanceof MemberNotFoundError) {
    return notFound(error.message);
  }
  if (error instanceof InvalidReassignmentError || error instanceof PlanInputError) {
    return badRequest(error.message);
  }
  // Archive blocked until every conflict is reassigned — 409 carrying the
  // conflict list so the UI can render the reconciliation dialog even if the
  // POST was reached without a prior conflict-check.
  if (error instanceof ReconciliationRequiredError) {
    return NextResponse.json(
      { error: "Conflict", message: error.message, conflicts: error.conflicts },
      { status: 409 }
    );
  }
  // Sprint 3 (OPS-001): organization/clinic/department/availability config.
  if (error instanceof DepartmentNotFoundError) {
    return notFound(error.message);
  }
  // DATA-2/3: a duplicate-name conflict, distinct from DepartmentInputError's
  // 400-shaped cases below.
  if (error instanceof DepartmentNameConflictError) {
    return conflict(error.message);
  }
  if (
    error instanceof ClinicInputError ||
    error instanceof DepartmentInputError ||
    error instanceof AvailabilityInputError ||
    error instanceof ServiceInputError
  ) {
    return badRequest(error.message);
  }
  // Milestone 1: Treatments & Services catalog — a treatment from another
  // clinic is indistinguishable from a non-existent one (hide-existence).
  if (error instanceof ServiceNotFoundError) {
    return notFound(error.message);
  }
  // Milestone 1 Batch 3: Quick Setup — validation vs. phone-already-registered.
  if (error instanceof QuickSetupPhoneInUseError) {
    return conflict(error.message);
  }
  if (error instanceof QuickSetupError) {
    return badRequest(error.message);
  }
  // Milestone 1 Batch 5: solo consultation flow input errors.
  if (error instanceof ConsultationInputError) {
    return badRequest(error.message);
  }
  // APS-036: Release Management.
  if (error instanceof ReleaseNotFoundError || error instanceof SprintNotFoundError) {
    return notFound(error.message);
  }
  if (error instanceof InvalidReleaseTransitionError) {
    return conflict(error.message);
  }
  if (error instanceof ReleaseInputError || error instanceof SprintInputError) {
    return badRequest(error.message);
  }
  // OBS-2: previously handled by a duplicate instanceof-chain in each of the
  // three /api/organizations/[id]/events* routes — centralized here like
  // every other domain error, same status/message, zero behavior change.
  if (error instanceof EventNotFoundError || error instanceof EventHandlerNotFoundError) {
    return notFound(error.message);
  }
  // PAT-1 (Release 1.2 Sprint 1): mark-notification-read on a notification
  // that doesn't belong to the caller — same hide-existence convention as
  // every other cross-identity check (DATA-3).
  if (error instanceof NotificationNotFoundError) {
    return notFound(error.message);
  }
  // PAT-2: the appointment doesn't exist, or doesn't belong to the caller —
  // same hide-existence convention as everywhere else (DATA-3).
  if (error instanceof ReviewAppointmentNotFoundError) {
    return notFound(error.message);
  }
  if (error instanceof AppointmentNotCompletedError || error instanceof DuplicateReviewError) {
    return conflict(error.message);
  }
  if (error instanceof ReviewInputError) {
    return badRequest(error.message);
  }
  // DATA-2: a catch-all for any Prisma unique-constraint violation (P2002)
  // not already mapped to a more specific domain error above — using the
  // uniqueness the schema already enforces (e.g. User.phone_number,
  // PatientProfile.health_id, Invoice's [clinic_id, invoice_number]), just
  // surfaced as a clean 409 instead of falling through to serverError()'s
  // generic 500 with a raw Prisma error message.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = error.meta?.target;
    const field = Array.isArray(target) ? target.join(", ") : "value";
    return conflict(`A record with this ${field} already exists.`);
  }
  return null;
}
