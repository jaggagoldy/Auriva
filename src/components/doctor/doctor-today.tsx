"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Appointment,
  AppointmentStatus,
  STATUS_META,
  isToday,
  parseMedicines,
} from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";
import MissionControlBar from "@/components/doctor/mission-control-bar";
import ActionCenter, { ActionCenterData } from "@/components/doctor/action-center";
import AnalyticsStrip from "@/components/doctor/analytics-strip";
import QueueSidebar, { QueueScope } from "@/components/doctor/queue-sidebar";
import ConsultWorkbench from "@/components/doctor/consult-workbench";
import ContextPanel from "@/components/doctor/context-panel";

const POLL_INTERVAL_MS = 8_000;
const WAITING_TOO_LONG_MINUTES = 20;

function computeActionCenterData(
  appointments: Appointment[],
  todayAppointments: Appointment[]
): ActionCenterData {
  const now = Date.now();
  const waitingTooLong = todayAppointments.filter(
    (a) =>
      (a.status === "waiting" || a.status === "doctor_ready") &&
      a.checked_in_at &&
      now - new Date(a.checked_in_at).getTime() > WAITING_TOO_LONG_MINUTES * 60_000
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const followUpsDue = appointments.filter(
    (a) => a.follow_up_date && a.follow_up_date.slice(0, 10) <= todayStr && a.status === "completed"
  );
  const needsSignature = appointments.filter((a) => {
    if (a.status === "in_consultation" && !isToday(a.scheduled_time)) return true;
    if (a.status === "completed" && isToday(a.scheduled_time)) {
      return !a.diagnosis?.trim() && !a.prescription_notes?.trim();
    }
    return false;
  });
  return { waitingTooLong, followUpsDue, needsSignature };
}

export default function DoctorToday() {
  const doctor = useDoctorSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<QueueScope>("today");
  const [search, setSearch] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);

  const overridesRef = React.useRef(new Map<string, AppointmentStatus>());

  const loadQueue = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?doctor_id=${doctor.id}`, { cache: "no-store" });
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
  }, [doctor.id]);

  React.useEffect(() => {
    loadQueue();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadQueue();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  const todayAppointments = React.useMemo(
    () => (appointments ?? []).filter((a) => isToday(a.scheduled_time)),
    [appointments]
  );

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
      .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  }, [appointments, scope, search]);

  const effectiveSelectedId = React.useMemo(() => {
    if (selectedId && visible?.some((a) => a.id === selectedId)) return selectedId;
    if (!visible || visible.length === 0) return null;
    const first =
      visible.find((a) => a.status === "in_consultation") ??
      visible.find((a) => a.status === "doctor_ready") ??
      visible.find((a) => a.status === "waiting") ??
      visible.find((a) => a.status === "scheduled") ??
      visible[0];
    return first.id;
  }, [visible, selectedId]);

  const selected = appointments?.find((a) => a.id === effectiveSelectedId) ?? null;

  const nextUp = React.useMemo(() => {
    return (
      todayAppointments.find((a) => a.status === "doctor_ready") ??
      todayAppointments
        .filter((a) => a.status === "waiting")
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ??
      null
    );
  }, [todayAppointments]);

  // Every patient who has completed more than one visit with this doctor —
  // real, derived from full appointment history, not guessed.
  const returningPatientIds = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of appointments ?? []) {
      if (a.status !== "completed") continue;
      counts.set(a.patient_id, (counts.get(a.patient_id) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([id]) => id));
  }, [appointments]);

  // Real medicine names this doctor has actually prescribed before, ranked
  // by frequency — powers the Prescription Editor's "Recently prescribed".
  const recentMedicines = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of appointments ?? []) {
      for (const m of parseMedicines(a.prescription_medicines_json)) {
        if (!m.name.trim()) continue;
        counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [appointments]);

  const patientHistory = React.useMemo(() => {
    if (!selected) return [];
    return (appointments ?? [])
      .filter((a) => a.patient_id === selected.patient_id && a.id !== selected.id)
      .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
  }, [appointments, selected]);

  const actionCenterData: ActionCenterData = React.useMemo(
    () => computeActionCenterData(appointments ?? [], todayAppointments),
    [appointments, todayAppointments]
  );

  const handleUpdateStatus = React.useCallback(
    async (appointment: Appointment, next: AppointmentStatus) => {
      overridesRef.current.set(appointment.id, next);
      setAppointments(
        (previous) =>
          previous?.map((item) => (item.id === appointment.id ? { ...item, status: next } : item)) ?? null
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
        toast.success(`${appointment.patient.full_name} is now ${STATUS_META[next].label.toLowerCase()}.`);
        loadQueue();
      } catch {
        overridesRef.current.delete(appointment.id);
        toast.error("Couldn't update the appointment", {
          description: "Check your connection and try again.",
        });
        loadQueue();
      } finally {
        setUpdating(false);
      }
    },
    [loadQueue]
  );

  const handleSaveClinical = React.useCallback(
    async (
      appointment: Appointment,
      patch: Record<string, string | null>,
      opts?: { silent?: boolean }
    ) => {
      try {
        const res = await fetch(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const updated = await res.json();
        setAppointments(
          (previous) => previous?.map((item) => (item.id === appointment.id ? updated : item)) ?? null
        );
      } catch {
        if (!opts?.silent) {
          toast.error("Couldn't save your changes", { description: "Check your connection and try again." });
        }
      }
    },
    []
  );

  const handleCallIn = (appointment: Appointment) => {
    setSelectedId(appointment.id);
    handleUpdateStatus(appointment, "in_consultation");
  };
  const handleSkip = (appointment: Appointment) => handleUpdateStatus(appointment, "skipped");
  const handleRecall = (appointment: Appointment) => handleUpdateStatus(appointment, "waiting");

  const handleActionCenterSelect = (appointmentId: string) => {
    setScope("all");
    setSelectedId(appointmentId);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MissionControlBar
        doctorName={doctor.full_name}
        clinicName={doctor.clinic.name}
        todayAppointments={todayAppointments}
        nextUp={nextUp}
        refreshing={refreshing}
        lastSyncedAt={lastSyncedAt}
        onRefresh={handleRefresh}
        onCallIn={handleCallIn}
        updating={updating}
      />
      <ActionCenter data={actionCenterData} onSelect={handleActionCenterSelect} />
      <AnalyticsStrip todayAppointments={todayAppointments} allAppointments={appointments ?? []} />

      {error && appointments === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            className="text-sm font-medium text-primary underline underline-offset-4"
            onClick={handleRefresh}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <QueueSidebar
            appointments={visible}
            selectedId={effectiveSelectedId}
            scope={scope}
            search={search}
            returningPatientIds={returningPatientIds}
            onSelect={setSelectedId}
            onScopeChange={setScope}
            onSearchChange={setSearch}
            onSkip={handleSkip}
            onRecall={handleRecall}
          />
          <ConsultWorkbench
            appointment={selected}
            doctorId={doctor.id}
            recentMedicines={recentMedicines}
            updating={updating}
            onUpdateStatus={handleUpdateStatus}
            onSaveClinical={handleSaveClinical}
          />
          {selected && <ContextPanel appointment={selected} history={patientHistory} />}
        </div>
      )}
    </div>
  );
}
