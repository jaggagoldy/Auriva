import { randomUUID } from "crypto";
import { BookingChannel, VisitType, PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createHealthcareProfile } from "@/services/patient-service";
import { scheduleAppointment, DoctorProfileNotFoundError } from "@/services/appointment-service";
import { getBookableSlots, DaySlots } from "@/services/availability-service";

export class PublicClinicNotFoundError extends Error {}
export class PublicBookingsPausedError extends Error {}

export interface PublicClinicDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
  bio: string | null;
  years_experience: number | null;
  languages: string | null;
  qualifications: string | null;
  photo_url: string | null;
  consultation_fee: number | null;
}

export interface PublicClinicServiceItem {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string;
}

export interface PublicClinicProfile {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  about: string | null;
  opens_at: string | null;
  closes_at: string | null;
  working_days: string | null;
  accepting_bookings: boolean;
  latitude: number | null;
  longitude: number | null;
  doctors: PublicClinicDoctor[];
  services: PublicClinicServiceItem[];
}

export interface CreatePublicBookingInput {
  clinicId: string;
  doctorId: string;
  scheduledTime: string;
  patientName: string;
  patientPhone: string;
  notes?: string;
  serviceId?: string;
  bookingChannel?: BookingChannel;
}

export interface CreatePublicBookingResult {
  appointmentId: string;
  scheduledTime: Date;
  status: string;
  manageToken: string;
  isNewPatient: boolean;
  patient: { health_id: string; full_name: string };
  doctorName: string;
  clinicName: string;
}

/**
 * Resolves a clinic's public profile by its unique URL slug (or UUID fallback).
 * Returns public-facing clinic metadata, doctor directory, and service catalog.
 */
export async function getPublicClinicBySlug(slugOrId: string): Promise<PublicClinicProfile> {
  const clinic = await prisma.clinic.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
    },
    include: {
      staffProfiles: {
        where: {
          is_active: true,
          membership_status: "active",
          specialty: { not: null }, // Doctors carry a non-null specialty in Auriva
        },
        select: {
          id: true,
          full_name: true,
          specialty: true,
          bio: true,
          years_experience: true,
          languages: true,
          qualifications: true,
          photo_url: true,
          consultation_fee: true,
        },
      },
      services: {
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          duration_minutes: true,
          price: true,
          category: true,
        },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  if (!clinic) {
    throw new PublicClinicNotFoundError(`Clinic '${slugOrId}' was not found.`);
  }

  return {
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    address: clinic.address,
    phone: clinic.phone,
    about: clinic.about,
    opens_at: clinic.opens_at,
    closes_at: clinic.closes_at,
    working_days: clinic.working_days,
    accepting_bookings: clinic.accepting_bookings && clinic.online_booking_enabled,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
    doctors: clinic.staffProfiles,
    services: clinic.services,
  };
}

/**
 * Calculates real bookable slots for a doctor across the next N days.
 */
export function getPublicDoctorSlots(doctorId: string, days = 7): Promise<DaySlots[]> {
  return getBookableSlots(doctorId, { days });
}

/**
 * Creates an unauthenticated public patient online booking with automated
 * duplicate patient profile detection, manage_token assignment, and event logging.
 */
export async function createPublicBooking(
  input: CreatePublicBookingInput
): Promise<CreatePublicBookingResult> {
  const name = input.patientName.trim();
  const phone = input.patientPhone.trim();

  const doctor = await prisma.staffProfile.findUnique({
    where: { id: input.doctorId },
    include: { clinic: true },
  });

  if (!doctor || doctor.clinic_id !== input.clinicId) {
    throw new DoctorProfileNotFoundError("Doctor was not found in this clinic.");
  }

  if (!doctor.clinic.accepting_bookings || !doctor.clinic.online_booking_enabled) {
    throw new PublicBookingsPausedError(
      "Online bookings are paused for this clinic right now. Please call the clinic to book."
    );
  }

  // Duplicate detection by phone number
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
      onboardingCompleted: false,
      verificationLevel: "unverified",
    });
    isNewPatient = true;
  }

  const manageToken = randomUUID();

  const appointment = await scheduleAppointment({
    patientId: patientProfile.id,
    doctorId: doctor.id,
    clinicId: doctor.clinic.id,
    scheduledTime: input.scheduledTime,
    notes: input.notes,
    bookingChannel: input.bookingChannel ?? BookingChannel.DIRECT,
    visitType: VisitType.IN_PERSON,
    paymentStatus: PaymentStatus.PENDING,
    manageToken,
  });

  return {
    appointmentId: appointment.id,
    scheduledTime: appointment.scheduled_time,
    status: appointment.status,
    manageToken,
    isNewPatient,
    patient: { health_id: patientProfile.health_id, full_name: patientProfile.full_name },
    doctorName: doctor.full_name,
    clinicName: doctor.clinic.name,
  };
}
