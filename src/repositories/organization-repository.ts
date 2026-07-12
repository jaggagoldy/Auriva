// Data access for the (now real, Sprint 3) Organization entity.

import prisma from "@/lib/prisma";

export const ORGANIZATION_INCLUDE = {
  clinics: true,
  members: true,
} as const;

export function findOrganization(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    include: ORGANIZATION_INCLUDE,
  });
}

/** Organizations a user owns. */
export function listOrganizationsOwnedBy(userId: string) {
  return prisma.organization.findMany({
    where: { owner_user_id: userId },
    orderBy: { name: "asc" },
    include: ORGANIZATION_INCLUDE,
  });
}
