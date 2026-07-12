import type { Metadata } from "next";

import DoctorToday from "@/components/doctor/doctor-today";

export const metadata: Metadata = {
  title: "Today",
  description: "Mission Control — today's queue and consultation workspace.",
};

export default function DoctorTodayPage() {
  return <DoctorToday />;
}
