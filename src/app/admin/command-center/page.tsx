import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";
import CommandCenter from "@/components/admin/command-center";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Live operational awareness for your organization.",
};

// D3: gated by the admin_portal capability (Owner + Practice Manager), matching
// the /admin layout — reports are operational authority, not owner-only.
export default async function CommandCenterPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  const capabilities = await getEffectiveCapabilitiesForSession(session);
  if (!hasCapability("admin_portal", capabilities)) {
    redirect("/login");
  }
  return (
    <>
      <Toaster position="bottom-right" />
      <CommandCenter />
    </>
  );
}
