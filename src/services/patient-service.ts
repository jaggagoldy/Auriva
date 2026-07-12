// Healthcare Profile services (APS-029/010). Identity MATCHING lives in
// identity-service.ts (resolveHealthcareProfile); this file owns the writes:
// creating a profile, resolving/creating the Account that logs in, and
// linking the two — the Registration and Contact/Verification "platform
// services" of APS-029 Part I A9, as plain functions for Sprint 1's scale.

import type { PrismaClient, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateHealthIdCandidate } from "@/domain/health-id";

export class PhoneNumberInUseError extends Error {}

type DbClient = PrismaClient | Prisma.TransactionClient;

// Only two ranks are live in Sprint 1; kept as a rank map (not a boolean) so
// the ladder in APS-029 Part I A5 (ABHA/Aadhaar/multi-source) can extend
// this without ever changing the comparison logic.
const VERIFICATION_RANK: Record<string, number> = {
  unverified: 0,
  phone_verified: 1,
  gov_id_verified: 2,
};

function higherVerification(a: string, b: string): string {
  return (VERIFICATION_RANK[a] ?? 0) >= (VERIFICATION_RANK[b] ?? 0) ? a : b;
}

/** Auriva Health ID, unique — retried on the rare collision (SQLite has no advisory locks, same class of problem as queue numbers). */
export async function generateUniqueHealthId(db: DbClient = prisma): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateHealthIdCandidate();
    const existing = await db.patientProfile.findUnique({ where: { health_id: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique Health ID after several attempts.");
}

export interface HealthcareProfileInput {
  full_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  blood_group?: string | null;
  phone?: string | null;
  registeredByClinicId?: string | null;
  /** Reception/emergency registration captures real facts up front (true, default); a bare OTP sign-up still needs AUTH-004 onboarding (false). */
  onboardingCompleted?: boolean;
  /** OTP sign-ups pass 'phone_verified' since the phone was just proven; reception-captured contacts are 'unverified' until someone actually logs in with that number. */
  verificationLevel?: string;
}

/**
 * Creates a new Healthcare Profile — with NO Auriva Account required
 * (user_id stays null). This is Phase 2's "Create Healthcare Profile" and
 * covers emergency registration too: every field but full_name is optional,
 * and full_name itself falls back to "Unknown Patient" rather than blocking
 * registration (APS-029 Part I A2's Unknown Patient state).
 *
 * Accepts an optional transaction client so callers with a wider atomic
 * flow (e.g. walk-in registration immediately assigning a queue number) can
 * make profile creation part of the same transaction — same convention the
 * pre-APS-029 findOrCreatePatientByPhone(db, ...) used.
 */
export async function createHealthcareProfile(data: HealthcareProfileInput, db: DbClient = prisma) {
  const health_id = await generateUniqueHealthId(db);
  const phone = data.phone?.trim() || null;
  const verificationLevel = data.verificationLevel ?? "unverified";

  return db.patientProfile.create({
    data: {
      full_name: data.full_name?.trim() || "Unknown Patient",
      gender: data.gender?.trim() || null,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
      guardian_name: data.guardian_name?.trim() || null,
      guardian_relation: data.guardian_relation?.trim() || null,
      blood_group: data.blood_group?.trim() || "Not recorded",
      health_id,
      registered_by_clinic_id: data.registeredByClinicId ?? null,
      verification_level: verificationLevel,
      onboarding_completed: data.onboardingCompleted ?? true,
      contacts: phone
        ? {
            create: [
              {
                type: "phone",
                value: phone,
                is_primary: true,
                verified_at: verificationLevel === "phone_verified" ? new Date() : null,
              },
            ],
          }
        : undefined,
    },
    include: { contacts: true },
  });
}

/**
 * Resolves the Auriva Account for an OTP login phone number, creating one if
 * this is the first time this phone has ever logged in. Guards the same
 * case the pre-APS-029 code guarded: a phone already registered under a
 * non-patient role never silently becomes a patient session.
 */
export async function findOrCreateAccountForPhone(phone: string) {
  const existing = await prisma.user.findFirst({ where: { phone_number: phone } });
  if (existing) {
    if (existing.role !== "patient") {
      throw new PhoneNumberInUseError("This phone number is registered with a non-patient role.");
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      role: "patient",
      phone_number: phone,
      email: `${phone.replace(/[^0-9]/g, "") || "newpatient"}@example.com`,
    },
  });
}

/**
 * Links an Account to a Healthcare Profile (APS-029 Part I A1's
 * AccountProfileLink) and, only if this Account doesn't already directly
 * own a DIFFERENT profile, claims this one as its primary (bumping
 * verification_level in the same write). `PatientProfile.user_id` stays
 * @unique — it is the "this is fundamentally my own identity" pointer, not
 * a general access grant, so an Account claims at most one profile through
 * it ever; every additional profile (family members) is reachable through
 * AccountProfileLink alone, never through user_id. A profile already
 * claimed by a DIFFERENT account is never reassigned here either way.
 */
export async function linkAccountToProfile(
  accountUserId: string,
  profileId: string,
  options: { makePrimary?: boolean } = {}
) {
  await prisma.accountProfileLink.upsert({
    where: {
      account_user_id_healthcare_profile_id: {
        account_user_id: accountUserId,
        healthcare_profile_id: profileId,
      },
    },
    create: {
      account_user_id: accountUserId,
      healthcare_profile_id: profileId,
      is_primary: options.makePrimary ?? false,
    },
    update: {},
  });

  const [profile, alreadyOwnedProfile] = await Promise.all([
    prisma.patientProfile.findUniqueOrThrow({ where: { id: profileId } }),
    prisma.patientProfile.findFirst({ where: { user_id: accountUserId } }),
  ]);
  if (!profile.user_id && !alreadyOwnedProfile) {
    await prisma.patientProfile.update({
      where: { id: profileId },
      data: {
        user_id: accountUserId,
        verification_level: higherVerification(profile.verification_level, "phone_verified"),
      },
    });
  }

  return prisma.patientProfile.findUniqueOrThrow({ where: { id: profileId }, include: { contacts: true } });
}

/** Completes AUTH-004 patient onboarding — the one-time profile fill-in after first OTP sign-up. */
export async function completePatientOnboarding(
  patientProfileId: string,
  data: { full_name: string; blood_group?: string; date_of_birth?: string; gender?: string }
) {
  return prisma.patientProfile.update({
    where: { id: patientProfileId },
    data: {
      full_name: data.full_name.trim(),
      blood_group: data.blood_group?.trim() || undefined,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      gender: data.gender?.trim() || undefined,
      onboarding_completed: true,
    },
  });
}

/**
 * General profile edits made anytime from PRO-001 — distinct from
 * completePatientOnboarding(), which is the one-time AUTH-004 step. Every
 * field is optional; only supplied fields are updated. Empty string clears a
 * field (so "Remove allergy" works), undefined leaves it untouched.
 */
export async function updatePatientProfile(
  patientProfileId: string,
  data: {
    allergies?: string;
    chronic_conditions?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }
) {
  return prisma.patientProfile.update({
    where: { id: patientProfileId },
    data: {
      allergies: data.allergies !== undefined ? data.allergies.trim() || null : undefined,
      chronic_conditions:
        data.chronic_conditions !== undefined ? data.chronic_conditions.trim() || null : undefined,
      emergency_contact_name:
        data.emergency_contact_name !== undefined ? data.emergency_contact_name.trim() || null : undefined,
      emergency_contact_phone:
        data.emergency_contact_phone !== undefined ? data.emergency_contact_phone.trim() || null : undefined,
    },
  });
}
