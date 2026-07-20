import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";
import { requirePasswordChanged } from "@/lib/require-password-changed";
import StaffShell from "@/components/staff/staff-shell";
import CommandPalette from "@/components/shared/command-palette";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  await requirePasswordChanged(session.userId);

  // Batch 2: the front desk is reachable by anyone with the `reception`
  // capability — a receptionist, an owner, or a solo practitioner (a doctor
  // granted reception) — not only the receptionist/super_admin roles.
  //
  // Batch D · D2: the Technician shares this surface via the narrower
  // `diagnostics` capability. They open the container but hold none of the
  // reception-gated actions (billing, booking) — the /staff endpoints still
  // require the `reception` capability specifically, so this never over-grants.
  const capabilities = await getEffectiveCapabilitiesForSession(session);
  if (!hasCapability("reception", capabilities) && !hasCapability("diagnostics", capabilities)) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { staffProfiles: true },
  });
  if (!user) {
    redirect("/login");
  }

  return (
    <StaffShell
      displayName={user.staffProfiles[0]?.full_name ?? user.email ?? "Staff"}
      role={session.role}
      capabilities={capabilities}
    >
      {children}
      <CommandPalette surface="staff" />
    </StaffShell>
  );
}
