import type { Metadata } from "next";

import DoctorSchedule from "@/components/doctor/doctor-schedule";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Weekly calendar of appointments and practice sessions.",
};

export default function DoctorSchedulePage() {
  return <DoctorSchedule />;
}
