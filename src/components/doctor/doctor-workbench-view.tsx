"use client";

// PKG-3 Consult Workbench — its own tab (queue rail · consult · context panel).
// Selecting a patient on Today opens this with ?appointment=<id>. The clinical
// state/logic lives here; Today is a light landing that links in.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

import {
  Appointment,
  AppointmentStatus,
  STATUS_META,
  isToday,
  parseMedicines,
} from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";
import QueueSidebar, { QueueScope } from "@/components/doctor/queue-sidebar";
import ConsultWorkbench from "@/components/doctor/consult-workbench";
import ContextPanel from "@/components/doctor/context-panel";

const POLL_INTERVAL_MS = 8_000;

export default function DoctorWorkbenchView() {
  const doctor = useDoctorSession();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(searchParams.get("appointment"));
  const [scope, setScope] = React.useState<QueueScope>("today");
  const [search, setSearch] = React.useState("");
  const [updating, setUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Focus mode: the doctor can collapse the queue rail and/or the clinical
  // snapshot to concentrate on the consultation (requested in M2 review).
  const [showQueue, setShowQueue] = React.useState(true);
  const [showContext, setShowContext] = React.useState(true);

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
      setError(null);
    } catch {
      setError("Could not load the appointment queue.");
    }
  }, [doctor.id]);

  React.useEffect(() => {
    loadQueue();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadQueue();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const visible = React.useMemo(() => {
    if (!appointments) return null;
    const query = search.trim().toLowerCase();
    return appointments
      .filter(
        (a) =>
          (scope === "all" || isToday(a.scheduled_time)) &&
          (!query ||
            a.patient.full_name.toLowerCase().includes(query) ||
            a.patient.blood_group.toLowerCase().includes(query))
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

  const returningPatientIds = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of appointments ?? []) {
      if (a.status !== "completed") continue;
      counts.set(a.patient_id, (counts.get(a.patient_id) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([id]) => id));
  }, [appointments]);

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

  const handleUpdateStatus = React.useCallback(
    async (appointment: Appointment, next: AppointmentStatus) => {
      overridesRef.current.set(appointment.id, next);
      setAppointments(
        (previous) => previous?.map((item) => (item.id === appointment.id ? { ...item, status: next } : item)) ?? null
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
        toast.error("Couldn't update the appointment", { description: "Check your connection and try again." });
        loadQueue();
      } finally {
        setUpdating(false);
      }
    },
    [loadQueue]
  );

  const handleSaveClinical = React.useCallback(
    async (appointment: Appointment, patch: Record<string, string | null>, opts?: { silent?: boolean }) => {
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

  const handleSkip = (a: Appointment) => handleUpdateStatus(a, "skipped");
  const handleRecall = (a: Appointment) => handleUpdateStatus(a, "waiting");

  if (error && appointments === null) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button type="button" className="text-sm font-medium text-primary underline underline-offset-4" onClick={loadQueue}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-1">
      {/* Left: queue rail — collapsible to focus on the consult */}
      {showQueue ? (
        <div className="relative flex min-h-0 shrink-0">
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
          <button
            type="button"
            onClick={() => setShowQueue(false)}
            aria-label="Hide queue"
            title="Hide queue"
            className="absolute top-2 right-2 z-10 grid size-6 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-muted"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowQueue(true)}
          aria-label="Show queue"
          title="Show queue"
          className="flex w-9 shrink-0 justify-center border-r bg-sidebar pt-3 text-muted-foreground transition-colors hover:bg-muted"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <ConsultWorkbench
        appointment={selected}
        doctorId={doctor.id}
        recentMedicines={recentMedicines}
        updating={updating}
        onUpdateStatus={handleUpdateStatus}
        onSaveClinical={handleSaveClinical}
      />

      {/* Right: clinical snapshot — collapsible */}
      {selected &&
        (showContext ? (
          <div className="relative flex min-h-0 shrink-0">
            <button
              type="button"
              onClick={() => setShowContext(false)}
              aria-label="Hide clinical snapshot"
              title="Hide clinical snapshot"
              className="absolute top-2 left-2 z-10 grid size-6 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <PanelRightClose className="size-3.5" />
            </button>
            <ContextPanel appointment={selected} history={patientHistory} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowContext(true)}
            aria-label="Show clinical snapshot"
            title="Show clinical snapshot"
            className="flex w-9 shrink-0 justify-center border-l bg-card pt-3 text-muted-foreground transition-colors hover:bg-muted"
          >
            <PanelRightOpen className="size-4" />
          </button>
        ))}
    </div>
  );
}
