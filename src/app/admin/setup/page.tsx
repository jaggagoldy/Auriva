import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import SetupChecklist from "@/components/admin/setup-checklist";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Setup",
  description: "Get your organization activated.",
};

export default async function SetupPage() {
  const session = await getCurrentSession();
  if (!session || !canAccessAdminPortal(session.role)) {
    redirect("/login");
  }
  return (
    <>
      <Toaster position="bottom-right" />
      <SetupChecklist />
    </>
  );
}
