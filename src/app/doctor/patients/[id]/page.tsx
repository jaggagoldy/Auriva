import type { Metadata } from "next";

import PatientTimeline from "@/components/staff/patient-timeline";

// Milestone 1 (2.1 · decision B) — the Doctor surface had no patient-record
// route, so global search results had nowhere to land. This reuses the existing
// PatientTimeline (its data endpoint already allows the doctor_workspace
// capability and is clinic-scoped) rather than building a new view.
export const metadata: Metadata = {
  title: "Patient",
  description: "Patient record — visit timeline.",
};

export default async function DoctorPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientTimeline patientId={id} />;
}
