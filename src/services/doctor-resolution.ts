// BRD-043 US-104 (P0, Sprint 1): the single shared "who is the clinic's
// doctor for this request" resolver.
//
// Before this fix, 5 call sites each carried their own copy of:
//   staffProfile.findFirst({ user_id, clinic_id }) ?? staffProfile.findFirst({ clinic_id })
// — an unscoped fallback with no role filter and no ordering. The moment a
// clinic had more than one staff member and the caller wasn't a doctor
// themselves (an owner who isn't the practitioner, or a receptionist), this
// silently returned *some* StaffProfile row — doctor or receptionist,
// whichever Postgres happened to return first — and used its id as "the
// doctor" for booking, scheduling, practice-profile and clinical-template
// reads/writes. Solo clinics (exactly one doctor) never triggered the danger
// because the fallback and the "correct" answer were the same row; any
// clinic with 2+ staff (already reachable today — the existing invite flow
// has no seat limit yet, see US-503) could misattribute real data.
//
// "Is this StaffProfile a doctor" is answered by `specialty != null`, NOT
// User.role — this is the codebase's own established signal (see
// src/domain/organization.ts's memberRoleFromSpecialty, which every
// creation path already keys off: quick-setup, demo seeding, and
// accept-invitation all set `specialty` for doctors and leave it null for
// receptionists). User.role is NOT usable here: the "Managing Doctor"
// persona (a Practice Owner who is also the clinic's practitioner — the
// single most common real installation today) has User.role = "super_admin",
// never "doctor" — an earlier version of this fix filtered on User.role and
// broke every solo owner-doctor clinic (caught by demo-service.test.ts).
//
// Resolution order:
//   1. An explicit doctorId, if the caller named one — validated as an
//      active doctor of this clinic, never trusted blindly.
//   2. The caller's own StaffProfile, if they are themselves an active
//      doctor at this clinic (the common case — unchanged behavior for
//      every existing solo installation, including Managing Doctor).
//   3. Exactly one active doctor at the clinic and no explicit id: that
//      doctor is unambiguous, return them.
//   4. Zero active doctors: return null (existing "no doctor profile yet"
//      handling at every call site is unchanged).
//   5. Two or more active doctors and no way to disambiguate: refuse to
//      guess — throw AmbiguousDoctorError instead of picking one.

import prisma from "@/lib/prisma";

export class AmbiguousDoctorError extends Error {}

export async function resolveClinicDoctor(
  clinicId: string,
  callerUserId: string,
  explicitDoctorId?: string | null
) {
  const ACTIVE_DOCTOR = {
    is_active: true,
    membership_status: "active",
    specialty: { not: null },
  } as const;

  if (explicitDoctorId) {
    return prisma.staffProfile.findFirst({
      where: { id: explicitDoctorId, clinic_id: clinicId, ...ACTIVE_DOCTOR },
    });
  }

  const own = await prisma.staffProfile.findFirst({
    where: { user_id: callerUserId, clinic_id: clinicId, ...ACTIVE_DOCTOR },
  });
  if (own) return own;

  const activeDoctors = await prisma.staffProfile.findMany({
    where: { clinic_id: clinicId, ...ACTIVE_DOCTOR },
    take: 2, // only "one" vs "more than one" matters below
  });

  if (activeDoctors.length === 0) return null;
  if (activeDoctors.length === 1) return activeDoctors[0];
  throw new AmbiguousDoctorError(
    `Clinic ${clinicId} has more than one active doctor and none was specified — refusing to guess which one.`
  );
}
