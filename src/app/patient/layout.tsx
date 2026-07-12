import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/api/session";
import { canAccessPatientWorkspace } from "@/domain/authorization";
import { PatientSessionProvider, PatientProfileData } from "@/components/patient/patient-session";
import { PatientShell } from "@/components/patient/patient-shell";

function serializeProfile(profile: {
  id: string;
  health_id: string;
  full_name: string;
  blood_group: string;
  user_id: string | null;
  date_of_birth: Date | null;
  gender: string | null;
  onboarding_completed: boolean;
  allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  verification_level: string;
}): PatientProfileData {
  return {
    ...profile,
    date_of_birth: profile.date_of_birth ? profile.date_of_birth.toISOString() : null,
  };
}

// Real server-side session guard (APS-029/010 Sprint 1) — mirrors
// /doctor/layout.tsx exactly. Replaces the old client-only localStorage
// check: no session, no active Healthcare Profile, or a profile this
// account no longer has standing access to all redirect to /login.
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session || !canAccessPatientWorkspace(session.role)) {
    redirect("/login");
  }
  if (!session.activeHealthcareProfileId) {
    redirect("/login");
  }

  const [activeProfile, account, links] = await Promise.all([
    prisma.patientProfile.findUnique({ where: { id: session.activeHealthcareProfileId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.accountProfileLink.findMany({
      where: { account_user_id: session.userId },
      include: { profile: true },
      orderBy: { linked_at: "asc" },
    }),
  ]);

  if (!activeProfile || !account) {
    redirect("/login");
  }

  const linkedProfiles = links.map((link) => serializeProfile(link.profile));
  // The active profile might not be in `links` yet in a rare race (session
  // just claimed it, link row committed a moment later) — never render a
  // switcher missing the very profile you're looking at.
  if (!linkedProfiles.some((p) => p.id === activeProfile.id)) {
    linkedProfiles.unshift(serializeProfile(activeProfile));
  }

  return (
    // Keyed by the active profile id: PatientSessionProvider's state is
    // seeded once via useState(initialPatientProfile) and otherwise ignores
    // new props on re-render, so a router.refresh() after switching profiles
    // would silently keep showing the OLD profile's state without this key
    // forcing React to remount the subtree.
    <PatientSessionProvider
      key={activeProfile.id}
      initialPatientProfile={serializeProfile(activeProfile)}
      user={{ id: account.id, phone_number: account.phone_number, email: account.email }}
      linkedProfiles={linkedProfiles}
    >
      <PatientShell>{children}</PatientShell>
    </PatientSessionProvider>
  );
}
