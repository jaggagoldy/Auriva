import type { Metadata } from "next";

import DoctorWorkbenchView from "@/components/doctor/doctor-workbench-view";

export const metadata: Metadata = {
  title: "Workbench",
  description: "Consult Workbench — the current patient, in focus.",
};

export default function DoctorWorkbenchPage() {
  return <DoctorWorkbenchView />;
}
