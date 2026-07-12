import type { Metadata } from "next";

import ReceptionDashboard from "@/components/staff/reception-dashboard";

export const metadata: Metadata = {
  title: "Reception Dashboard",
  description: "Today's appointments, walk-ins and doctor availability.",
};

export default function StaffDashboardPage() {
  return <ReceptionDashboard />;
}
