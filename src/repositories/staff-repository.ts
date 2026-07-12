// Data access for staff profiles (doctors and other clinic staff).

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface StaffSearchFilters {
  specialty?: string | null;
  clinicId?: string | null;
}

/** Staff profile search with clinic + user contact — backs GET /api/doctors. */
export function findStaffProfiles(filters: StaffSearchFilters) {
  const where: Prisma.StaffProfileWhereInput = {};
  if (filters.specialty) {
    where.specialty = { contains: filters.specialty };
  }
  if (filters.clinicId) {
    where.clinic_id = filters.clinicId;
  }

  return prisma.staffProfile.findMany({
    where,
    include: {
      clinic: {
        // Sprint 3: organization_id is required to match a membership row
        // correctly now that it's the real Organization, not the clinic's
        // own id — matching on clinic_id alone silently broke role lookup
        // for any clinic that isn't "the first" one in a multi-clinic org.
        select: {
          id: true,
          name: true,
          address: true,
          organization_id: true,
          is_verified: true,
          latitude: true,
          longitude: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          phone_number: true,
          // APS-040: membership rows are the role source of truth; the
          // caller picks the row matching the profile's clinic.
          memberships: { select: { organization_id: true, role: true } },
        },
      },
    },
  });
}
