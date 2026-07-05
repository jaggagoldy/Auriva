"use client";

import * as React from "react";
import { HeartPulse, Loader2, Search, Star } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Appointment, formatDay, getInitials } from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";

interface PatientSummary {
  id: string;
  full_name: string;
  blood_group: string;
  chronic_conditions: string | null;
  visits: number;
  lastVisit: string;
  lastDiagnosis: string | null;
}

function summarizePatients(appointments: Appointment[]): PatientSummary[] {
  const byPatient = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const list = byPatient.get(a.patient_id) ?? [];
    list.push(a);
    byPatient.set(a.patient_id, list);
  }
  const summaries: PatientSummary[] = [];
  for (const [patientId, list] of byPatient) {
    list.sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
    const latest = list[0];
    const lastDiagnosed = list.find((a) => a.diagnosis?.trim());
    summaries.push({
      id: patientId,
      full_name: latest.patient.full_name,
      blood_group: latest.patient.blood_group,
      chronic_conditions: latest.patient.chronic_conditions ?? null,
      visits: list.filter((a) => a.status === "completed").length,
      lastVisit: latest.scheduled_time,
      lastDiagnosis: lastDiagnosed?.diagnosis ?? null,
    });
  }
  return summaries.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());
}

export default function DoctorPatients() {
  const doctor = useDoctorSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    fetch(`/api/appointments?doctor_id=${doctor.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setAppointments)
      .catch(() => setAppointments([]));
  }, [doctor.id]);

  const patients = React.useMemo(() => summarizePatients(appointments ?? []), [appointments]);
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.full_name.toLowerCase().includes(q));
  }, [patients, search]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
        <h1 className="text-sm font-semibold">
          Patients
          {appointments && <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{patients.length}</span>}
        </h1>
        <div className="relative ml-auto w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </header>

      {appointments === null ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium">No patients found</p>
          <p className="text-xs text-muted-foreground">
            {patients.length === 0 ? "You haven't seen any patients yet." : "Nothing matches your search."}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr] bg-muted/50 px-4 py-2 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>Patient</span>
              <span>Last visit</span>
              <span>Visits</span>
              <span>Last diagnosis</span>
            </div>
            <div className="divide-y">
              {filtered.map((p) => (
                <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1.5fr] items-center px-4 py-2.5 text-[12.5px]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-[10.5px] font-semibold">{getInitials(p.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{p.full_name}</span>
                        {p.chronic_conditions?.trim() && (
                          <HeartPulse className="size-3 shrink-0 text-destructive" aria-label="Chronic condition on file" />
                        )}
                      </div>
                      <span className="text-[10.5px] text-muted-foreground">Blood {p.blood_group}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground">{formatDay(p.lastVisit)}</span>
                  <span className="text-muted-foreground tabular-nums">{p.visits}</span>
                  <span className="truncate text-muted-foreground">{p.lastDiagnosis || "—"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Star className="size-3.5" />
            Favourites, high-risk and follow-up-due filters are coming soon.
          </div>
        </div>
      )}
    </div>
  );
}
