// Clinic (branch) management (Sprint 3 / OPS-001) — profile + the
// operational policy fields (working hours, slot duration, buffer,
// double-booking/walk-in policy, cancellation window, default fee).

import prisma from "@/lib/prisma";

export class ClinicInputError extends Error {}

export interface ClinicSettingsPatch {
  name?: string;
  address?: string;
  timezone?: string | null;
  working_days?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  accepting_bookings?: boolean;
  phone?: string | null;
  default_slot_duration_minutes?: number | null;
  buffer_minutes?: number | null;
  max_appointments_per_doctor_per_day?: number | null;
  allow_double_booking?: boolean;
  allow_walk_ins?: boolean;
  cancellation_window_hours?: number | null;
  default_consultation_fee?: number | null;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function updateClinicSettings(clinicId: string, patch: ClinicSettingsPatch) {
  if (patch.opens_at && !TIME_PATTERN.test(patch.opens_at)) {
    throw new ClinicInputError("opens_at must be in HH:MM 24-hour format.");
  }
  if (patch.closes_at && !TIME_PATTERN.test(patch.closes_at)) {
    throw new ClinicInputError("closes_at must be in HH:MM 24-hour format.");
  }
  if (
    patch.default_slot_duration_minutes !== undefined &&
    patch.default_slot_duration_minutes !== null &&
    patch.default_slot_duration_minutes <= 0
  ) {
    throw new ClinicInputError("Slot duration must be a positive number of minutes.");
  }

  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      name: patch.name !== undefined ? patch.name.trim() : undefined,
      address: patch.address !== undefined ? patch.address.trim() : undefined,
      timezone: patch.timezone !== undefined ? patch.timezone : undefined,
      working_days: patch.working_days !== undefined ? patch.working_days : undefined,
      opens_at: patch.opens_at !== undefined ? patch.opens_at : undefined,
      closes_at: patch.closes_at !== undefined ? patch.closes_at : undefined,
      accepting_bookings:
        patch.accepting_bookings !== undefined ? patch.accepting_bookings : undefined,
      phone: patch.phone !== undefined ? (patch.phone ? patch.phone.trim() : null) : undefined,
      default_slot_duration_minutes:
        patch.default_slot_duration_minutes !== undefined ? patch.default_slot_duration_minutes : undefined,
      buffer_minutes: patch.buffer_minutes !== undefined ? patch.buffer_minutes : undefined,
      max_appointments_per_doctor_per_day:
        patch.max_appointments_per_doctor_per_day !== undefined
          ? patch.max_appointments_per_doctor_per_day
          : undefined,
      allow_double_booking: patch.allow_double_booking !== undefined ? patch.allow_double_booking : undefined,
      allow_walk_ins: patch.allow_walk_ins !== undefined ? patch.allow_walk_ins : undefined,
      cancellation_window_hours:
        patch.cancellation_window_hours !== undefined ? patch.cancellation_window_hours : undefined,
      default_consultation_fee:
        patch.default_consultation_fee !== undefined ? patch.default_consultation_fee : undefined,
    },
  });
}
