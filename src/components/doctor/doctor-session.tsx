"use client";

import * as React from "react";

export interface DoctorSessionData {
  id: string;
  full_name: string;
  specialty: string | null;
  clinic: { id: string; name: string; address: string };
}

const DoctorSessionContext = React.createContext<DoctorSessionData | null>(null);

export function DoctorSessionProvider({
  doctor,
  children,
}: {
  doctor: DoctorSessionData;
  children: React.ReactNode;
}) {
  return (
    <DoctorSessionContext.Provider value={doctor}>{children}</DoctorSessionContext.Provider>
  );
}

/** The signed-in doctor's identity, resolved server-side from the session
 * cookie (see src/app/doctor/layout.tsx) — never a client-picked dropdown. */
export function useDoctorSession(): DoctorSessionData {
  const ctx = React.useContext(DoctorSessionContext);
  if (!ctx) throw new Error("useDoctorSession must be used within /doctor routes");
  return ctx;
}
