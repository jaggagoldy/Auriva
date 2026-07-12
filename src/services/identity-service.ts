// Identity Resolution Service (APS-029/010 Part I A9, Part II §5) — replaces
// the single-key-match `findOrCreatePatientByPhone`. Ranked strategies,
// degrading gracefully. Hard invariant, stated once: this function NEVER
// merges, NEVER auto-selects across people, and NEVER blocks manual
// creation — it only ever suggests or exact-matches.

import prisma from "@/lib/prisma";
import type { PatientProfile, Contact } from "@prisma/client";

export type HealthcareProfileMatch = PatientProfile & { contacts: Contact[] };

export type IdentityResolution =
  | { kind: "exact"; profiles: HealthcareProfileMatch[] }
  | { kind: "suggestions"; profiles: HealthcareProfileMatch[] }
  | { kind: "none" };

const PROFILE_INCLUDE = { contacts: true } as const;

export async function resolveHealthcareProfile(input: {
  phone?: string | null;
  healthId?: string | null;
  name?: string | null;
  dob?: string | null;
}): Promise<IdentityResolution> {
  const phone = input.phone?.trim() || null;
  const healthId = input.healthId?.trim().toUpperCase() || null;
  const name = input.name?.trim() || null;
  const dob = input.dob?.trim() || null;

  // Tier 1: Auriva Health ID — direct, exact.
  if (healthId) {
    const profile = await prisma.patientProfile.findUnique({
      where: { health_id: healthId },
      include: PROFILE_INCLUDE,
    });
    if (profile) return { kind: "exact", profiles: [profile] };
  }

  // Tier 2: phone — exact, may resolve to MORE THAN ONE profile (family
  // members sharing a number). Never auto-picks between them; the caller
  // (reception UI, OTP login) is responsible for presenting a chooser.
  if (phone) {
    const contacts = await prisma.contact.findMany({
      where: { type: "phone", value: phone },
      include: { patientProfile: { include: PROFILE_INCLUDE } },
    });
    const profiles = dedupeById(contacts.map((c) => c.patientProfile));
    if (profiles.length > 0) return { kind: "exact", profiles };
  }

  // Tier 3/4: name (+ DOB when given) — fuzzy, suggestions only. Healthcare
  // safety rule: a false-positive auto-match is worse than a duplicate
  // profile, so this tier can never produce an "exact" result.
  if (name) {
    const where = dob
      ? { full_name: { contains: name }, date_of_birth: new Date(dob) }
      : { full_name: { contains: name } };
    const profiles = await prisma.patientProfile.findMany({
      where,
      include: PROFILE_INCLUDE,
      take: 5,
      orderBy: { full_name: "asc" },
    });
    if (profiles.length > 0) return { kind: "suggestions", profiles };
  }

  return { kind: "none" };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
