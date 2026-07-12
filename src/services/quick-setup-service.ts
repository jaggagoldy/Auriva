// Milestone 1 (First Clinic Ready), Batch 3 — Quick Setup: the solo clinic
// owner's first two minutes. Mobile-first (no email, no address), OTP-verified,
// optimized for First Value Time. Two calls:
//
//   1. startQuickSetup  — fired at the "Verify" step: verifies the OTP and
//      atomically creates the owner account + organization + clinic + the
//      owner's own doctor profile + a session-ready owner. The clinic is born
//      named "My Clinic" with the owner's mobile backfilled as its contact
//      number, so there is never a broken half-onboarded state and the booking
//      page/Clinic-Ready work immediately even if the owner stops here.
//   2. configureQuickSetup — fired at the final "Create my clinic" step: names
//      the clinic and sets working hours, turning them into a real weekly
//      availability grid (reusing setAvailability) so slots are instantly
//      bookable.
//
// Reuses existing primitives everywhere: verifyOtpChallenge (real OTP),
// hashPassword (staff password hasher), setAvailability (the doctor weekly
// grid). It deliberately does NOT touch the existing email-based
// createOrganization (the admin/invite path) — this is the additive
// mobile-first path, not a replacement.

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { verifyOtpChallenge } from "@/services/otp-service";
import { setAvailability } from "@/services/availability-service";

export class QuickSetupError extends Error {}
// The mobile is already an Auriva account (owner or patient). We never silently
// merge — distinct 409-shaped case, mirroring EmailInUseError.
export class QuickSetupPhoneInUseError extends Error {}

const DEFAULT_CLINIC_NAME = "My Clinic";
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Quick Setup's working-day keys → DoctorAvailability.day_of_week (0=Sunday).
const DAY_TO_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export interface StartQuickSetupInput {
  ownerName: string;
  mobile: string;
  password: string;
  code: string;
}

/**
 * Verifies the OTP and creates the owner account + org + clinic + the owner's
 * doctor profile in one transaction. Returns the owner user (role super_admin)
 * so the route can open a session, plus the clinic and the owner's doctor
 * profile id.
 */
export async function startQuickSetup(input: StartQuickSetupInput) {
  const ownerName = input.ownerName?.trim();
  const mobile = input.mobile?.trim();
  const code = input.code?.trim();

  if (!ownerName || ownerName.length < 2) {
    throw new QuickSetupError("Please enter your name.");
  }
  if (!mobile || mobile.replace(/\D/g, "").length < 7) {
    throw new QuickSetupError("A valid mobile number is required.");
  }
  if (!input.password || input.password.length < 8) {
    throw new QuickSetupError("Password must be at least 8 characters.");
  }
  if (!code) {
    throw new QuickSetupError("Enter the verification code sent to your mobile.");
  }

  // Real OTP (single-use, attempt-capped). Consumed here on success.
  const otp = await verifyOtpChallenge(mobile, code);
  if (!otp.ok) {
    throw new QuickSetupError("Invalid or expired code. Request a new one.");
  }

  // The mobile is the owner's login identity (User.phone_number is unique). If
  // it already belongs to any account we stop rather than merge — a returning
  // owner should sign in; a number already used as a patient login is a known
  // MVP limitation surfaced honestly, not silently overwritten.
  const existing = await prisma.user.findUnique({ where: { phone_number: mobile } });
  if (existing) {
    throw new QuickSetupPhoneInUseError(
      "This mobile number already has an Auriva account. Please sign in instead."
    );
  }

  const password_hash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        role: "super_admin", // owns the org AND (via the profile below) practices in it
        phone_number: mobile,
        password_hash,
      },
    });

    const organization = await tx.organization.create({
      data: { name: DEFAULT_CLINIC_NAME, address: "", owner_user_id: owner.id },
    });

    const clinic = await tx.clinic.create({
      data: {
        name: DEFAULT_CLINIC_NAME,
        address: "",
        super_admin_id: owner.id,
        organization_id: organization.id,
        // Clinic Contact Number starts equal to the owner's verified mobile
        // (Product Office ruling) — a SEPARATE column from User.phone_number
        // (login), so it can later diverge to a reception/landline number
        // without ever touching authentication.
        phone: mobile,
      },
    });

    // The owner is also the practising doctor (solo). A StaffProfile makes them
    // a bookable doctor (appointments reference doctor_id = StaffProfile.id).
    const doctorProfile = await tx.staffProfile.create({
      data: { user_id: owner.id, clinic_id: clinic.id, full_name: ownerName },
    });

    await tx.organizationMember.create({
      data: { organization_id: organization.id, user_id: owner.id, role: "owner" },
    });

    await tx.auditLog.create({
      data: {
        organization_id: organization.id,
        actor_user_id: owner.id,
        action: "organization_created",
        detail: `${ownerName} — Quick Setup`,
      },
    });

    return { owner, organization, clinic, doctorProfile };
  });
}

