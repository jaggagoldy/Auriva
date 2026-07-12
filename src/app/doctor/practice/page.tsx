import type { Metadata } from "next";

import DoctorPractice from "@/components/doctor/doctor-practice";

export const metadata: Metadata = {
  title: "Practice",
  description: "Locations, fees, services and verification.",
};

export default function DoctorPracticePage() {
  return <DoctorPractice />;
}
