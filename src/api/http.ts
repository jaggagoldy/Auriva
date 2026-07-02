// Standard HTTP response builders for every route handler.
//
// The envelopes below are the EXISTING public contracts, centralized — not a
// redesign. Two historical quirks are deliberately preserved (clients may
// depend on them; changing them is tracked in docs/technical-debt.md):
//   1. `apiError(400, "Not Found", ...)` — POST /api/appointments reports
//      missing patient/doctor/clinic with label "Not Found" but HTTP 400.
//   2. `serverError()` exposes the internal error message as `details`.

import { NextResponse } from "next/server";
import { logger } from "@/api/logger";
import {
  AppointmentNotFoundError,
  ClinicNotFoundError,
  DoctorProfileNotFoundError,
  DuplicateActiveAppointmentError,
  InvalidScheduleInputError,
  InvalidTransitionError,
  PatientProfileNotFoundError,
} from "@/services/appointment-service";
import { QueueAppointmentNotFoundError } from "@/services/queue-service";
import { DoctorNotFoundError } from "@/services/walkin-service";
import { PhoneNumberInUseError } from "@/services/patient-service";

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
 * Logs and returns the historical 500 envelope
 * `{ error: "Internal Server Error", details: <error.message> }`.
 * (`details` is omitted when the thrown value has no message — matching the
 * previous `error.message` access on `any`.)
 */
export function serverError(context: string, error: unknown) {
  logger.error(context, error);
  return NextResponse.json(
    {
      error: "Internal Server Error",
      details: (error as { message?: string } | null)?.message,
    },
    { status: 500 }
  );
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
    error instanceof DoctorNotFoundError
  ) {
    return notFound(error.message);
  }
  if (
    error instanceof InvalidTransitionError ||
    error instanceof DuplicateActiveAppointmentError
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
  return null;
}
