"use client";

import * as React from "react";
import { Bell, Info, MoreHorizontal, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Appointment,
  AppointmentStatus,
  STATUS_META,
  formatTime,
} from "@/lib/queue";
import CheckInButton from "@/components/staff/check-in-button";

const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

interface QueueCardProps {
  appointment: Appointment;
  clinicId: string;
  onOpenDetails: (id: string) => void;
  onChanged: () => void;
}

export default function QueueCard({
  appointment,
  clinicId,
  onOpenDetails,
  onChanged,
}: QueueCardProps) {
  const meta = STATUS_META[appointment.status];
  const [busy, setBusy] = React.useState(false);

  const setStatus = async (status: AppointmentStatus) => {
    setBusy(true);
    try {
      const res = await fetch("/api/reception/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointment.id, clinic_id: clinicId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed.");
      toast.success(`${appointment.patient.full_name} moved to ${STATUS_META[status].label}`);
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const isTerminal = TERMINAL_STATUSES.includes(appointment.status);

  return (
    // Not role="button" — it contains real interactive controls (check-in,
    // dropdown), and nesting a button inside a button-role element is
    // invalid ARIA. Clicking the card body is a mouse convenience; keyboard
    // and screen-reader users get the explicit "View details" button below.
    <div
      onClick={() => onOpenDetails(appointment.id)}
      className={cn(
        "cursor-pointer rounded-lg border bg-card p-3 shadow-xs transition-colors hover:border-primary/40",
        busy && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{appointment.patient.full_name}</p>
            {appointment.walk_in && (
              <Badge variant="outline" className="shrink-0 text-[9px]">
                Walk-in
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {appointment.queue_number != null ? `#${appointment.queue_number} · ` : ""}
            {formatTime(appointment.scheduled_time)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`View details for ${appointment.patient.full_name}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails(appointment.id);
          }}
        >
          <Info />
        </Button>

        {!isTerminal && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Actions for ${appointment.patient.full_name}`}
                  onClick={(event: React.MouseEvent) => event.stopPropagation()}
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {appointment.status === "waiting" && (
                <DropdownMenuItem onClick={() => setStatus("doctor_ready")}>
                  <Bell />
                  Notify Doctor
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setStatus("no_show")}>
                <UserX />
                Mark No Show
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setStatus("cancelled")}>
                <XCircle />
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className={cn("mt-1.5 flex items-center gap-1.5 text-[11px]", meta.badge, "w-fit rounded-full px-1.5 py-0.5")}>
        <span className={cn("size-1.5 rounded-full", meta.dot)} />
        {meta.label}
      </div>

      {appointment.status === "scheduled" && (
        <div className="mt-2" onClick={(event) => event.stopPropagation()}>
          <CheckInButton
            appointmentId={appointment.id}
            clinicId={clinicId}
            patientName={appointment.patient.full_name}
            onSuccess={onChanged}
          />
        </div>
      )}
    </div>
  );
}
