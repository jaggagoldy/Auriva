"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, MonitorSmartphone, LogOut, User, CreditCard, Bell, Shield } from "lucide-react";
import { usePatientSession } from "@/components/patient/patient-session";
import { getInitials } from "@/shared/queue";

export default function PatientYouPage() {
  const { patientProfile, user } = usePatientSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

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
            <p className="truncate text-[12.5px] text-muted-foreground">
              {[patientProfile.health_id, user.phone_number || user.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {/* PKG-5 Account — the mockup's identity/account rows */}
        <p className="mt-6 mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">Account</p>
        <div className="divide-y rounded-[16px] border bg-card px-4">
          <SettingRow href="/patient/profile" icon={User} label="Personal details" sub="Name, DOB, blood group" />
          <SettingRow icon={Shield} label="Insurance" sub="Not added yet" soon />
          <SettingRow href="/patient/records?tab=bills" icon={CreditCard} label="Payments" sub="Bills & receipts" />
          <SettingRow href="/patient/settings" icon={Bell} label="Notifications" sub="Reminders & results" />
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
  sub,
  soon,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  soon?: boolean;
}) {
  const inner = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-secondary text-muted-foreground">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-[14.5px] font-semibold">{label}</span>
        {sub && <span className="block truncate text-[11.5px] text-muted-foreground">{sub}</span>}
      </span>
      {soon ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      ) : (
        <ChevronRight className="size-[18px] shrink-0 text-muted-foreground/40" />
      )}
    </>
  );
  if (soon || !href) {
    return <div className="flex items-center gap-3 py-4">{inner}</div>;
  }
  return (
    <Link href={href} className="flex items-center gap-3 py-4">
      {inner}
    </Link>
  );
}
