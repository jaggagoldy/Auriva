import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/api/session";
import { canAccessReception } from "@/domain/authorization";
import StaffShell from "@/components/staff/staff-shell";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session || !canAccessReception(session.role)) {
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
      role={session.role as "receptionist" | "super_admin"}
    >
      {children}
    </StaffShell>
  );
}
