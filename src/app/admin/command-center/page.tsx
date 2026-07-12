import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import CommandCenter from "@/components/admin/command-center";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Live operational awareness for your organization.",
};

export default async function CommandCenterPage() {
  const session = await getCurrentSession();
  if (!session || !canAccessAdminPortal(session.role)) {
    redirect("/login");
  }
  return (
    <>
      <Toaster position="bottom-right" />
      <CommandCenter />
    </>
  );
}
