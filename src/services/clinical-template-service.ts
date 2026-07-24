// P6 Clinical Templates — reusable consult notes (SOAP + advice / exercises /
// follow-up) a doctor drops into a visit. Owned per doctor within a clinic;
// clinic_id is stored so "share across the clinic" is a later flag, not a
// migration.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolveClinicDoctor as resolveDoctorShared } from "@/services/doctor-resolution";

export class ClinicalTemplateError extends Error {}

// BRD-043 US-104 (P0): clinical content (SOAP templates) is the most
// sensitive of the 5 call sites this fix touches — ambiguity is NOT caught
// here (unlike the read-only overview/schedule paths). A receptionist or a
// doctor-among-several hitting this route with no explicit doctor gets a
// clear AmbiguousDoctorError (mapped to 409 by mapDomainError), never
// another doctor's clinical notes. Re-exported under the old name so the
// two existing route call sites (src/app/api/clinic/templates*) are
// unchanged.
export const resolveClinicDoctor = resolveDoctorShared;

export function listTemplates(clinicId: string, doctorId: string) {
  return prisma.clinicalTemplate.findMany({
    where: { clinic_id: clinicId, doctor_id: doctorId },
    orderBy: [{ is_favourite: "desc" }, { updated_at: "desc" }],
  });
}

const TEXT_FIELDS = ["subjective", "objective", "assessment", "plan", "advice", "exercises"] as const;

function textFieldsFrom(input: Record<string, unknown>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const f of TEXT_FIELDS) {
    if (f in input) out[f] = typeof input[f] === "string" ? ((input[f] as string).trim() || null) : null;
  }
  return out;
}
function followUpFrom(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function createTemplate(clinicId: string, doctorId: string, input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw new ClinicalTemplateError("A template name is required.");
  return prisma.clinicalTemplate.create({
    data: {
      clinic_id: clinicId,
      doctor_id: doctorId,
      name,
      ...textFieldsFrom(input),
      follow_up_days: "follow_up_days" in input ? followUpFrom(input.follow_up_days) : null,
      is_favourite: input.is_favourite === true,
    },
  });
}

export async function updateTemplate(id: string, clinicId: string, input: Record<string, unknown>) {
  const existing = await prisma.clinicalTemplate.findFirst({ where: { id, clinic_id: clinicId } });
  if (!existing) throw new ClinicalTemplateError("Template not found.");
  const data: Prisma.ClinicalTemplateUpdateInput = { ...textFieldsFrom(input) };
  if ("name" in input) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) throw new ClinicalTemplateError("A template name is required.");
    data.name = name;
  }
  if ("follow_up_days" in input) data.follow_up_days = followUpFrom(input.follow_up_days);
  if ("is_favourite" in input) data.is_favourite = input.is_favourite === true;
  return prisma.clinicalTemplate.update({ where: { id: existing.id }, data });
}

export async function deleteTemplate(id: string, clinicId: string) {
  const existing = await prisma.clinicalTemplate.findFirst({ where: { id, clinic_id: clinicId } });
  if (!existing) throw new ClinicalTemplateError("Template not found.");
  await prisma.clinicalTemplate.delete({ where: { id: existing.id } });
}
