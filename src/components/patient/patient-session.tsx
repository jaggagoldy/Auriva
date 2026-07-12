"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export interface PatientProfileData {
  id: string;
  health_id: string;
  full_name: string;
  blood_group: string;
  user_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  onboarding_completed: boolean;
  allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  verification_level: string;
}

export interface PatientUserData {
  id: string;
  phone_number: string;
  email: string | null;
}

interface PatientSession {
  patientProfile: PatientProfileData;
  user: PatientUserData;
  /** Every Healthcare Profile this Account is linked to (APS-029/010 Part I A1) — the Family Profile Selector / Profile Switcher list. Always includes the active profile. */
  linkedProfiles: PatientProfileData[];
  /** Merges new fields into patientProfile, in React state, so every /patient/* page reflects an edit without a reload — the server (not localStorage) is the source of truth on the next navigation. */
  updateProfile: (patch: Partial<PatientProfileData>) => void;
  /** Switches which linked Healthcare Profile this session acts as, then reloads the server-rendered layout. */
  switchProfile: (profileId: string) => Promise<void>;
}

const PatientSessionContext = React.createContext<PatientSession | null>(null);

export function PatientSessionProvider({
  initialPatientProfile,
  user,
  linkedProfiles,
  children,
}: {
  initialPatientProfile: PatientProfileData;
  user: PatientUserData;
  linkedProfiles: PatientProfileData[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [patientProfile, setPatientProfile] = React.useState(initialPatientProfile);

  const updateProfile = React.useCallback((patch: Partial<PatientProfileData>) => {
    setPatientProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const switchProfile = React.useCallback(
    async (profileId: string) => {
      const res = await fetch("/api/auth/switch-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ healthcare_profile_id: profileId }),
      });
      if (!res.ok) throw new Error("Could not switch profile");
      router.push("/patient");
      router.refresh();
    },
    [router]
  );

  const value = React.useMemo(
    () => ({ patientProfile, user, linkedProfiles, updateProfile, switchProfile }),
    [patientProfile, user, linkedProfiles, updateProfile, switchProfile]
  );

  return <PatientSessionContext.Provider value={value}>{children}</PatientSessionContext.Provider>;
}

/** Throws outside the patient layout — every /patient/* page is guaranteed a session by the layout's server-side redirect guard. */
export function usePatientSession(): PatientSession {
  const session = React.useContext(PatientSessionContext);
  if (!session) {
    throw new Error("usePatientSession must be used within /patient/* (PatientSessionProvider missing).");
  }
  return session;
}
