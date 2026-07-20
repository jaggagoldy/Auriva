"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Clock, Inbox, Loader2, RefreshCw, Stethoscope, Users } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import GlobalSearch from "@/components/staff/global-search";
import DoctorFilter, { DoctorOption } from "@/components/staff/doctor-filter";
import QueueColumn from "@/components/staff/queue-column";
import WalkInModal from "@/components/staff/walkin-modal";
import BookAppointmentDialog from "@/components/staff/book-appointment-dialog";
import AppointmentDrawer from "@/components/shared/appointment-drawer";
import { Appointment, AppointmentStatus, getInitials } from "@/shared/queue";

const POLL_INTERVAL_MS = 8_000;

// PKG-4: the board shows three operational lanes, not every internal status.
// Existing workflow states are mapped into lanes (no new states, no new engine).
export type LaneTone = "waiting" | "active" | "done";
export interface Lane {
  key: string;
  label: string;
  tone: LaneTone;
  statuses: AppointmentStatus[];
}
const LANES: Lane[] = [
  {
    key: "waiting",
    label: "Waiting",
    tone: "waiting",
    statuses: ["scheduled", "checked_in", "waiting", "doctor_ready", "skipped"],
  },
  { key: "in_consultation", label: "In consultation", tone: "active", statuses: ["in_consultation"] },
  { key: "done", label: "Done · to collect", tone: "done", statuses: ["completed"] },
];

