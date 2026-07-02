// Data access for clinics (the current physical-workspace records that the
// Organization abstraction in src/domain/organization.ts maps onto).

import prisma from "@/lib/prisma";

/** All clinics with their staff roster — backs GET /api/clinics. */
export function listClinicsWithStaff() {
  return prisma.clinic.findMany({
    include: {
      staffProfiles: {
        select: { id: true, full_name: true, specialty: true },
      },
    },
  });
}
