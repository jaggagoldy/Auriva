import { redirect } from "next/navigation";

import { getCurrentSession } from "@/api/session";
import prisma from "@/lib/prisma";

// APS-036: narrows the outer /admin guard (which only checks the
// customer-facing `super_admin` = "owns an Organization" role) further —
// Release authoring is an Auriva-platform-staff capability, not something
// every clinic owner should be able to do. See the is_platform_admin
// comment on User in prisma/schema.prisma for why this check is deliberately
// separate from canAccessAdminPortal.
export default async function ReleasesLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.is_platform_admin) redirect("/admin");

  return <>{children}</>;
}
