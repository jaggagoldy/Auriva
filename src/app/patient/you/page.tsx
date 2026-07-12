"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, MonitorSmartphone, LogOut, Pencil } from "lucide-react";
import { usePatientSession } from "@/components/patient/patient-session";
import HealthSummaryDialog from "@/components/patient/health-summary-dialog";
import { getInitials } from "@/shared/queue";

function ageFrom(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return `${age} yrs`;
}

export default function PatientYouPage() {
  const { patientProfile, user } = usePatientSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const health = [
    { k: "Blood group", v: patientProfile.blood_group || "—" },
    { k: "Age", v: ageFrom(patientProfile.date_of_birth) },
    { k: "Allergies", v: patientProfile.allergies || "None" },
    { k: "Conditions", v: patientProfile.chronic_conditions || "None" },
  ];

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background/90 px-5 pt-5 pb-3 backdrop-blur">
        <h1 className="font-heading text-[21px] font-bold">You</h1>
      </div>

      <div className="px-5 pt-1 pb-6">
        {/* Profile card */}
        <div className="flex items-center gap-3 rounded-[15px] border bg-card p-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-[16px] bg-honey-soft font-heading text-[19px] font-bold text-honey-deep">
            {getInitials(patientProfile.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-[17px] font-bold">{patientProfile.full_name}</p>
            <p className="truncate text-[12.5px] text-muted-foreground">{user.phone_number || user.email || patientProfile.health_id}</p>
          </div>
        </div>

        {/* Health summary */}
        <div className="mt-6 mb-3 flex items-center justify-between px-1">
          <p className="text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">Health summary</p>
          <HealthSummaryDialog
            trigger={
              <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-honey-deep">
                <Pencil className="size-3.5" /> Edit
              </button>
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {health.map((h) => (
            <div key={h.k} className="rounded-[14px] border bg-card p-3.5">
              <p className="text-[10.5px] font-bold tracking-[0.05em] text-muted-foreground uppercase">{h.k}</p>
              <p className="mt-1 font-heading text-[16px] font-bold break-words">{h.v}</p>
            </div>
          ))}
        </div>

        {/* Settings */}
        <p className="mt-6 mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">Settings</p>
        <div className="divide-y rounded-[16px] border bg-card px-4">
          <SettingRow href="/patient/settings" icon={MonitorSmartphone} label="Account & devices" />
          <SettingRow href="/trust" icon={ShieldCheck} label="Privacy & data" />
        </div>

        <button
          onClick={signOut}
          disabled={signingOut}
          className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border bg-card font-heading text-[15px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
        >
          <LogOut className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-secondary text-muted-foreground">
        <Icon className="size-[18px]" />
      </span>
      <span className="flex-1 font-heading text-[14.5px] font-semibold">{label}</span>
      <ChevronRight className="size-[18px] shrink-0 text-muted-foreground/40" />
    </Link>
  );
}
