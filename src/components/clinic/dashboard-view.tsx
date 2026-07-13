"use client";

// BRD-043 Sprint 3 (US-302/303/304/305) — the adaptive dashboard UI. Renders
// one of four role layouts from the SERVER-shaped payload of
// GET /api/clinic/dashboard. The component never receives, and therefore
// cannot leak, data outside its role's shape — financial exclusion for the
// Doctor is enforced at the API, not here. Faithful to the approved prototype
// design/mockups/brd-043-team-management.html (dashboard section).
//
// Sprint 3 boundary: displays team summaries only; "Manage team" navigates to
// the Team screen. No suspend/archive/reassign here (Sprint 4).

import * as React from "react";
import { Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Appt {
  id: string;
  time: string;
  patient_name: string;
  initials: string;
  status: string;
  walk_in: boolean;
  is_follow_up: boolean;
  reason: string | null;
  doctor_name?: string | null;
}
interface TeamMember {
  name: string;
  initials: string;
  role: string;
  status: string;
  is_owner: boolean;
}
interface Team {
  members: TeamMember[];
  active_count: number;
}
interface Dashboard {
  role: "practice_owner" | "managing_doctor" | "doctor" | "receptionist";
  greeting: string;
  clinic_name: string;
  owner_name: string | null;
  kpis?: Record<string, number>;
  my_queue?: Appt[];
  appointments_today?: Appt[];
  appointments_all_doctors?: Appt[];
  today_appointments?: Appt[];
  waiting_queue?: Appt[];
  walk_ins?: Appt[];
  follow_ups?: Appt[];
  recent_consultations?: Appt[];
  next_patient?: Appt | null;
  practice_performance?: { collected_today: number; pending_collections: number };
  pending_to_collect?: { count: number; amount: number };
  team?: Team;
  alerts?: string[];
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
function apptMeta(a: Appt) {
  const bits: string[] = [];
  if (a.status === "checked_in" || a.status === "waiting") bits.push("Waiting");
  else bits.push(clockTime(a.time));
  if (a.is_follow_up) bits.push("Follow-up");
  else if (a.walk_in) bits.push("Walk-in");
  if (a.doctor_name) bits.push(a.doctor_name);
  return bits.join(" · ");
}

export function DashboardView({ goto }: { goto?: (v: string) => void }) {
  const [data, setData] = React.useState<Dashboard | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/clinic/dashboard", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Couldn&apos;t load your dashboard.</Card>;
  }
  if (!data) {
    return <div className="flex justify-center py-24 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  }

  const eyebrow = {
    practice_owner: "Practice Owner",
    managing_doctor: "Managing Doctor",
    doctor: "Doctor",
    receptionist: "Receptionist",
  }[data.role];
  const question = {
    practice_owner: "How is my clinic performing today?",
    managing_doctor: "How are my patients and my practice doing today?",
    doctor: "Who is my next patient?",
    receptionist: "Who is waiting and what needs attention?",
  }[data.role];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">{question}</h1>
      </div>

      {data.role === "managing_doctor" && <ManagingDoctor d={data} goto={goto} />}
      {data.role === "practice_owner" && <PracticeOwner d={data} goto={goto} />}
      {data.role === "doctor" && <Doctor d={data} />}
      {data.role === "receptionist" && <Receptionist d={data} />}
    </div>
  );
}

function Kpi({ value, label, accent }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3.5", accent && "border-primary/25 bg-primary/[0.03]")}>
      <div className="font-display text-xl font-extrabold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-2.5 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </Card>
  );
}

function AppointmentRow({ a }: { a: Appt }) {
  return (
    <div className="flex items-center gap-3 border-b py-2 last:border-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold uppercase">
        {a.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{a.patient_name}</div>
        <div className="truncate text-xs text-muted-foreground">{apptMeta(a)}</div>
      </div>
      {(a.status === "checked_in" || a.status === "waiting") && (
        <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">Waiting</span>
      )}
    </div>
  );
}

function EmptyList({ label }: { label: string }) {
  return <p className="py-3 text-center text-xs text-muted-foreground">{label}</p>;
}

function TeamCard({ team, goto }: { team: Team; goto?: (v: string) => void }) {
  const pillClass = (status: string) =>
    status === "active"
      ? "bg-primary/10 text-primary"
      : status === "suspended"
        ? "bg-rose-500/10 text-rose-600"
        : "bg-muted text-muted-foreground";
  return (
    <SectionCard title="Team overview">
      {team.members.length === 0 ? (
        <EmptyList label="Just you so far" />
      ) : (
        team.members.map((m, i) => (
          <div key={i} className="flex items-center gap-3 border-b py-2 last:border-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold uppercase">{m.initials}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.role}</div>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", pillClass(m.status))}>{m.status}</span>
          </div>
        ))
      )}
      {goto && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => goto("settings")}>
          <Users className="size-4" /> Manage team
        </Button>
      )}
    </SectionCard>
  );
}

