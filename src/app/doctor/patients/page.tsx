import type { Metadata } from "next";

import DoctorPatients from "@/components/doctor/doctor-patients";

export const metadata: Metadata = {
  title: "Patients",
  description: "Every patient you've seen, with their visit history.",
};

export default function DoctorPatientsPage() {
  return <DoctorPatients />;
}
