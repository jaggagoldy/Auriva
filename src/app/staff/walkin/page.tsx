"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import WalkInModal from "@/components/staff/walkin-modal";
import { DoctorOption } from "@/components/staff/doctor-filter";

export default function StaffWalkinPage() {
  const router = useRouter();
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [doctors, setDoctors] = React.useState<DoctorOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/reception/dashboard", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setClinicId(data.clinic_id);
        setDoctors(
          data.doctors.map((d: any) => ({ id: d.id, full_name: d.full_name, specialty: d.specialty }))
        );
      })
      .catch(() => {
        if (!cancelled) setError("Could not load clinic data.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="p-6 text-sm text-muted-foreground">{error}</div>;
  }

  if (!clinicId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-sm font-semibold">Walk-In Registration</h1>
      <WalkInModal
        clinicId={clinicId}
        doctors={doctors}
        defaultOpen
        onRegistered={() => router.push("/staff/queue")}
      />
    </div>
  );
}
