import { redirect } from "next/navigation";

import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";
import { requirePasswordChanged } from "@/lib/require-password-changed";
import CommandPalette from "@/components/admin/command-palette";

// Sprint 3: /admin previously had no server-side guard at all (unlike
// /staff and /doctor, which both have a real layout check) — every page
// under /admin fetched its own data and just happened to 403 downstream if
// unauthorized. Adding real admin surface (Settings, Departments) makes this
// gap worth closing now, mirroring the already-proven staff/doctor pattern.
//
// Batch D · D2: gated by the `admin_portal` CAPABILITY (not the super_admin
// role) so the Practice Manager opens the same cockpit — surfaces are workflow
// containers. Owner-only actions (plan, ownership) stay owner-gated at their own
// endpoints, so admitting the Manager to the container never over-grants them.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  await requirePasswordChanged(session.userId);
  const capabilities = await getEffectiveCapabilitiesForSession(session);
  if (!hasCapability("admin_portal", capabilities)) {
    redirect("/login");
  }
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
