"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  FileText,
  History,
  Loader2,
  Phone,
  StickyNote,
  Stethoscope,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Appointment,
  STATUS_META,
  formatDay,
  formatTime,
  getInitials,
} from "@/shared/queue";
import TimelineCard from "@/components/shared/timeline-card";

interface AppointmentDrawerProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reception-only: /staff/patients/[id] requires a receptionist/admin session, so the doctor console never sets this. */
  showFullHistoryLink?: boolean;
  /** Reception-only: reschedule/cancel are front-desk actions, not part of the doctor console. */
  allowActions?: boolean;
  onChanged?: () => void;
}

export default function AppointmentDrawer({
  appointmentId,
  open,
  onOpenChange,
  showFullHistoryLink = false,
  allowActions = false,
  onChanged,
}: AppointmentDrawerProps) {
  const [appointment, setAppointment] = React.useState<Appointment | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [previousVisits, setPreviousVisits] = React.useState<Appointment[] | null>(null);
  const [reschedulingOpen, setReschedulingOpen] = React.useState(false);
  const [rescheduleValue, setRescheduleValue] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreviousVisits(null);
    setReschedulingOpen(false);
    setRescheduleValue("");
    fetch(`/api/appointments/${appointmentId}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: Appointment) => {
        if (cancelled) return;
        setAppointment(data);
        // Real visit history (APS timeline) — was a hardcoded "future update"
        // placeholder even though this data has been real for a while.
        fetch(`/api/appointments?patient_id=${data.patient.id}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : []))
          .then((all: Appointment[]) => {
            if (cancelled) return;
            const past = all
              .filter((a) => a.id !== data.id && a.status === "completed")
              .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
            setPreviousVisits(past);
          })
          .catch(() => {
            if (!cancelled) setPreviousVisits([]);
          });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load appointment details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId]);

  const meta = appointment ? STATUS_META[appointment.status] : null;
  const canReschedule = allowActions && appointment?.status === "scheduled";
  const canCancel =
    allowActions &&
    appointment !== null &&
    !["completed", "cancelled", "no_show"].includes(appointment.status);

  const handleReschedule = async () => {
    if (!appointment || !rescheduleValue) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_time: new Date(rescheduleValue).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not reschedule.");
      setAppointment(data);
      setReschedulingOpen(false);
      toast.success("Appointment rescheduled");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reschedule.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not cancel.");
      setAppointment(data);
      toast.success("Appointment cancelled");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Appointment Details</SheetTitle>
          <SheetDescription>
            Patient, visit and activity information.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && (
            <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
          )}

          {!loading && appointment && meta && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="size-11 rounded-lg">
                  <AvatarFallback className="rounded-lg text-sm font-semibold">
                    {getInitials(appointment.patient.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">
                      {appointment.patient.full_name}
                    </h3>
                    {appointment.walk_in && (
                      <Badge variant="outline" className="text-[10px]">
                        Walk-in
                      </Badge>
                    )}
                  </div>
                  <Badge className={cn("mt-1 gap-1.5", meta.badge)}>
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                    {appointment.queue_number != null && (
                      <span className="tabular-nums">· #{appointment.queue_number}</span>
                    )}
                  </Badge>
                </div>
              </div>

              {(canReschedule || canCancel || appointment.status === "completed") && (
                <div className="flex flex-wrap items-center gap-2">
                  {canReschedule && !reschedulingOpen && (
                    <Button variant="outline" size="sm" onClick={() => setReschedulingOpen(true)}>
                      <CalendarClock />
                      Reschedule
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={actionLoading}
                      onClick={handleCancel}
                    >
                      <X />
                      Cancel appointment
                    </Button>
                  )}
                  {appointment.status === "completed" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={`/print/prescription/${appointment.id}`} target="_blank" rel="noreferrer" />}
                      >
                        <FileText />
                        Print prescription
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<a href={`/print/visit-summary/${appointment.id}`} target="_blank" rel="noreferrer" />}
                      >
                        <FileText />
                        Visit summary
                      </Button>
                    </>
                  )}
                </div>
              )}

              {canReschedule && reschedulingOpen && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                  <Input
                    type="datetime-local"
                    value={rescheduleValue}
                    onChange={(e) => setRescheduleValue(e.target.value)}
                    className="h-8 flex-1 bg-background text-sm"
                  />
                  <Button size="sm" disabled={!rescheduleValue || actionLoading} onClick={handleReschedule}>
                    {actionLoading ? <Loader2 className="animate-spin" /> : "Confirm"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setReschedulingOpen(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              <dl className="space-y-3 text-sm">
                <DetailRow icon={Phone} label="Contact Number">
                  <span className="font-mono">
                    {appointment.patient.user?.phone_number ?? "—"}
                  </span>
                </DetailRow>
                <DetailRow icon={Clock} label="Appointment Time">
                  {formatDay(appointment.scheduled_time)} · {formatTime(appointment.scheduled_time)}
                </DetailRow>
                <DetailRow icon={Stethoscope} label="Doctor">
                  {appointment.doctor.full_name}
                  {appointment.doctor.specialty && (
                    <span className="text-muted-foreground"> · {appointment.doctor.specialty}</span>
                  )}
                </DetailRow>
                {appointment.notes && (
                  <DetailRow icon={StickyNote} label="Notes">
                    {appointment.notes}
                  </DetailRow>
                )}
              </dl>

              <Separator />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <SectionHeading icon={History} label="Previous Visits" />
                  {showFullHistoryLink && (
                    <Link
                      href={`/staff/patients/${appointment.patient.id}`}
                      className="flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline"
                    >
                      View full history
                      <ArrowRight className="size-3" />
                    </Link>
                  )}
                </div>
                {previousVisits === null ? (
                  <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
                ) : previousVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous completed visits yet.</p>
                ) : (
                  <div className="space-y-2">
                    {previousVisits.slice(0, 4).map((visit) => (
                      <div key={visit.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{visit.diagnosis || "Consultation"}</span>
                          <span className="text-[11px] text-muted-foreground">{formatDay(visit.scheduled_time)}</span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {visit.doctor.full_name}
                          {visit.doctor.specialty ? ` · ${visit.doctor.specialty}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <SectionHeading icon={FileText} label="Uploaded Documents" />
                <p className="text-sm text-muted-foreground">
                  Document uploads will appear here in a future update.
                </p>
              </div>

              <Separator />

              <div>
                <SectionHeading icon={Clock} label="Activity Timeline" />
                <TimelineCard events={appointment.events ?? []} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground" />
      <h4 className="text-sm font-semibold">{label}</h4>
    </div>
  );
}
