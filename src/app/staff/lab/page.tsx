import type { Metadata } from "next";

import LabWorklist from "@/components/staff/lab-worklist";

export const metadata: Metadata = {
  title: "Lab Orders",
  description: "Pending lab orders and result entry.",
};

export default function StaffLabPage() {
  return <LabWorklist />;
}
