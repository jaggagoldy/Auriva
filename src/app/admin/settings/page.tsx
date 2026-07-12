import type { Metadata } from "next";

import OrgSettings from "@/components/admin/org-settings";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Organization Settings",
  description: "Organization profile, contact details and time zone.",
};

export default function OrgSettingsPage() {
  return (
    <>
      <Toaster position="bottom-right" />
      <OrgSettings />
    </>
  );
}