export interface ConfigureQuickSetupInput {
  ownerUserId: string;
  clinicName: string;
  specialty?: string | null;
  workingDays: string[]; // e.g. ["mon","tue","wed","thu","fri","sat"]
  opensAt: string; // "09:00"
  closesAt: string; // "18:00"
}

/**
 * Names the clinic and sets working hours, converting them into a real weekly
 * DoctorAvailability grid so slots are immediately bookable. Scoped to the
 * owner's own clinic/doctor profile (resolved from the session's user id).
 */
export async function configureQuickSetup(input: ConfigureQuickSetupInput) {
  const clinicName = input.clinicName?.trim();
  if (!clinicName || clinicName.length < 2) {
    throw new QuickSetupError("Please give your clinic a name.");
  }
  if (!TIME_PATTERN.test(input.opensAt) || !TIME_PATTERN.test(input.closesAt)) {
    throw new QuickSetupError("Opening and closing times must be in HH:MM 24-hour format.");
  }
  if (input.opensAt >= input.closesAt) {
    throw new QuickSetupError("Opening time must be before closing time.");
  }
  const days = (input.workingDays ?? []).map((d) => d.trim().toLowerCase());
  const dayIndexes = days.map((d) => DAY_TO_INDEX[d]).filter((i) => i !== undefined);
  if (dayIndexes.length === 0) {
    throw new QuickSetupError("Choose at least one working day.");
  }

  const clinic = await prisma.clinic.findFirst({
    where: { super_admin_id: input.ownerUserId },
    orderBy: { name: "asc" },
  });
  const doctorProfile = await prisma.staffProfile.findFirst({
    where: { user_id: input.ownerUserId },
  });
  if (!clinic || !doctorProfile) {
    throw new QuickSetupError("No clinic found for this account. Start setup again.");
  }

  const workingDaysCsv = dayIndexes
    .slice()
    .sort((a, b) => a - b)
    .map((i) => Object.keys(DAY_TO_INDEX).find((k) => DAY_TO_INDEX[k] === i))
    .join(",");

  await prisma.$transaction([
    prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        name: clinicName,
        working_days: workingDaysCsv,
        opens_at: input.opensAt,
        closes_at: input.closesAt,
      },
    }),
    prisma.organization.update({
      where: { id: clinic.organization_id },
      data: { name: clinicName },
    }),
    prisma.staffProfile.update({
      where: { id: doctorProfile.id },
      data: { specialty: input.specialty?.trim() || null },
    }),
  ]);

  // Reuse the existing weekly-grid writer — one availability row per working
  // day, opening→closing. This is what makes slots appear on the booking page.
  await setAvailability(
    doctorProfile.id,
    dayIndexes.map((day_of_week) => ({
      day_of_week,
      start_time: input.opensAt,
      end_time: input.closesAt,
    }))
  );

  return {
    clinicId: clinic.id,
    doctorId: doctorProfile.id,
    bookingPath: `/book/${doctorProfile.id}`,
  };
}
