import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

// APS-044 §9 / UXS-043 Package 1 — a provisioned account (signed in with a
// temporary password) must set its own before any workspace renders. This is
// the server-component guard for the workspace layouts + the landing hub; it
// complements requireStaffContext's API-boundary gate so a must_change_password
// account can never reach a surface by URL either. Cheap: one PK lookup.
export async function requirePasswordChanged(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { must_change_password: true },
  });
  if (user?.must_change_password) redirect("/change-password");
}
