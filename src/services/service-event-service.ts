// M3A Checkpoint 2 — the ServiceEvent lifecycle service. Domain-backed and
// isolated: it knows NOTHING about React/UI, billing screens, invoice printing,
// or payment collection. It answers only lifecycle questions —
//   • can this actor add this service? (permission-by-kind)
//   • is this a valid state transition?
//   • is a reason required?
// — and persists ServiceEvent rows. Invoice/line generation is the billing
// engine's job (Checkpoint 3), deliberately not here.

import prisma from "@/lib/prisma";
import {
  ServiceEventStatus,
  canTransitionServiceEvent,
  isReasonRequiredForTransition,
} from "@/domain/service-event-status";
import { ServiceKind, canActorAddKind, isServiceCategory, isServiceKind } from "@/domain/service-catalog";

export class ServiceEventNotFoundError extends Error {}
export class ServiceEventPermissionError extends Error {}
export class InvalidServiceEventTransitionError extends Error {}
export class ReasonRequiredError extends Error {}
export class InvalidServiceEventInputError extends Error {}

type ActorRole = "doctor" | "reception";

interface Actor {
  userId?: string | null;
  role: ActorRole;
}

interface AddServiceEventInput {
  clinicId: string;
  patientId: string;
  appointmentId: string;
  serviceId?: string | null; // catalog service → snapshotted; null → ad-hoc
  // ad-hoc fields (used only when serviceId is null):
  name?: string;
  category?: string;
  kind?: ServiceKind;
  unitPrice?: number;
  qty?: number;
}

/** Add a service event (status: draft). Enforces permission-by-kind. Snapshots
 *  the catalog (name/category/kind/price/version) for a catalog service, else
 *  records an ad-hoc event flagged `needs_catalog_review`. */
export async function addServiceEvent(input: AddServiceEventInput, actor: Actor) {
  const qty = input.qty ?? 1;
  if (qty < 1) throw new InvalidServiceEventInputError("qty must be at least 1.");

  let name: string;
  let category: string;
  let kind: ServiceKind;
  let unitPrice: number;
  let serviceVersion: number | null;

  if (input.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, clinic_id: input.clinicId },
    });
    if (!service) throw new ServiceEventNotFoundError(`Service ${input.serviceId} not found on this clinic.`);
    if (!isServiceKind(service.kind)) throw new InvalidServiceEventInputError("Service has an invalid kind.");
    name = service.name;
    category = service.category;
    kind = service.kind;
    unitPrice = service.price;
    serviceVersion = service.version;
  } else {
    if (!input.name?.trim() || input.unitPrice == null || !input.kind || !input.category) {
      throw new InvalidServiceEventInputError("An ad-hoc service needs name, category, kind, and unit price.");
    }
    if (!isServiceKind(input.kind)) throw new InvalidServiceEventInputError("Invalid service kind.");
    if (!isServiceCategory(input.category)) throw new InvalidServiceEventInputError("Invalid service category.");
    name = input.name.trim();
    category = input.category;
    kind = input.kind;
    unitPrice = input.unitPrice;
    serviceVersion = null;
  }

  // The core guard: doctor ⇒ clinical, reception ⇒ financial.
  if (!canActorAddKind(actor.role, kind)) {
    throw new ServiceEventPermissionError(`A ${actor.role} cannot add a ${kind} service.`);
  }

  return prisma.serviceEvent.create({
    data: {
      clinic_id: input.clinicId,
      patient_id: input.patientId,
      appointment_id: input.appointmentId,
      service_id: input.serviceId ?? null,
      service_version: serviceVersion,
      name,
      category,
      kind,
      unit_price: unitPrice,
      qty,
      amount: unitPrice * qty,
      status: "draft",
      needs_catalog_review: !input.serviceId,
      added_by_user_id: actor.userId ?? null,
      added_by_role: actor.role,
    },
  });
}

async function transition(id: string, to: ServiceEventStatus, reason?: string) {
  const event = await prisma.serviceEvent.findUnique({ where: { id } });
  if (!event) throw new ServiceEventNotFoundError(`Service event ${id} not found.`);
  const from = event.status as ServiceEventStatus;
  if (!canTransitionServiceEvent(from, to)) {
    throw new InvalidServiceEventTransitionError(`Cannot move a "${from}" service event to "${to}".`);
  }
  if (isReasonRequiredForTransition(from, to) && !reason?.trim()) {
    throw new ReasonRequiredError(`A reason is required to ${to} a service event.`);
  }
  return prisma.serviceEvent.update({
    where: { id },
    data: {
      status: to,
      ...(reason ? { reversal_reason: reason.trim() } : {}),
      ...(to === "finalized" ? { finalized_at: new Date() } : {}),
      ...(to === "removed" ? { removed_at: new Date() } : {}),
    },
  });
}

/** Remove a draft event (before finalize/payment). */
export function removeServiceEvent(id: string) {
  return transition(id, "removed");
}

/** Finalize a draft event (draft → finalized). The billing engine (C3) will
 *  call this during settlement; the primitive + guard live here. */
export function finalizeServiceEvent(id: string) {
  return transition(id, "finalized");
}

/** Reverse a finalized event (post-payment adjustment) — reason MANDATORY. */
export function reverseServiceEvent(id: string, reason: string) {
  return transition(id, "reversed", reason);
}

/** Draft + finalized events for an appointment (read). */
export function listServiceEventsForAppointment(appointmentId: string) {
  return prisma.serviceEvent.findMany({
    where: { appointment_id: appointmentId, status: { in: ["draft", "finalized"] } },
    orderBy: { added_at: "asc" },
  });
}
