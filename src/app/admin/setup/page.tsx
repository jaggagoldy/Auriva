import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";
import SetupChecklist from "@/components/admin/setup-checklist";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Setup",
  description: "Get your organization activated.",
};

// D3: gated by the admin_portal capability (Owner + Practice Manager), matching
// the /admin layout.
export default async function SetupPage() {
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
      <SetupChecklist />
    </>
  );
}
