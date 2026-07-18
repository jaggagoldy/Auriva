import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/api/session";
import { isPatient } from "@/domain/authorization";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

// UXS-043 Package 1 — the Mandatory Password Change route. Reached after a
// provisioned member signs in with a temporary password (login redirects here,
// and every workspace layout guards to it). This page is the mandatory-reset
// gate only: a member who has already set their own password is sent on to the
// workspace resolver.
export default async function ChangePasswordPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (isPatient(session.role)) redirect("/patient");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { must_change_password: true },
  });
  if (!user?.must_change_password) redirect("/workspace");

  return <ChangePasswordForm />;
}
