// Doctor (StaffProfile) profile read/write — the Doctor Workspace's
// Personal/Professional profile groups (APS-009/011). Kept separate from
// staff-repository.ts's findStaffProfiles() since profile editing is a
// distinct concern from the reception directory lookup.

import prisma from "@/lib/prisma";

export interface DoctorProfilePatch {
  bio?: string | null;
  years_experience?: number | null;
  languages?: string | null;
  qualifications?: string | null;
  registration_number?: string | null;
  consultation_fee?: number | null;
  specialty?: string | null;
}

export function getDoctorProfile(staffProfileId: string) {
  return prisma.staffProfile.findUnique({
    where: { id: staffProfileId },
    include: {
      clinic: { select: { id: true, name: true, address: true, organization_id: true } },
      user: { select: { id: true, email: true, phone_number: true } },
    },
  });
}

export async function updateDoctorProfile(
  staffProfileId: string,
  patch: DoctorProfilePatch
) {
  return prisma.staffProfile.update({
    where: { id: staffProfileId },
    data: {
      bio: patch.bio !== undefined ? patch.bio?.trim() || null : undefined,
      years_experience: patch.years_experience !== undefined ? patch.years_experience : undefined,
      languages: patch.languages !== undefined ? patch.languages?.trim() || null : undefined,
      qualifications:
        patch.qualifications !== undefined ? patch.qualifications?.trim() || null : undefined,
      registration_number:
        patch.registration_number !== undefined
          ? patch.registration_number?.trim() || null
          : undefined,
      consultation_fee: patch.consultation_fee !== undefined ? patch.consultation_fee : undefined,
      specialty: patch.specialty !== undefined ? patch.specialty?.trim() || null : undefined,
    },
    include: {
      clinic: { select: { id: true, name: true, address: true, organization_id: true } },
      user: { select: { id: true, email: true, phone_number: true } },
    },
  });
}
