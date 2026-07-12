// Patient-favorited doctors — Find Care's star toggle and Profile's "My
// care network" Favourites filter.

import prisma from "@/lib/prisma";

export async function listFavoriteDoctorIds(patientId: string): Promise<string[]> {
  const rows = await prisma.patientFavoriteDoctor.findMany({
    where: { patient_id: patientId },
    select: { doctor_id: true },
  });
  return rows.map((r) => r.doctor_id);
}

export async function addFavoriteDoctor(patientId: string, doctorId: string) {
  return prisma.patientFavoriteDoctor.upsert({
    where: { patient_id_doctor_id: { patient_id: patientId, doctor_id: doctorId } },
    create: { patient_id: patientId, doctor_id: doctorId },
    update: {},
  });
}

export async function removeFavoriteDoctor(patientId: string, doctorId: string) {
  await prisma.patientFavoriteDoctor.deleteMany({
    where: { patient_id: patientId, doctor_id: doctorId },
  });
}
