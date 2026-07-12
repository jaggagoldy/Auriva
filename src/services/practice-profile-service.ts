// P3 Practice Setup — read/write the full clinic + owning-doctor profile as one
// aggregate so the setup wizard needs a single GET + PATCH. Media fields carry
// opaque StorageService urls; facilities/gallery/documents/social are JSON.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export class PracticeProfileError extends Error {}

export interface GalleryItem { url: string; caption?: string }
export interface DocumentItem { url: string; name: string }

function parseArray<T>(json: string | null): T[] {
  try {
    const a = JSON.parse(json ?? "[]");
    return Array.isArray(a) ? (a as T[]) : [];
  } catch {
    return [];
  }
}
function parseObject(json: string | null): Record<string, string> {
  try {
    const o = JSON.parse(json ?? "{}");
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}
function trimOrNull(v: unknown): string | null {
  return typeof v === "string" ? (v.trim() || null) : null;
}
function intOrNull(v: unknown): number | null {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function resolveDoctor(clinicId: string, ownerUserId: string) {
  return (
    (await prisma.staffProfile.findFirst({ where: { user_id: ownerUserId, clinic_id: clinicId } })) ??
    (await prisma.staffProfile.findFirst({ where: { clinic_id: clinicId } }))
  );
}

export async function getPracticeProfile(clinicId: string, ownerUserId: string) {
  const [clinic, doctor] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId } }),
    resolveDoctor(clinicId, ownerUserId),
  ]);
  if (!clinic) throw new PracticeProfileError("Clinic not found.");

  return {
    clinic: {
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      website: clinic.website,
      about: clinic.about,
      logo_url: clinic.logo_url,
      cover_url: clinic.cover_url,
      facilities: parseArray<string>(clinic.facilities_json),
      gallery: parseArray<GalleryItem>(clinic.gallery_json),
      documents: parseArray<DocumentItem>(clinic.documents_json),
      social: parseObject(clinic.social_json),
      reception_contact: clinic.reception_contact,
      working_days: clinic.working_days,
      opens_at: clinic.opens_at,
      closes_at: clinic.closes_at,
      default_consultation_fee: clinic.default_consultation_fee,
    },
    doctor: doctor
      ? {
          id: doctor.id,
          full_name: doctor.full_name,
          specialty: doctor.specialty,
          bio: doctor.bio,
          qualifications: doctor.qualifications,
          years_experience: doctor.years_experience,
          languages: doctor.languages,
          registration_number: doctor.registration_number,
          consultation_fee: doctor.consultation_fee,
          follow_up_fee: doctor.follow_up_fee,
          photo_url: doctor.photo_url,
        }
      : null,
  };
}

// A partial patch; any subset of clinic/doctor fields. Unknown keys ignored.
export interface PracticeProfilePatch {
  clinic?: Record<string, unknown>;
  doctor?: Record<string, unknown>;
}

export async function updatePracticeProfile(clinicId: string, ownerUserId: string, patch: PracticeProfilePatch) {
  const c = patch.clinic ?? {};
  const clinicData: Prisma.ClinicUpdateInput = {};
  // Nullable text columns — empty clears to null.
  const clinicStrings = ["phone", "email", "website", "about", "logo_url", "cover_url", "reception_contact", "working_days", "opens_at", "closes_at"] as const;
  for (const f of clinicStrings) {
    if (f in c) (clinicData as Record<string, unknown>)[f] = trimOrNull(c[f]);
  }
  if ("name" in c) {
    const name = trimOrNull(c.name);
    if (!name) throw new PracticeProfileError("Clinic name is required.");
    clinicData.name = name;
  }
  // `address` is a required (non-null) column — empty stays an empty string.
  if ("address" in c) clinicData.address = typeof c.address === "string" ? c.address.trim() : "";
  if ("facilities" in c) clinicData.facilities_json = JSON.stringify((Array.isArray(c.facilities) ? c.facilities : []).filter((x) => typeof x === "string"));
  if ("gallery" in c) clinicData.gallery_json = JSON.stringify(normalizeGallery(c.gallery));
  if ("documents" in c) clinicData.documents_json = JSON.stringify(normalizeDocuments(c.documents));
  if ("social" in c) clinicData.social_json = JSON.stringify(normalizeSocial(c.social));
  if ("default_consultation_fee" in c) clinicData.default_consultation_fee = intOrNull(c.default_consultation_fee);

  if (Object.keys(clinicData).length > 0) {
    await prisma.clinic.update({ where: { id: clinicId }, data: clinicData });
  }

  const d = patch.doctor ?? {};
  if (Object.keys(d).length > 0) {
    const doctor = await resolveDoctor(clinicId, ownerUserId);
    if (!doctor) throw new PracticeProfileError("No clinic profile to update.");
    const docData: Prisma.StaffProfileUpdateInput = {};
    const docStrings = ["specialty", "bio", "qualifications", "languages", "registration_number", "photo_url"] as const;
    for (const f of docStrings) {
      if (f in d) (docData as Record<string, unknown>)[f] = trimOrNull(d[f]);
    }
    if ("full_name" in d) {
      const name = trimOrNull(d.full_name);
      if (!name) throw new PracticeProfileError("Your name is required.");
      docData.full_name = name;
    }
    for (const f of ["years_experience", "consultation_fee", "follow_up_fee"] as const) {
      if (f in d) (docData as Record<string, unknown>)[f] = intOrNull(d[f]);
    }
    if (Object.keys(docData).length > 0) {
      await prisma.staffProfile.update({ where: { id: doctor.id }, data: docData });
    }
  }

  return getPracticeProfile(clinicId, ownerUserId);
}

function normalizeGallery(v: unknown): GalleryItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
    .filter((x) => typeof x.url === "string")
    .map((x) => ({ url: x.url as string, caption: typeof x.caption === "string" ? x.caption : undefined }));
}
function normalizeDocuments(v: unknown): DocumentItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
    .filter((x) => typeof x.url === "string")
    .map((x) => ({ url: x.url as string, name: typeof x.name === "string" ? x.name : "Document" }));
}
function normalizeSocial(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim()) out[k] = val.trim();
  }
  return out;
}
