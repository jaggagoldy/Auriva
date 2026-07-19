"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Clock, Inbox, Loader2, RefreshCw, Users } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

import GlobalSearch from "@/components/staff/global-search";
import DoctorFilter, { DoctorOption } from "@/components/staff/doctor-filter";
import QueueColumn from "@/components/staff/queue-column";
import WalkInModal from "@/components/staff/walkin-modal";
import BookAppointmentDialog from "@/components/staff/book-appointment-dialog";
import AppointmentDrawer from "@/components/shared/appointment-drawer";
import { Appointment, AppointmentStatus, QUEUE_ORDER } from "@/shared/queue";

const POLL_INTERVAL_MS = 8_000;

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

  const handleReorder = async (status: AppointmentStatus, orderedIds: string[]) => {
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

  const grouped = React.useMemo(() => {
    const map = new Map<AppointmentStatus, Appointment[]>();
    for (const status of QUEUE_ORDER) map.set(status, []);
    for (const appointment of appointments ?? []) {
      map.get(appointment.status)?.push(appointment);
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
            <span key={d.name} className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {d.name} is approximately {d.minutes} minutes behind schedule
            </span>
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
            title="The queue is empty"
            description="No appointments match the current filters for today."
            className="border-0"
          />
        </div>
      ) : appointments === null ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {QUEUE_ORDER.map((status) => (
            <QueueColumn
              key={status}
              status={status}
              appointments={grouped.get(status) ?? []}
              clinicId={clinicId ?? ""}
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
