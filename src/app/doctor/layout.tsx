import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/api/session";
import { effectiveCapabilities, hasCapability } from "@/domain/authorization";
import DoctorShell from "@/components/doctor/doctor-shell";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // Batch B: resolve the doctor's ACTIVE membership (workspace) — the session's
  // active_membership_id, scoped to the caller, else their single active
  // membership.
  const staffProfile = await prisma.staffProfile.findFirst({
    where: session.activeMembershipId
      ? { id: session.activeMembershipId, user_id: session.userId }
      : { user_id: session.userId, membership_status: "active" },
    include: { clinic: { select: { id: true, name: true, address: true } } },
    orderBy: { id: "asc" },
  });
  if (!staffProfile) {
    redirect("/login");
  }

  // Batch 2: the clinical workspace is gated by the `doctor_workspace`
  // capability (role defaults ∪ this profile's grants), so an owner or a
  // capability-granted account resolves the same way a plain doctor does.
  const capabilities = effectiveCapabilities(session.role, staffProfile.capabilities);
  if (!hasCapability("doctor_workspace", capabilities)) {
    redirect("/login");
  }

  return (
    <DoctorShell
      doctor={{
        id: staffProfile.id,
        full_name: staffProfile.full_name,
        specialty: staffProfile.specialty,
        clinic: staffProfile.clinic,
      }}
      capabilities={capabilities}
    >
      {children}
    </DoctorShell>
  );
}
