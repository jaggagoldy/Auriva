"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { usePatientSession } from "@/components/patient/patient-session";
import HealthSummaryDialog from "@/components/patient/health-summary-dialog";

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

function formatDob(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function PatientProfilePage() {
  const { patientProfile, user } = usePatientSession();

  const identity = [
    { k: "Full name", v: patientProfile.full_name || "—" },
    { k: "Date of birth", v: `${formatDob(patientProfile.date_of_birth)} · ${ageFrom(patientProfile.date_of_birth)}` },
    { k: "Gender", v: patientProfile.gender || "—" },
    { k: "Blood group", v: patientProfile.blood_group || "—" },
    { k: "Health ID", v: patientProfile.health_id },
    { k: "Phone", v: user.phone_number || user.email || "—" },
  ];

  const emergency =
    patientProfile.emergency_contact_name || patientProfile.emergency_contact_phone
      ? [patientProfile.emergency_contact_name, patientProfile.emergency_contact_phone].filter(Boolean).join(" · ")
      : "Not added yet";

  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-background/90 px-4 pt-5 pb-3 backdrop-blur">
        <Link
          href="/patient/you"
          aria-label="Back to You"
          className="grid size-9 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground transition hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-[21px] font-bold">Personal details</h1>
      </div>

      <div className="px-5 pt-1 pb-6">
        {/* Identity */}
        <p className="mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">About you</p>
        <div className="divide-y rounded-[16px] border bg-card px-4">
          {identity.map((row) => (
            <div key={row.k} className="flex items-center gap-3 py-3.5">
              <span className="text-[13px] text-muted-foreground">{row.k}</span>
              <span className="ml-auto min-w-0 truncate text-right font-heading text-[14px] font-semibold">{row.v}</span>
            </div>
          ))}
        </div>

        {/* Health summary — lives here now (single source, edited in place) */}
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
          <HealthCard k="Allergies" v={patientProfile.allergies || "None"} />
          <HealthCard k="Conditions" v={patientProfile.chronic_conditions || "None"} />
          <div className="col-span-2 rounded-[14px] border bg-card p-3.5">
            <p className="text-[10.5px] font-bold tracking-[0.05em] text-muted-foreground uppercase">Emergency contact</p>
            <p className="mt-1 font-heading text-[15px] font-bold break-words">{emergency}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[14px] border bg-card p-3.5">
      <p className="text-[10.5px] font-bold tracking-[0.05em] text-muted-foreground uppercase">{k}</p>
      <p className="mt-1 font-heading text-[16px] font-bold break-words">{v}</p>
    </div>
  );
}
