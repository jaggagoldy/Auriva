"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, Bell, CalendarClock, IndianRupee, MoreHorizontal, Send, Stethoscope, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  formatINR,
  formatTime,
} from "@/shared/queue";
import CheckInButton from "@/components/staff/check-in-button";
import PatientQuickPeek from "@/components/staff/patient-quick-peek";
import RescheduleDialog from "@/components/staff/reschedule-dialog";
import DoctorPicker from "@/components/shared/doctor-picker";
import type { DoctorOption } from "@/components/staff/doctor-filter";
import type { LaneTone } from "@/components/staff/queue-board";

const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

// PKG-4 progressive wait-aging (visual-only, no alerts): the desk naturally
// prioritises the longest waits. Thresholds from the frozen prototype.
function waitAging(minutes: number): { tone: "warn" | "orange" | "crit"; border: string; text: string } | null {
  if (minutes >= 45) return { tone: "crit", border: "border-l-destructive", text: "text-destructive" };
  if (minutes >= 30) return { tone: "orange", border: "border-l-orange-500", text: "text-orange-600 dark:text-orange-400" };
  if (minutes >= 20) return { tone: "warn", border: "border-l-honey", text: "text-honey-deep" };
  return null;
}

interface QueueCardProps {
  appointment: Appointment;
  clinicId: string;
  laneTone: LaneTone;
  /** Bookable doctors for reassignment (M2 · 3.4). */
  doctors: DoctorOption[];
  onOpenDetails: (id: string) => void;
  onChanged: () => void;
}

