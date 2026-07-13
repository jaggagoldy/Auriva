import { redirect } from "next/navigation";

import { getCurrentSession, getEffectiveCapabilitiesForSession } from "@/api/session";
import { hasCapability } from "@/domain/authorization";

// Milestone 1 Batch 4: the "My Clinic" workspace is the solo owner's home.
//
// BRD-043 Sprint 3 (adaptive dashboard, "one product"): /clinic is now the
// single adaptive surface for ALL staff roles — Practice Owner, Managing
// Doctor, Doctor and Receptionist — not just reception-capable ones. A plain
// Doctor holds `doctor_workspace` but not `reception`, so the gate admits
// either capability. The dashboard endpoint decides what each role sees; this
// layout only gates that the caller is clinic staff at all.
export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const capabilities = await getEffectiveCapabilitiesForSession(session);
  const isClinicStaff =
    hasCapability("reception", capabilities) || hasCapability("doctor_workspace", capabilities);
  if (!isClinicStaff) redirect("/login");

  return <>{children}</>;
}
