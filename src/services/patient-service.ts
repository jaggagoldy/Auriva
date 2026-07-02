// Shared "find or create a patient by phone number" logic. Originally lived
// only inside /api/auth/otp/send/route.ts (patient self-service login); the
// reception walk-in flow needs the exact same reuse-by-phone behavior, so it
// now lives here and both call sites share one implementation.

import type { PrismaClient, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export class PhoneNumberInUseError extends Error {}

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function findOrCreatePatientByPhone(
  db: DbClient,
  phoneNumber: string,
  overrides: { full_name?: string; blood_group?: string } = {}
) {
  const existing = await db.user.findFirst({
    where: { phone_number: phoneNumber },
    include: { patientProfile: true },
  });

  if (existing) {
    if (existing.role !== "patient") {
      throw new PhoneNumberInUseError(
        "This phone number is registered with a non-patient role."
      );
    }
    return { user: existing, isNew: false };
  }

  const created = await db.user.create({
    data: {
      role: "patient",
      phone_number: phoneNumber,
      email: `${phoneNumber.replace(/[^0-9]/g, "") || "newpatient"}@example.com`,
      patientProfile: {
        create: {
          full_name: overrides.full_name?.trim() || "Test Patient",
          blood_group: overrides.blood_group?.trim() || "O-Positive",
        },
      },
    },
    include: { patientProfile: true },
  });
  return { user: created, isNew: true };
}
