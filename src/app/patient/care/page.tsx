"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import { Calendar, Clock, MapPin, Loader2, Plus, X, Inbox, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePatientSession } from "@/components/patient/patient-session";
import { Appointment, AppointmentStatus, Doctor, STATUS_META, formatDay, formatTime, getInitials } from "@/shared/queue";

const CANCELLABLE_STATUSES = ["scheduled", "checked_in", "waiting", "doctor_ready"];
const PAST_STATUSES = ["completed", "cancelled", "no_show"];

const PAST_FILTERS = [
  { id: "all", label: "All", statuses: PAST_STATUSES },
  { id: "completed", label: "Completed", statuses: ["completed"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  { id: "no_show", label: "No-show", statuses: ["no_show"] },
] as const;

// Simplified 4-stage view of the real 8-state machine, for a patient-facing
// stepper — collapses waiting/doctor_ready into "Checked-in".
const STEPPER_STAGES: { status: AppointmentStatus; label: string }[] = [
  { status: "scheduled", label: "Scheduled" },
  { status: "checked_in", label: "Checked-in" },
  { status: "in_consultation", label: "In Consultation" },
  { status: "completed", label: "Completed" },
];
const STEPPER_RANK: Partial<Record<AppointmentStatus, number>> = {
  scheduled: 0,
  checked_in: 1,
  waiting: 1,
  doctor_ready: 1,
  in_consultation: 2,
  completed: 3,
};

export default function PatientCarePage() {
  const { patientProfile } = usePatientSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [pastFilter, setPastFilter] = React.useState<(typeof PAST_FILTERS)[number]["id"]>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const fetchAppointments = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?patient_id=${patientProfile.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      setAppointments(await res.json());
    } catch (err) {
      toast.error("Could not load appointments");
      console.error(err);
    }
  }, [patientProfile.id]);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const upcoming = (appointments ?? [])
    .filter((a) => !PAST_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  const activePastFilter = PAST_FILTERS.find((f) => f.id === pastFilter)!;
  const past = (appointments ?? [])
    .filter((a) => (activePastFilter.statuses as readonly string[]).includes(a.status))
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
  const visible = tab === "upcoming" ? upcoming : past;

  const selected = (appointments ?? []).find((a) => a.id === selectedId) ?? visible[0] ?? null;
  const effectiveSelectedId = selected?.id ?? null;

  // Reschedule mode fixes the doctor (only the time can move) — a minimal
  // Doctor shape built from the appointment's own embedded doctor/clinic,
  // since the dialog's UI never reads the `user` fields in this mode.
  const rescheduleDoctor: Doctor | null = selected
    ? {
        id: selected.doctor.id,
        full_name: selected.doctor.full_name,
        specialty: selected.doctor.specialty,
        clinic_id: selected.doctor.clinic_id,
        clinic: selected.clinic,
        user: { id: selected.doctor.user_id, email: null, phone_number: "" },
      }
    : null;

  const handleCancel = async (appointmentId: string) => {
    setCancellingId(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel appointment");
      toast.success("Appointment cancelled");
      setAppointments((prev) =>
        prev ? prev.map((a) => (a.id === appointmentId ? { ...a, status: "cancelled" } : a)) : prev
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="grid h-[calc(100dvh-58px)] grid-cols-1 lg:grid-cols-[1fr_400px]">
      <div className="overflow-y-auto px-7 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Appointments</h1>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setTab("upcoming")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  tab === "upcoming" ? "bg-background shadow-xs" : "text-muted-foreground"
                )}
              >
                Upcoming
              </button>
              <button
                onClick={() => setTab("past")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  tab === "past" ? "bg-background shadow-xs" : "text-muted-foreground"
                )}
              >
                Past
              </button>
            </div>
            <BookAppointmentDialog
              patientId={patientProfile.id}
              onBooked={fetchAppointments}
              trigger={
                <Button size="sm">
                  <Plus className="size-3.5" />
                  New
                </Button>
              }
            />
          </div>
        </div>

        {tab === "past" && (
          <div className="mb-3.5 flex gap-1.5">
            {PAST_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setPastFilter(f.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  pastFilter === f.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {appointments === null ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
            </p>
            <p className="text-xs text-muted-foreground">
              {tab === "upcoming" ? "Book a doctor to get started." : "Completed visits will show up here."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((appt) => {
              const meta = STATUS_META[appt.status];
              const active = appt.id === effectiveSelectedId;
              return (
                <button
                  key={appt.id}
                  onClick={() => setSelectedId(appt.id)}
                  className={cn(
                    "w-full rounded-xl border bg-card p-4 text-left shadow-xs transition-colors",
                    active ? "border-primary/50 ring-1 ring-primary/30" : "hover:border-primary/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="text-xs font-semibold">
                          {getInitials(appt.doctor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{appt.doctor.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appt.doctor.specialty || "General Practitioner"} · {formatDay(appt.scheduled_time)},{" "}
                          {formatTime(appt.scheduled_time)}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn("shrink-0 gap-1.5", meta.badge)}>
                      <span className={cn("size-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="hidden border-l bg-muted/20 px-6 py-6 lg:block lg:overflow-y-auto">
        {!selected ? (
          <p className="pt-10 text-center text-xs text-muted-foreground">Select an appointment to see details.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">Appointment details</p>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <Avatar className="size-12 shrink-0">
                <AvatarFallback className="text-sm font-semibold">
                  {getInitials(selected.doctor.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{selected.doctor.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.doctor.specialty || "General Practitioner"}
                </p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-2.5 py-4 text-[12.5px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5" />
                {formatDay(selected.scheduled_time)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5" />
                {formatTime(selected.scheduled_time)}
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <span className="text-foreground">{selected.clinic.name}</span> — {selected.clinic.address}
                </span>
              </div>
            </div>
            <div className="h-px bg-border" />

            {selected.status === "cancelled" || selected.status === "no_show" ? (
              <div className="mt-4 rounded-lg border bg-background p-3">
                <Badge className={cn("gap-1.5", STATUS_META[selected.status].badge)}>
                  <span className={cn("size-1.5 rounded-full", STATUS_META[selected.status].dot)} />
                  {STATUS_META[selected.status].label}
                </Badge>
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  {selected.status === "cancelled"
                    ? "This appointment was cancelled and won't count toward your active appointments."
                    : "This appointment was marked as a no-show by the clinic."}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border bg-background p-3">
                <p className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Status
                </p>
                <div className="flex items-center">
                  {STEPPER_STAGES.map((stage, i) => {
                    const currentRank = STEPPER_RANK[selected.status] ?? 0;
                    const stageRank = STEPPER_RANK[stage.status] ?? 0;
                    const done = stageRank < currentRank || selected.status === "completed";
                    const active = stageRank === currentRank && selected.status !== "completed";
                    return (
                      <React.Fragment key={stage.status}>
                        {i > 0 && (
                          <div
                            className={cn(
                              "h-0.5 flex-1",
                              done || active ? "bg-primary" : "bg-border"
                            )}
                          />
                        )}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              done
                                ? "bg-primary text-primary-foreground"
                                : active
                                  ? "border-2 border-primary text-primary"
                                  : "border border-border text-muted-foreground"
                            )}
                          >
                            {done ? <Check className="size-3" /> : i + 1}
                          </div>
                          <span className="whitespace-nowrap text-[9.5px] font-medium text-muted-foreground">
                            {stage.label}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
            {CANCELLABLE_STATUSES.includes(selected.status) && (
              <div className="mt-4 flex gap-2">
                <BookAppointmentDialog
                  patientId={patientProfile.id}
                  onBooked={fetchAppointments}
                  initialDoctor={rescheduleDoctor}
                  rescheduleAppointmentId={selected.id}
                  trigger={
                    <Button variant="secondary" className="flex-1">
                      Reschedule
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={cancellingId === selected.id}
                  onClick={() => handleCancel(selected.id)}
                >
                  {cancellingId === selected.id ? <Loader2 className="animate-spin" /> : <X />}
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