function AlertsCard({ alerts }: { alerts: string[] }) {
  if (!alerts.length) return null;
  return (
    <SectionCard title="Operational alerts">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center gap-2 py-1 text-sm">
          <span className="size-1.5 shrink-0 rounded-full bg-honey-deep" />
          <span>{a}</span>
        </div>
      ))}
    </SectionCard>
  );
}

// ---- Managing Doctor (richest) ----
function ManagingDoctor({ d, goto }: { d: Dashboard; goto?: (v: string) => void }) {
  const k = d.kpis ?? {};
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi value={k.in_my_queue ?? 0} label="In my queue" />
        <Kpi value={k.appointments_today ?? 0} label="Appointments today" />
        <Kpi value={inr(k.revenue_today ?? 0)} label="Revenue today" accent />
        <Kpi value={`${k.team_active ?? 0} active`} label="Team status" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionCard title="My consultation queue">
            {d.my_queue?.length ? d.my_queue.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No one in your queue right now" />}
          </SectionCard>
          <SectionCard title="Practice performance">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-display text-lg font-extrabold">{inr(d.practice_performance?.collected_today ?? 0)}</div>
                <div className="text-xs text-muted-foreground">Collected today</div>
              </div>
              <div>
                <div className="font-display text-lg font-extrabold text-rose-600">{inr(d.practice_performance?.pending_collections ?? 0)}</div>
                <div className="text-xs text-muted-foreground">Pending collections</div>
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="space-y-4">
          {d.team && <TeamCard team={d.team} goto={goto} />}
          {d.alerts && <AlertsCard alerts={d.alerts} />}
        </div>
      </div>
    </>
  );
}

// ---- Practice Owner (business only, no personal queue) ----
function PracticeOwner({ d, goto }: { d: Dashboard; goto?: (v: string) => void }) {
  const k = d.kpis ?? {};
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi value={k.appointments_today ?? 0} label="Appointments today" />
        <Kpi value={inr(k.revenue_today ?? 0)} label="Revenue today" accent />
        <Kpi value={inr(k.pending_collections ?? 0)} label="Pending collections" />
        <Kpi value={`${k.team_active ?? 0} active`} label="Team status" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today's appointments — all doctors">
          {d.appointments_all_doctors?.length ? d.appointments_all_doctors.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No appointments today" />}
        </SectionCard>
        <div className="space-y-4">
          {d.team && <TeamCard team={d.team} goto={goto} />}
          {d.alerts && <AlertsCard alerts={d.alerts} />}
        </div>
      </div>
    </>
  );
}

// ---- Doctor (clinical only — financial content is not in the payload) ----
function Doctor({ d }: { d: Dashboard }) {
  return (
    <>
      <Card className="border-none bg-[linear-gradient(158deg,#0B4A41,#0A423A)] p-4 text-white">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-honey">Next patient</div>
        {d.next_patient ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 font-display font-bold uppercase">{d.next_patient.initials}</span>
            <div>
              <div className="font-display text-base font-bold">{d.next_patient.patient_name}</div>
              <div className="text-xs text-[#CFE3DC]">{apptMeta(d.next_patient)}</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-[#CFE3DC]">No one waiting — you&apos;re all caught up.</div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today's appointments">
          {d.appointments_today?.length ? d.appointments_today.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No appointments today" />}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Follow-ups due">
            {d.follow_ups?.length ? d.follow_ups.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No follow-ups due" />}
          </SectionCard>
          <SectionCard title="Recent consultations">
            {d.recent_consultations?.length ? d.recent_consultations.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No recent consultations" />}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

// ---- Receptionist (front-desk operations only) ----
function Receptionist({ d }: { d: Dashboard }) {
  const k = d.kpis ?? {};
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <Kpi value={k.waiting_now ?? 0} label="Waiting now" />
        <Kpi value={k.appointments_today ?? 0} label="Appointments today" />
        <Kpi value={k.walk_ins ?? 0} label="Walk-in" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Waiting queue">
          {d.waiting_queue?.length ? d.waiting_queue.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No one waiting right now" />}
        </SectionCard>
        <div className="space-y-4">
          <SectionCard title="Today's appointments">
            {d.today_appointments?.length ? d.today_appointments.map((a) => <AppointmentRow key={a.id} a={a} />) : <EmptyList label="No appointments today" />}
          </SectionCard>
          <SectionCard title="Pending to collect">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-lg font-extrabold">{inr(d.pending_to_collect?.amount ?? 0)}</div>
              <div className="text-xs text-muted-foreground">{d.pending_to_collect?.count ?? 0} open invoice(s)</div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
