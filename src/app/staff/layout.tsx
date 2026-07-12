import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";
import StaffShell from "@/components/staff/staff-shell";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // Batch 2: the front desk is reachable by anyone with the `reception`
  // capability — a receptionist, an owner, or a solo practitioner (a doctor
  // granted reception) — not only the receptionist/super_admin roles.
  const capabilities = await getEffectiveCapabilitiesForSession(session);
  if (!hasCapability("reception", capabilities)) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { staffProfile: true },
  });
  if (!user) {
    redirect("/login");
  }

  return (
    <StaffShell
      displayName={user.staffProfile?.full_name ?? user.email ?? "Staff"}
      role={session.role}
      capabilities={capabilities}
    >
      {children}
    </StaffShell>
  );
}
