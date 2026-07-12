"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  FlaskConical,
  Pill,
  ArrowRight,
  ShieldCheck,
  Phone,
  CreditCard,
  ShieldQuestion,
  KeyRound,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientSession } from "@/components/patient/patient-session";
import HealthSummaryDialog from "@/components/patient/health-summary-dialog";
import { Appointment, getInitials } from "@/shared/queue";

export default function PatientProfilePage() {
  const { patientProfile, user } = usePatientSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());
  const [networkFilter, setNetworkFilter] = React.useState<"all" | "favourites">("all");

  React.useEffect(() => {
    fetch(`/api/appointments?patient_id=${patientProfile.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setAppointments)
      .catch(() => setAppointments([]));
    fetch("/api/patients/favorites", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((ids: string[]) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, [patientProfile.id]);

  const toggleFavorite = async (doctorId: string) => {
    const isFavorited = favoriteIds.has(doctorId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
    try {
      await fetch(`/api/patients/favorites/doctors/${doctorId}`, { method: isFavorited ? "DELETE" : "POST" });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorited) next.add(doctorId);
        else next.delete(doctorId);
        return next;
      });
    }
  };

  // "Care Network" is derived from real visit history — every doctor and
  // clinic this patient has actually had an appointment with, deduplicated.
  const network = React.useMemo(() => {
    const doctors = new Map<string, { id: string; name: string; specialty: string | null; visits: number }>();
    const clinics = new Map<string, { id: string; name: string; address: string; visits: number }>();
    for (const a of appointments ?? []) {
      const d = doctors.get(a.doctor.id);
      doctors.set(a.doctor.id, {
        id: a.doctor.id,
        name: a.doctor.full_name,
        specialty: a.doctor.specialty,
        visits: (d?.visits ?? 0) + 1,
      });
      const c = clinics.get(a.clinic.id);
      clinics.set(a.clinic.id, {
        id: a.clinic.id,
        name: a.clinic.name,
        address: a.clinic.address,
        visits: (c?.visits ?? 0) + 1,
      });
    }
    return { doctors: [...doctors.values()], clinics: [...clinics.values()] };
  }, [appointments]);

  const dob = patientProfile.date_of_birth
    ? new Date(patientProfile.date_of_birth).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not set";

  return (
    <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-7 py-7 lg:grid-cols-[340px_1fr]">
      {/* Left: Identity + Healthcare IDs */}
      <div className="flex flex-col gap-4">
        <Card className="rounded-xl text-center">
          <CardContent>
            <Avatar className="mx-auto size-18 text-2xl">
              <AvatarFallback>{getInitials(patientProfile.full_name)}</AvatarFallback>
            </Avatar>
            <p className="mt-3 text-base font-semibold">{patientProfile.full_name}</p>
            <p className="text-xs text-muted-foreground">Auriva patient</p>
          </CardContent>
        </Card>

        <div>
          <SectionLabel>Healthcare IDs</SectionLabel>
          <Card className="overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#0B4A41] to-[#0E5A4F] text-white">
            <CardContent>
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">
                  Digital Health Card
                </span>
                <ShieldCheck className="size-4 text-white/80" />
              </div>
              <p className="text-[15px] font-semibold">{patientProfile.full_name}</p>
              <p className="mt-0.5 text-[11.5px] text-white/70">
                DOB {dob} · {patientProfile.gender ?? "Not set"} · {patientProfile.blood_group}
              </p>
              <div className="mt-4 flex justify-between text-[11px]">
                <span className="text-white/60">Auriva Health ID</span>
                <span className="font-mono">{patientProfile.health_id}</span>
              </div>
              <div className="mt-1.5 flex justify-between text-[11px]">
                <span className="text-white/60">ABHA</span>
                <span className="text-warning">Not linked</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionLabel>Identity</SectionLabel>
          <Card className="rounded-xl">
            <CardContent>
              <dl className="flex flex-col gap-2 text-[12.5px]">
                <Row label="Phone" value={user.phone_number} />
                <Row label="Email" value={user.email ?? "Not set"} />
                <Row label="Blood group" value={patientProfile.blood_group} valueClassName="font-semibold text-destructive" />
                <Row label="Date of birth" value={dob} />
                <Row label="Gender" value={patientProfile.gender ?? "Not set"} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right: network, org, pharmacy/lab, insurance, emergency, privacy */}
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <SectionLabel>Care Network &amp; Connected Organizations</SectionLabel>
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setNetworkFilter("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  networkFilter === "all" ? "bg-background shadow-xs" : "text-muted-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setNetworkFilter("favourites")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  networkFilter === "favourites" ? "bg-background shadow-xs" : "text-muted-foreground"
                )}
              >
                <Star className="size-3" />
                Favourites
              </button>
            </div>
          </div>
          {appointments === null ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
              <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
            </div>
          ) : (() => {
            const visibleDoctors =
              networkFilter === "favourites" ? network.doctors.filter((d) => favoriteIds.has(d.id)) : network.doctors;
            const visibleClinics = networkFilter === "favourites" ? [] : network.clinics;
            if (visibleDoctors.length === 0 && visibleClinics.length === 0) {
              return (
                <Card className="rounded-xl border-dashed py-8 text-center">
                  <CardContent>
                    <p className="text-sm font-medium">
                      {networkFilter === "favourites" ? "No favourites yet" : "No providers yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {networkFilter === "favourites"
                        ? "Star a doctor from Find Care or their profile to see them here."
                        : "Once you book your first appointment, your doctors and clinics will show up here."}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            return (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {visibleDoctors.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs">
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="text-xs font-semibold">{getInitials(d.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{d.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {d.specialty || "General Practitioner"} · {d.visits} visit{d.visits === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={favoriteIds.has(d.id) ? "Unfavorite" : "Favorite"}
                      onClick={() => toggleFavorite(d.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-warning"
                    >
                      <Star className={cn("size-3.5", favoriteIds.has(d.id) && "fill-amber-400 text-warning")} />
                    </button>
                  </div>
                ))}
                {visibleClinics.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Building2 className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{c.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.visits} visit{c.visits === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div>
          <SectionLabel>Preferred Pharmacy &amp; Lab</SectionLabel>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-3.5 text-muted-foreground">
              <Pill className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium">Pharmacy</p>
                <p className="text-[11px]">Coming soon</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Soon</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-3.5 text-muted-foreground">
              <FlaskConical className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium">Labs</p>
                <p className="text-[11px]">Coming soon</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Soon</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <SectionLabel>Emergency Contact</SectionLabel>
            <HealthSummaryDialog
              trigger={
                <button className="w-full text-left">
                  {patientProfile.emergency_contact_name ? (
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs">
                      <Phone className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold">
                          {patientProfile.emergency_contact_name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {patientProfile.emergency_contact_phone}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-3.5 text-[12.5px] font-semibold text-primary">
                      + Add contact
                    </div>
                  )}
                </button>
              }
            />
          </div>
          <div>
            <SectionLabel>Insurance</SectionLabel>
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-3.5 text-muted-foreground">
              <CreditCard className="size-4 shrink-0" />
              <p className="text-[12px]">Coming soon</p>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Privacy, Consent &amp; Security</SectionLabel>
          <Card className="rounded-xl p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ShieldQuestion className="size-4 text-muted-foreground" />
                <span className="text-[12.5px] font-medium">Consent &amp; data sharing</span>
              </div>
              <Badge variant="outline" className="text-[10px]">Soon</Badge>
            </div>
            <Link
              href="/patient/settings"
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="size-4 text-muted-foreground" />
                <span className="text-[12.5px] font-medium">Sign-in &amp; security</span>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Link>
          </Card>
        </div>
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`truncate ${valueClassName ?? ""}`}>{value}</dd>
    </div>
  );
}
