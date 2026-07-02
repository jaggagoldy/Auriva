"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import GlobalSearch from "@/components/staff/global-search";
import DoctorFilter, { DoctorOption } from "@/components/staff/doctor-filter";
import QueueColumn from "@/components/staff/queue-column";
import WalkInModal from "@/components/staff/walkin-modal";
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

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
        <h1 className="text-sm font-semibold">Queue Board</h1>
        <div className="ml-auto flex items-center gap-2">
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
          {clinicId && <WalkInModal clinicId={clinicId} doctors={doctors} onRegistered={load} />}
        </div>
      </header>

      {error && appointments === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : appointments !== null && appointments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <Inbox className="size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">The queue is empty</p>
          <p className="text-xs text-muted-foreground">
            No appointments match the current filters for today.
          </p>
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
      />
    </div>
  );
}
