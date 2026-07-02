"use client";

import * as React from "react";
import {
  Clock,
  FileText,
  History,
  Loader2,
  Phone,
  StickyNote,
  Stethoscope,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
}

export default function AppointmentDrawer({
  appointmentId,
  open,
  onOpenChange,
}: AppointmentDrawerProps) {
  const [appointment, setAppointment] = React.useState<Appointment | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/appointments/${appointmentId}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data: Appointment) => {
        if (!cancelled) setAppointment(data);
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
                <SectionHeading icon={History} label="Previous Visits" />
                <p className="text-sm text-muted-foreground">
                  Visit history will appear here in a future update.
                </p>
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
