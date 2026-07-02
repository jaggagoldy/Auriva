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
        select: { id: true, name: true, address: true },
      },
      user: {
        select: { id: true, email: true, phone_number: true },
      },
    },
  });
}
