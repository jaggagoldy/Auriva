import type { Metadata } from "next";

import PatientTimeline from "@/components/staff/patient-timeline";

export const metadata: Metadata = {
  title: "Patient Timeline",
  description: "The patient's complete history in one view.",
};

export default async function StaffPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientTimeline patientId={id} />;
}
