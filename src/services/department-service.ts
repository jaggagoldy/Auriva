// Department management (Sprint 3 / OPS-001). A department groups staff
// within an organization — org-wide (clinic_id null) or scoped to one
// branch. Deliberately minimal: no separate permission model, just
// organizing + default pricing.

import prisma from "@/lib/prisma";

export class DepartmentNotFoundError extends Error {}
export class DepartmentInputError extends Error {}
// DATA-2/3: a distinct class from DepartmentInputError (a 400-shaped
// malformed-request case) — a duplicate name is a 409-shaped conflict,
// mirroring the existing EmailInUseError/InvitationNotPendingError
// convention (a dedicated class per semantic error category within one
// service file, not a generic catch-all).
export class DepartmentNameConflictError extends Error {}

export function listDepartments(organizationId: string) {
  return prisma.department.findMany({
    where: { organization_id: organizationId },
    orderBy: { name: "asc" },
    include: {
      clinic: { select: { id: true, name: true } },
      headStaff: { select: { id: true, full_name: true } },
      members: { select: { id: true, full_name: true, is_active: true } },
    },
  });
}

export async function createDepartment(input: {
  organizationId: string;
  clinicId?: string | null;
  name: string;
  defaultConsultationFee?: number | null;
}) {
  const name = input.name?.trim();
  if (!name) throw new DepartmentInputError("A department name is required.");

  if (input.clinicId) {
    const clinic = await prisma.clinic.findFirst({
      where: { id: input.clinicId, organization_id: input.organizationId },
    });
    if (!clinic) throw new DepartmentInputError("That clinic does not belong to this organization.");
  }

  // DATA-2: no DB constraint backs this (no schema change this sprint) — an
  // application-level duplicate-creation guard, same org, same name.
  const duplicate = await prisma.department.findFirst({
    where: { organization_id: input.organizationId, name },
  });
  if (duplicate) {
    throw new DepartmentNameConflictError(`A department named "${name}" already exists in this organization.`);
  }

  return prisma.department.create({
    data: {
      organization_id: input.organizationId,
      clinic_id: input.clinicId ?? null,
      name,
      default_consultation_fee: input.defaultConsultationFee ?? null,
    },
    include: { clinic: { select: { id: true, name: true } }, headStaff: true, members: true },
  });
}

export async function updateDepartment(
  departmentId: string,
  organizationId: string,
  patch: { name?: string; headStaffId?: string | null; defaultConsultationFee?: number | null }
) {
  const existing = await prisma.department.findFirst({
    where: { id: departmentId, organization_id: organizationId },
  });
  if (!existing) throw new DepartmentNotFoundError("Department not found in this organization.");

  return prisma.department.update({
    where: { id: departmentId },
    data: {
      name: patch.name !== undefined ? patch.name.trim() : undefined,
      head_staff_id: patch.headStaffId !== undefined ? patch.headStaffId : undefined,
      default_consultation_fee:
        patch.defaultConsultationFee !== undefined ? patch.defaultConsultationFee : undefined,
    },
    include: { clinic: { select: { id: true, name: true } }, headStaff: true, members: true },
  });
}

/** Assigns (or clears, with null) a staff member's department. */
export async function assignStaffDepartment(input: {
  organizationId: string;
  staffProfileId: string;
  departmentId: string | null;
}) {
  const staff = await prisma.staffProfile.findUnique({
    where: { id: input.staffProfileId },
    include: { clinic: true },
  });
  if (!staff || staff.clinic.organization_id !== input.organizationId) {
    throw new DepartmentNotFoundError("Staff member not found in this organization.");
  }
  if (input.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, organization_id: input.organizationId },
    });
    if (!dept) throw new DepartmentNotFoundError("Department not found in this organization.");
  }

  return prisma.staffProfile.update({
    where: { id: input.staffProfileId },
    data: { department_id: input.departmentId },
  });
}