export default function QueueBoard() {
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = React.useState<DoctorOption[]>([]);
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [doctorId, setDoctorId] = React.useState("all");
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (doctorId !== "all") params.set("doctor_id", doctorId);
      if (search.trim()) params.set("search", search.trim());

      const [queueRes, dashRes] = await Promise.all([
        fetch(`/api/reception/queue?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/reception/dashboard", { cache: "no-store" }),
      ]);
      if (!queueRes.ok) throw new Error(`Request failed (${queueRes.status})`);
      const queueData: Appointment[] = await queueRes.json();
      setAppointments(queueData);
      setError(null);

      if (dashRes.ok) {
        const dash = await dashRes.json();
        setClinicId(dash.clinic_id);
        setDoctors(
          dash.doctors.map((d: any) => ({ id: d.id, full_name: d.full_name, specialty: d.specialty }))
        );
      }
    } catch {
      setError("Could not load the queue.");
    } finally {
      setRefreshing(false);
    }
  }, [doctorId, search]);

  React.useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleReorder = async (orderedIds: string[]) => {
    if (!clinicId) return;
    // Optimistic: reassign descending priority within this column immediately.
    setAppointments((previous) => {
      if (!previous) return previous;
      const priorityById = new Map(orderedIds.map((id, index) => [id, orderedIds.length - index]));
      return previous.map((appointment) =>
        priorityById.has(appointment.id)
          ? { ...appointment, priority: priorityById.get(appointment.id)! }
          : appointment
      );
    });

    await Promise.all(
      orderedIds.map((id, index) =>
        fetch("/api/reception/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: id,
            clinic_id: clinicId,
            priority: orderedIds.length - index,
          }),
        }).catch(() => null)
      )
    );
  };

  const laneItems = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const lane of LANES) map.set(lane.key, []);
    const laneOf = (status: AppointmentStatus) =>
      LANES.find((l) => l.statuses.includes(status));
    for (const appointment of appointments ?? []) {
      // Only completed visits from *today* belong in Done · to collect.
      if (appointment.status === "completed") {
        const done = appointment.completed_at ?? appointment.scheduled_time;
        if (new Date(done).toDateString() !== new Date().toDateString()) continue;
      }
      const lane = laneOf(appointment.status);
      if (lane) map.get(lane.key)!.push(appointment);
    }
    return map;
  }, [appointments]);

  // PKG-4 operational awareness strip (V1) — existing data only. Informational,
  // not a warning: queue size, longest current wait, and any doctor running
  // behind. No notify action, no capacity thresholds (deferred, Product Office).
  const awareness = React.useMemo(() => {
    const waitingList = (appointments ?? []).filter(
      (a) => a.status === "waiting" || a.status === "doctor_ready"
    );
    const now = Date.now();
    const longestWait = waitingList.reduce((max, a) => {
      const since = a.checked_in_at ? new Date(a.checked_in_at).getTime() : new Date(a.scheduled_time).getTime();
      const mins = Math.floor((now - since) / 60000);
      return mins > max ? mins : max;
    }, 0);
    const behindByDoctor = new Map<string, number>();
    for (const a of waitingList) {
      const late = Math.floor((now - new Date(a.scheduled_time).getTime()) / 60000);
      if (late > 0 && a.doctor_id) {
        behindByDoctor.set(a.doctor_id, Math.max(behindByDoctor.get(a.doctor_id) ?? 0, late));
      }
    }
    const doctorDelays = [...behindByDoctor.entries()]
      .map(([id, m]) => ({ name: doctors.find((d) => d.id === id)?.full_name ?? "A doctor", minutes: Math.round(m / 5) * 5 }))
      .filter((d) => d.minutes >= 5)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 2);
    return { waiting: waitingList.length, longestWait, doctorDelays };
  }, [appointments, doctors]);

  // PKG-4 doctor strip — per-doctor caseload today (who's with a patient, and
  // how many are waiting for them). Existing data only; no rooms, no routing.
  const doctorActivity = React.useMemo(() => {
    const byId = new Map<
      string,
      { id: string; name: string; specialty: string | null; waiting: number; inConsult: number; done: number }
    >();
    for (const a of appointments ?? []) {
      if (!a.doctor_id) continue;
      const e =
        byId.get(a.doctor_id) ??
        { id: a.doctor_id, name: a.doctor.full_name, specialty: a.doctor.specialty, waiting: 0, inConsult: 0, done: 0 };
      if (a.status === "waiting" || a.status === "doctor_ready" || a.status === "checked_in") e.waiting++;
      else if (a.status === "in_consultation") e.inConsult++;
      else if (a.status === "completed") e.done++;
      byId.set(a.doctor_id, e);
    }
    return [...byId.values()].sort((a, b) => b.inConsult - a.inConsult || b.waiting - a.waiting);
  }, [appointments]);

  return (
    <div className="flex h-dvh flex-col">
      {/* PKG-4 Board: "Today's flow" hero — front-desk framing + guidance */}
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-6 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Front desk · live</div>
          <h1 className="text-lg font-bold tracking-tight">Today&apos;s flow</h1>
          <p className="text-xs text-muted-foreground">Check people in, move the queue, keep the room moving.</p>
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch value={search} onChange={setSearch} className="w-64" />
          <DoctorFilter doctors={doctors} value={doctorId} onChange={setDoctorId} />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh queue"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
          </Button>
          {clinicId && <BookAppointmentDialog clinicId={clinicId} doctors={doctors} onBooked={load} />}
          {clinicId && <WalkInModal clinicId={clinicId} doctors={doctors} onRegistered={load} />}
        </div>
      </header>

      {/* PKG-4 operational awareness strip — calm, glanceable, existing data only */}
      {appointments !== null && awareness.waiting > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b bg-muted/30 px-6 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {awareness.waiting} patient{awareness.waiting === 1 ? "" : "s"} waiting
          </span>
          {awareness.longestWait > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Longest current wait: {awareness.longestWait} minute{awareness.longestWait === 1 ? "" : "s"}
            </span>
          )}
          {awareness.doctorDelays.map((d) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-honey-soft bg-honey-tint px-2 py-0.5 font-medium text-honey-deep"
            >
              <Clock className="size-3.5" />
              {d.name} ~{d.minutes} min behind
            </span>
          ))}
        </div>
      )}

      {/* PKG-4 doctor strip — each doctor's caseload right now */}
      {appointments !== null && doctorActivity.length > 0 && (
        <div className="flex shrink-0 gap-2.5 overflow-x-auto border-b bg-card px-6 py-3">
          {doctorActivity.map((d) => (
            <div
              key={d.id}
              className="flex min-w-[210px] items-center gap-2.5 rounded-xl border bg-background px-3 py-2"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-accent text-[11px] font-semibold text-accent-foreground">
                  {getInitials(d.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{d.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", d.inConsult ? "bg-primary" : "bg-success")} />
                  {d.inConsult ? "In consultation" : "Available"}
                  {d.specialty ? ` · ${d.specialty}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={cn(
                    "text-base font-bold leading-none tabular-nums",
                    d.waiting > 0 ? "text-honey-deep" : "text-muted-foreground"
                  )}
                >
                  {d.waiting}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Stethoscope className="size-3" />
                  waiting
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && appointments === null ? (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState title={error} description="" onRetry={handleRefresh} className="border-0" />
        </div>
      ) : appointments !== null && appointments.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Inbox}
            title="Waiting room is clear"
            description="You're all caught up — no one is waiting. Register a walk-in when the next patient arrives."
            className="border-0"
            action={
              clinicId ? (
                <WalkInModal clinicId={clinicId} doctors={doctors} onRegistered={load} />
              ) : undefined
            }
          />
        </div>
      ) : appointments === null ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4">
          {LANES.map((lane) => (
            <QueueColumn
              key={lane.key}
              lane={lane}
              appointments={laneItems.get(lane.key) ?? []}
              clinicId={clinicId ?? ""}
              doctors={doctors}
              onOpenDetails={setDrawerId}
              onChanged={load}
              onReorder={handleReorder}
            />
          ))}
        </div>
      )}

      <AppointmentDrawer
        appointmentId={drawerId}
        open={drawerId !== null}
        onOpenChange={(open) => !open && setDrawerId(null)}
        showFullHistoryLink
        allowActions
        onChanged={load}
      />
    </div>
  );
}