export default function QueueCard({
  appointment,
  clinicId,
  laneTone,
  doctors,
  onOpenDetails,
  onChanged,
}: QueueCardProps) {
  const router = useRouter();
  const meta = STATUS_META[appointment.status];
  const [busy, setBusy] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);

  // M2 · 3.4 — reassign to another doctor (field update, not a status change).
  // The board reloads via onChanged, so the patient moves A→B queues live.
  const handleReassign = async (newDoctorId: string) => {
    if (newDoctorId === appointment.doctor.id) {
      setReassignOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reception/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointment.id, clinic_id: clinicId, doctor_id: newDoctorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reassignment failed.");
      toast.success(`${appointment.patient.full_name} reassigned to ${data.doctor?.full_name ?? "the doctor"}`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reassignment failed.");
    } finally {
      setBusy(false);
      setReassignOpen(false);
    }
  };

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

  const handleToggleEmergency = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const nextPriority = (appointment.priority ?? 0) >= 100 ? 0 : 100;
      const res = await fetch("/api/reception/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointment.id, clinic_id: clinicId, priority: nextPriority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Priority update failed.");
      toast.success(nextPriority >= 100 ? `Emergency priority active for ${appointment.patient.full_name}` : `Standard queue priority restored`);
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Priority update failed.");
    } finally {
      setBusy(false);
    }
  };

  const isTerminal = TERMINAL_STATUSES.includes(appointment.status);
  const arrived =
    appointment.status === "waiting" ||
    appointment.status === "doctor_ready" ||
    appointment.status === "checked_in";

  // Minutes waited — from check-in when we have it, else scheduled time.
  const since = appointment.checked_in_at ?? appointment.scheduled_time;
  const waitMinutes = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000));
  const aging = arrived ? waitAging(waitMinutes) : null;

  // Milestone 1 — read-only context from the server-enriched queue payload
  // (1.2 Collect amount · 1.6 outstanding balance · 4.4 flags). Display only.
  const allergies = (appointment.patient.allergies ?? "").trim();
  const invoiceBalance = appointment.invoice_balance ?? 0;
  // "Other/prior" due = the patient's total open balance minus THIS visit's
  // invoice (which is shown on the Collect button), so we never double-count.
  const priorDue = Math.max(0, (appointment.patient_outstanding_balance ?? 0) - invoiceBalance);

  return (
    // Not role="button" — it contains real interactive controls (check-in,
    // dropdown), and nesting a button inside a button-role element is
    // invalid ARIA. Clicking the card body is a mouse convenience; keyboard
    // and screen-reader users get the explicit "View details" button.
    <div
      onClick={() => onOpenDetails(appointment.id)}
      className={cn(
        "cursor-pointer rounded-lg border border-l-2 bg-card p-3 shadow-xs transition-colors hover:border-primary/40",
        aging ? aging.border : "border-l-transparent",
        busy && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{appointment.patient.full_name}</p>
            {(appointment.priority ?? 0) >= 100 && (
              <Badge variant="destructive" className="shrink-0 text-[9px] uppercase font-bold tracking-wider">
                Emergency
              </Badge>
            )}
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
          {/* PKG-4: lightweight doctor status on the card */}
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Stethoscope className="size-3 shrink-0" />
            <span className="truncate">{appointment.doctor.full_name}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          {/* PKG-4: wait-aging badge — glanceable, no alert */}
          {aging && (
            <span className={cn("mr-1 text-[11px] font-semibold tabular-nums", aging.text)}>
              {waitMinutes}m
            </span>
          )}
          <PatientQuickPeek
            appointment={appointment}
            onOpenRecord={() => onOpenDetails(appointment.id)}
          />

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
                {appointment.status !== "in_consultation" && (
                  <DropdownMenuItem onClick={handleToggleEmergency}>
                    <AlertTriangle className="text-destructive" />
                    {(appointment.priority ?? 0) >= 100 ? "Clear Emergency" : "Set Emergency Priority"}
                  </DropdownMenuItem>
                )}
                {/* M2 · 4.2 — reschedule (date/time only; doctor + reason preserved).
                    stopPropagation so the click doesn't also open the card drawer. */}
                {appointment.status !== "in_consultation" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setRescheduleOpen(true);
                    }}
                  >
                    <CalendarClock />
                    Reschedule
                  </DropdownMenuItem>
                )}
                {/* M2 · 3.4 — reassign allowed only before the consult begins */}
                {appointment.status !== "in_consultation" && doctors.length > 1 && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setReassignOpen(true);
                    }}
                  >
                    <ArrowRightLeft />
                    Reassign doctor
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
      </div>

      {/* Milestone 1 · 4.4 — read-only context flags (colour + icon + label,
          never colour alone). Returning/New always; allergy + prior due when present. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center rounded-full border bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">
          {appointment.is_returning ? "Returning" : "New"}
        </span>
        {allergies && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-destructive"
            title={`Allergy: ${allergies}`}
          >
            <AlertTriangle className="size-2.5" />
            Allergy
          </span>
        )}
        {priorDue > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-honey-soft bg-honey-tint px-1.5 py-0.5 text-[9.5px] font-semibold text-honey-deep">
            <IndianRupee className="size-2.5" />
            {formatINR(priorDue)} due
          </span>
        )}
      </div>

      {/* Status chip — hidden in the Waiting lane where the wait badge + primary
          action already carry the state, kept where it adds meaning. */}
      {!(laneTone === "waiting" && arrived) && (
        <div className={cn("mt-1.5 flex w-fit items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[11px]", meta.badge)}>
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </div>
      )}

      {/* One action per stage. */}
      <div className="mt-2" onClick={(event) => event.stopPropagation()}>
        {appointment.status === "scheduled" && (
          <CheckInButton
            appointmentId={appointment.id}
            clinicId={clinicId}
            patientName={appointment.patient.full_name}
            onSuccess={onChanged}
          />
        )}
        {appointment.status === "waiting" && (
          <Button size="sm" className="w-full" disabled={busy} onClick={() => setStatus("doctor_ready")}>
            <Send />
            Send in
          </Button>
        )}
        {appointment.status === "doctor_ready" && (
          <p className="text-[11px] font-medium text-primary">Sent in · waiting for the doctor</p>
        )}
        {appointment.status === "completed" &&
          (invoiceBalance > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/staff/billing?patient=${appointment.patient.id}`)}
            >
              <IndianRupee />
              Collect {formatINR(invoiceBalance)}
            </Button>
          ) : (
            <p className="flex items-center gap-1 text-[11px] font-medium text-success">
              <IndianRupee className="size-3" />
              Collected
            </p>
          ))}
      </div>

      {/* M2 · 3.4 — reassign dialog (reuses the shared DoctorPicker) */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Reassign {appointment.patient.full_name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Currently with <span className="font-medium text-foreground">{appointment.doctor.full_name}</span>. Pick a
            new doctor — the patient moves to their queue at the same time. To change the time, use{" "}
            <span className="font-medium text-foreground">Reschedule</span> instead.
          </p>
          <DoctorPicker doctors={doctors} value={appointment.doctor.id} onChange={handleReassign} />
        </DialogContent>
      </Dialog>

      {/* M2 · 4.2 — reschedule dialog */}
      <RescheduleDialog
        key={rescheduleOpen ? `rs-${appointment.scheduled_time}` : "rs-closed"}
        appointment={appointment}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        onRescheduled={onChanged}
      />
    </div>
  );
}
