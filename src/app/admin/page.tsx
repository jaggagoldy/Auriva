import type { Metadata } from "next";

import AdminWorkspace from "@/components/admin/workspace";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Workspace · Aegis Clinic OS",
  description: "Manage your clinic profile, staff and role access.",
};

export default function AdminPage() {
  return (
    <>
      <Toaster position="bottom-right" />
      <AdminWorkspace />
    </>
  );
}
