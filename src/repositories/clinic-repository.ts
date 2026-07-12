// Data access for clinics — the physical branches grouped under an
// Organization (Sprint 3 / OPS-001).

import prisma from "@/lib/prisma";

/**
 * Clinics within one organization, with their staff roster — backs
 * GET /api/clinics. Sprint 3 fix: this previously had NO where clause at
 * all and returned every clinic in the entire database (confirmed by
 * audit) — the workspace switcher was "all organizations on the platform,"
 * not "mine". Now properly scoped.
 */
export function listClinicsWithStaff(organizationId: string) {
  return prisma.clinic.findMany({
    where: { organization_id: organizationId },
    orderBy: { name: "asc" },
    include: {
      staffProfiles: {
        select: { id: true, full_name: true, specialty: true, is_active: true },
      },
    },
  });
}

/**
 * Every clinic on the platform, for the patient-facing Find Care directory —
 * deliberately unscoped by organization (a patient isn't a member of any
 * org), mirroring GET /api/doctors' existing open/cross-org pattern rather
 * than reusing listClinicsWithStaff's single-org scoping.
 */
export function listClinicsForDirectory() {
  return prisma.clinic.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      organization_id: true,
      is_verified: true,
      latitude: true,
      longitude: true,
      _count: { select: { staffProfiles: true } },
    },
  });
}
