// Batch 3 (Booking Foundation): the public, unauthenticated booking flow — a
// patient books from a shared link (SMS signature, Instagram bio, Google
// listing) with no portal session and no phone call, the #1 solo-practitioner
// pain point (blueprint §3.2). This orchestrates existing primitives rather
// than reinventing them:
//   - duplicate detection reuses the phone Contact records createHealthcareProfile writes,
//   - inline patient creation reuses createHealthcareProfile (the same call reception's walk-in uses),
//   - slot/limit/status validation reuses scheduleAppointment verbatim.
// Spam/abuse protection is the caller's responsibility (rate limiting in the
// route) — the service assumes an already-throttled request.

import prisma from "@/lib/prisma";
import { createHealthcareProfile } from "@/services/patient-service";
import { scheduleAppointment, DoctorProfileNotFoundError } from "@/services/appointment-service";

// Milestone 1 Batch 2: the clinic has paused online (self-service) bookings
// (Clinic.accepting_bookings = false). Thrown ONLY from this public path — the
// staff/reception scheduleAppointment flow is intentionally never gated, so
// "please call the clinic to book" actually works.
export class BookingsPausedError extends Error {}

export interface PublicBookingInput {
  doctorId: string;
  scheduledTime: string;
  patientName: string;
  patientPhone: string;
  notes?: string;
}

export interface PublicBookingResult {
  appointment: Awaited<ReturnType<typeof scheduleAppointment>>;
  isNewPatient: boolean;
  patient: { health_id: string; full_name: string };
}

/**
 * Finds an existing Healthcare Profile for the given phone (duplicate
 * detection) or creates one inline, then schedules the appointment. Returns
 * whether a new profile was created so the confirmation can tell a returning
 * patient apart from a first-time one.
 */
export async function bookPublicAppointment(input: PublicBookingInput): Promise<PublicBookingResult> {
  const name = input.patientName.trim();
  const phone = input.patientPhone.trim();

  const doctor = await prisma.staffProfile.findUnique({
    where: { id: input.doctorId },
    include: { clinic: { select: { id: true, accepting_bookings: true } } },
  });
  if (!doctor) {
    throw new DoctorProfileNotFoundError("Doctor not found.");
  }

  // Clinic-wide "Accepting Bookings" switch — public self-service only. The
  // public read surface already hides slots when paused; this is the matching
  // server-side guard so a stale/replayed client can't book past a pause.
  if (!doctor.clinic.accepting_bookings) {
    throw new BookingsPausedError(
      "This clinic isn't accepting online bookings right now. Please call the clinic to book an appointment."
    );
  }

  // Duplicate detection: an existing profile carrying this exact phone as a
  // contact is reused rather than duplicated. When a number is shared by a
  // family, prefer the profile whose name matches; otherwise take the first
  // (public booking can't safely disambiguate further without a login — that
  // is exactly what the patient portal's profile switcher is for).
  const existing = await prisma.patientProfile.findMany({
    where: { contacts: { some: { type: "phone", value: phone } } },
  });

  let patientProfile;
  let isNewPatient = false;
  if (existing.length > 0) {
    patientProfile =
      existing.find((p) => p.full_name.trim().toLowerCase() === name.toLowerCase()) ?? existing[0];
  } else {
    patientProfile = await createHealthcareProfile({
      full_name: name,
      phone,
      registeredByClinicId: doctor.clinic.id,
      onboardingCompleted: false, // they never went through AUTH-004; portal fills it in on first login
      verificationLevel: "unverified", // the phone isn't proven until they OTP-login with it
    });
    isNewPatient = true;
  }

  const appointment = await scheduleAppointment({
    patientId: patientProfile.id,
    doctorId: doctor.id,
    clinicId: doctor.clinic.id,
    scheduledTime: input.scheduledTime,
    notes: input.notes,
  });

  return {
    appointment,
    isNewPatient,
    patient: { health_id: patientProfile.health_id, full_name: patientProfile.full_name },
  };
}
