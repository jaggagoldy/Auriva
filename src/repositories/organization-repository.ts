// Data access for the Organization abstraction. Today this reads the
// existing Clinic/StaffProfile rows; when dedicated Organization tables
// arrive, only this file (and the service mapping) changes.

import prisma from "@/lib/prisma";

export const ORGANIZATION_SOURCE_INCLUDE = {
  staffProfiles: {
    include: {
      user: { select: { id: true } },
    },
  },
} as const;

/** A clinic row with everything needed to map it to an Organization + members. */
export function findClinicForOrganization(clinicId: string) {
  return prisma.clinic.findUnique({
    where: { id: clinicId },
    include: ORGANIZATION_SOURCE_INCLUDE,
  });
}

/** Clinics owned by a user — today's stand-in for "organizations I belong to as owner". */
export function listClinicsOwnedBy(userId: string) {
  return prisma.clinic.findMany({
    where: { super_admin_id: userId },
    orderBy: { name: "asc" },
    include: ORGANIZATION_SOURCE_INCLUDE,
  });
}

/** The staff profile linking a user to a clinic, if any. */
export function findStaffProfileInClinic(userId: string, clinicId: string) {
  return prisma.staffProfile.findFirst({
    where: { user_id: userId, clinic_id: clinicId },
  });
}
