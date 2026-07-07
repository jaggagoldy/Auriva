import { redirect } from "next/navigation";

import { getCurrentSession } from "@/api/session";
import { canAccessAdminPortal } from "@/domain/authorization";
import CommandPalette from "@/components/admin/command-palette";

// Sprint 3: /admin previously had no server-side guard at all (unlike
// /staff and /doctor, which both have a real layout check) — every page
// under /admin fetched its own data and just happened to 403 downstream if
// unauthorized. Adding real admin surface (Settings, Departments) makes this
// gap worth closing now, mirroring the already-proven staff/doctor pattern.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session || !canAccessAdminPortal(session.role)) {
    redirect("/login");
  }
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
