import { redirect } from "next/navigation";

import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";

// Milestone 1 Batch 4: the "My Clinic" workspace is the solo owner's home. Same
// guard as the /staff surface — anyone with the `reception` capability (owner,
// receptionist, or a solo doctor granted reception). The page renders its own
// shell (nav + header), so this layout only gates access.
export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const capabilities = await getEffectiveCapabilitiesForSession(session);
  if (!hasCapability("reception", capabilities)) redirect("/login");

  return <>{children}</>;
}
