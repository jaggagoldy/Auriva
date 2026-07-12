import type { Metadata } from "next";

import DoctorProfile from "@/components/doctor/doctor-profile";

export const metadata: Metadata = {
  title: "Profile",
  description: "Professional identity, qualifications and practice details.",
};

export default function DoctorProfilePage() {
  return <DoctorProfile />;
}
