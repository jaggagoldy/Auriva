// Milestone 1 (First Clinic Ready): "Treatments & Services" — the solo
// practice's core business object (frozen Release 1.2 UX v1.0). A treatment is
// a name + how long it takes + what it costs; those two facts feed the two
// downstream jobs — bookable-slot length and the payment amount — in later
// Milestone 1 batches. This service owns the catalog CRUD; it deliberately
// does NOT reach into scheduling or billing (those consume a Service, they
// don't define it), keeping the object single-purpose.
//
// Naming: the file is "service-catalog" (not "service-service") to avoid the
// obvious collision with the architectural word "service"; the domain object
// is `Service` and the product term is "Treatments & Services".

import prisma from "@/lib/prisma";

// A 400-shaped malformed-input error (blank name, non-positive duration, …).
export class ServiceInputError extends Error {}
// A 404-shaped "not in this clinic" error — same hide-existence convention as
// the rest of the codebase (a service from another clinic is indistinguishable
// from one that doesn't exist).
export class ServiceNotFoundError extends Error {}

export interface ServiceInput {
  name: string;
  durationMinutes: number;
  price: number;
  bufferMinutes?: number | null;
  sortOrder?: number;
}

export interface ServicePatch {
  name?: string;
  durationMinutes?: number;
  price?: number;
  bufferMinutes?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

/** Validates the money/time facts shared by create and update. `partial`
 * skips required-field checks so an update can touch one field at a time. */
function validate(input: ServicePatch, partial: boolean) {
  if (!partial || input.name !== undefined) {
    if (!input.name || !input.name.trim()) {
      throw new ServiceInputError("A treatment name is required.");
    }
  }
  if (!partial || input.durationMinutes !== undefined) {
    if (
      typeof input.durationMinutes !== "number" ||
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes <= 0
    ) {
      throw new ServiceInputError("Duration must be a whole number of minutes greater than zero.");
    }
  }
  if (!partial || input.price !== undefined) {
    if (typeof input.price !== "number" || !Number.isInteger(input.price) || input.price < 0) {
      throw new ServiceInputError("Price must be a whole number (₹) of zero or more.");
    }
  }
  // buffer is optional everywhere; only validate a supplied non-null value.
  if (input.bufferMinutes !== undefined && input.bufferMinutes !== null) {
    if (!Number.isInteger(input.bufferMinutes) || input.bufferMinutes < 0) {
      throw new ServiceInputError("Buffer must be a whole number of minutes of zero or more.");
    }
  }
}

/** Active treatments for a clinic, in display order — backs the Settings
 * "Treatments & Services" list and (later batches) the booking/consult pickers.
 * Pass `includeInactive` for the management view that shows archived rows. */
export function listServices(clinicId: string, { includeInactive = false } = {}) {
  return prisma.service.findMany({
    where: { clinic_id: clinicId, ...(includeInactive ? {} : { is_active: true }) },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
  });
}

export async function createService(clinicId: string, input: ServiceInput) {
  validate(input, false);
  return prisma.service.create({
    data: {
      clinic_id: clinicId,
      name: input.name.trim(),
      duration_minutes: input.durationMinutes,
      price: input.price,
      buffer_minutes: input.bufferMinutes ?? null,
      sort_order: input.sortOrder ?? 0,
    },
  });
}

export async function updateService(clinicId: string, serviceId: string, patch: ServicePatch) {
  validate(patch, true);
  // Ownership check first (scoped to the clinic) so one clinic can never
  // mutate another's catalog — mirrors updateDepartment's find-first guard.
  const existing = await prisma.service.findFirst({
    where: { id: serviceId, clinic_id: clinicId },
  });
  if (!existing) throw new ServiceNotFoundError("Treatment not found in this clinic.");

  return prisma.service.update({
    where: { id: serviceId },
    data: {
      name: patch.name !== undefined ? patch.name.trim() : undefined,
      duration_minutes: patch.durationMinutes !== undefined ? patch.durationMinutes : undefined,
      price: patch.price !== undefined ? patch.price : undefined,
      buffer_minutes: patch.bufferMinutes !== undefined ? patch.bufferMinutes : undefined,
      is_active: patch.isActive !== undefined ? patch.isActive : undefined,
      sort_order: patch.sortOrder !== undefined ? patch.sortOrder : undefined,
    },
  });
}

/** Archives a treatment (is_active=false) rather than hard-deleting, so any
 * future appointment/payment reference stays intact. Scoped to the clinic. */
export async function archiveService(clinicId: string, serviceId: string) {
  const existing = await prisma.service.findFirst({
    where: { id: serviceId, clinic_id: clinicId },
  });
  if (!existing) throw new ServiceNotFoundError("Treatment not found in this clinic.");
  return prisma.service.update({ where: { id: serviceId }, data: { is_active: false } });
}
