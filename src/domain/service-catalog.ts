// M3A Revenue Foundation — the single source of truth for the service-catalog
// enums (mirrors domain/appointment-status.ts and domain/invoice-status.ts).
// Pure domain: no Prisma, no Next. Both the schema (defaults) and the service
// layer (Checkpoint 2) validate against these.

export const SERVICE_CATEGORIES = [
  "Consultation",
  "Procedure",
  "Lab",
  "Radiology",
  "Vaccination",
  "Injection",
  "Therapy",
  "Consumable",
  "Administrative",
  "Package",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function isServiceCategory(value: string): value is ServiceCategory {
  return (SERVICE_CATEGORIES as readonly string[]).includes(value);
}

// A service is either a clinical act (doctor-added) or a financial charge
// (reception-added). `kind` drives who may add a ServiceEvent of this service —
// enforced at the service layer in Checkpoint 2, not here.
export const SERVICE_KINDS = ["clinical", "financial"] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export function isServiceKind(value: string): value is ServiceKind {
  return (SERVICE_KINDS as readonly string[]).includes(value);
}

/** The staff role permitted to add a ServiceEvent of a given kind. */
export const KIND_ADDED_BY_ROLE: Record<ServiceKind, "doctor" | "reception"> = {
  clinical: "doctor",
  financial: "reception",
};
