// P5 Diagnostics — recommendation records (NOT lab management). A doctor
// recommends catalog tests during a consult; the patient acts on them from
// their Health Vault (book → complete → upload report). Status is patient-driven.

import prisma from "@/lib/prisma";
import { getTest } from "@/domain/diagnostics-catalog";
import { canAdvanceRecommendation, isTestRecommendationStatus, TestRecommendationStatus } from "@/domain/test-recommendation-status";

export class TestRecommendationError extends Error {}

/**
 * Create one recommendation per selected catalog code. Called from
 * completeVisit. Unknown codes are skipped (the catalog is the source of the
 * selector, so this only guards against stale clients). Name + prep are
 * snapshotted so a later catalog change never rewrites a patient's record.
 */
export async function recommendTests(input: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  testCodes: string[];
}): Promise<{ count: number }> {
  const seen = new Set<string>();
  const rows = input.testCodes
    .map((code) => {
      const t = getTest(code);
      if (!t || seen.has(t.code)) return null;
      seen.add(t.code);
      return {
        clinic_id: input.clinicId,
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        appointment_id: input.appointmentId ?? null,
        test_code: t.code,
        test_name: t.name,
        category: t.category,
        prep_instructions: t.prep ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return { count: 0 };
  await prisma.testRecommendation.createMany({ data: rows });
  return { count: rows.length };
}

export function listRecommendationsForPatient(patientId: string) {
  return prisma.testRecommendation.findMany({
    where: { patient_id: patientId },
    orderBy: { recommended_at: "desc" },
    include: {
      doctor: { select: { full_name: true } },
      clinic: { select: { name: true } },
    },
  });
}

/** Patient advances a recommendation (forward-only) and/or files a report url. */
export async function updateRecommendation(input: {
  id: string;
  patientId: string;
  status?: string;
  reportUrl?: string | null;
}) {
  const rec = await prisma.testRecommendation.findFirst({
    where: { id: input.id, patient_id: input.patientId },
  });
  if (!rec) throw new TestRecommendationError("Recommendation not found.");

  const data: { status?: string; report_url?: string | null } = {};

  if (input.reportUrl !== undefined) {
    data.report_url = input.reportUrl;
    // Uploading a report implies at least "report_uploaded".
    if (input.reportUrl) data.status = "report_uploaded";
  }

  if (input.status !== undefined) {
    if (!isTestRecommendationStatus(input.status)) throw new TestRecommendationError("Unknown status.");
    const from = rec.status as TestRecommendationStatus;
    if (input.status !== from && !canAdvanceRecommendation(from, input.status)) {
      throw new TestRecommendationError("A test can't be moved backwards.");
    }
    data.status = input.status;
  }

  if (Object.keys(data).length === 0) return rec;
  return prisma.testRecommendation.update({ where: { id: rec.id }, data });
}
