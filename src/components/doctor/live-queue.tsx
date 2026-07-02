"use client";

import * as React from "react";
import {
  Activity,
  Building2,
  CalendarDays,
  Loader2,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Appointment,
  AppointmentStatus,
  Doctor,
  STATUS_META,
  formatDay,
  formatTime,
  getInitials,
  isToday,
} from "@/lib/queue";
import ConsultationPane from "./consultation-pane";
import QueueSidebar, { QueueScope } from "./queue-sidebar";

const DOCTOR_STORAGE_KEY = "clinic_console_doctor_id";
const POLL_INTERVAL_MS = 8_000;

export default function LiveQueue() {
  const [doctors, setDoctors] = React.useState<Doctor[] | null>(null);
  const [doctorId, setDoctorId] = React.useState<string>("");
  const [appointments, setAppointments] = React.useState<
    Appointment[] | null
  >(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<QueueScope>("today");
  const [search, setSearch] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);

  // Optimistic status changes, kept until the server confirms them so
  // background polling doesn't silently revert the queue.
  const overridesRef = React.useRef(new Map<string, AppointmentStatus>());

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/doctors", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data: Doctor[] = await res.json();
        if (cancelled) return;
        setDoctors(data);
        const stored = localStorage.getItem(DOCTOR_STORAGE_KEY);
        const initial =
          data.find((doctor) => doctor.id === stored) ?? data[0] ?? null;
        setDoctorId(initial?.id ?? "");
        if (data.length === 0) setError("No doctor profiles found.");
      } catch {
        if (!cancelled) setError("Could not load doctor profiles.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Never toggles `refreshing` on synchronously — background polling is
  // silent; the manual refresh handler sets the flag before calling this.
  const loadQueue = React.useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/appointments?doctor_id=${id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data: Appointment[] = await res.json();
        const overrides = overridesRef.current;
        const merged = data.map((appointment) => {
          const override = overrides.get(appointment.id);
          if (!override) return appointment;
          if (override === appointment.status) {
            overrides.delete(appointment.id);
            return appointment;
          }
          return { ...appointment, status: override };
        });
        setAppointments(merged);
        setLastSyncedAt(new Date());
        setError(null);
      } catch {
        setError("Could not load the appointment queue.");
      } finally {
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load (silent — the empty queue already renders skeletons) and
  // background polling while the tab is visible.
  React.useEffect(() => {
    if (!doctorId) return;
    loadQueue(doctorId);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadQueue(doctorId);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [doctorId, loadQueue]);

  const handleRefresh = () => {
    if (!doctorId) return;
    setRefreshing(true);
    loadQueue(doctorId);
  };

  const handleDoctorChange = (id: string) => {
    if (id === doctorId) return;
    setDoctorId(id);
    setAppointments(null);
    setSelectedId(null);
    setError(null);
    localStorage.setItem(DOCTOR_STORAGE_KEY, id);
  };

  const visible = React.useMemo(() => {
    if (!appointments) return null;
    const query = search.trim().toLowerCase();
    return appointments
      .filter(
        (appointment) =>
          (scope === "all" || isToday(appointment.scheduled_time)) &&
          (!query ||
            appointment.patient.full_name.toLowerCase().includes(query) ||
            appointment.patient.blood_group.toLowerCase().includes(query))
      )
      .sort(
        (a, b) =>
          new Date(a.scheduled_time).getTime() -
          new Date(b.scheduled_time).getTime()
      );
  }, [appointments, scope, search]);

  // Effective selection is derived: the user's pick if still visible,
  // otherwise the most urgent visible patient.
  const effectiveSelectedId = React.useMemo(() => {
    if (selectedId && visible?.some((a) => a.id === selectedId)) {
      return selectedId;
    }
    if (!visible || visible.length === 0) return null;
    const first =
      visible.find((a) => a.status === "in_consultation") ??
      visible.find((a) => a.status === "waiting") ??
      visible.find((a) => a.status === "scheduled") ??
      visible[0];
    return first.id;
  }, [visible, selectedId]);

  const selected =
    appointments?.find(
      (appointment) => appointment.id === effectiveSelectedId
    ) ?? null;
  const currentDoctor =
    doctors?.find((doctor) => doctor.id === doctorId) ?? null;

  const handleUpdateStatus = React.useCallback(
    async (appointment: Appointment, next: AppointmentStatus) => {
      overridesRef.current.set(appointment.id, next);
      setAppointments(
        (previous) =>
          previous?.map((item) =>
            item.id === appointment.id ? { ...item, status: next } : item
          ) ?? null
      );
      setUpdating(true);
      try {
        const res = await fetch(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        overridesRef.current.delete(appointment.id);
        toast.success(
          `${appointment.patient.full_name} is now ${STATUS_META[next].label.toLowerCase()}.`
        );
        if (doctorId) loadQueue(doctorId);
      } catch {
        toast.message("Status updated locally", {
          description:
            "The appointment update endpoint isn't live yet, so this change won't persist after a reload.",
        });
      } finally {
        setUpdating(false);
      }
    },
    [doctorId, loadQueue]
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Aegis Clinic OS</div>
            <div className="text-[11px] text-muted-foreground">
              Doctor Console
            </div>
          </div>
        </div>

        {currentDoctor && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              <span className="max-w-48 truncate">
                {currentDoctor.clinic.name}
              </span>
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>{formatDay(new Date())}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground">
            {refreshing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            )}
            <span className="tabular-nums">
              {lastSyncedAt ? `Live · ${formatTime(lastSyncedAt)}` : "Live"}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh queue"
            disabled={!doctorId || refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>

          <Select
            value={doctorId ?? ""}
            onValueChange={(value) => handleDoctorChange(value as string)}
          >
            <SelectTrigger size="sm" className="w-56" aria-label="Doctor">
              <SelectValue>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Stethoscope className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {currentDoctor?.full_name ?? "Select doctor"}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(doctors ?? []).map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  <span>{doctor.full_name}</span>
                  {doctor.specialty && (
                    <span className="text-muted-foreground">
                      · {doctor.specialty}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold">
              {currentDoctor ? getInitials(currentDoctor.full_name) : "…"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {error && appointments === null && doctors !== null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <QueueSidebar
            appointments={visible}
            selectedId={effectiveSelectedId}
            scope={scope}
            search={search}
            onSelect={setSelectedId}
            onScopeChange={setScope}
            onSearchChange={setSearch}
          />
          <ConsultationPane
            appointment={selected}
            updating={updating}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      )}
    </div>
  );
}
