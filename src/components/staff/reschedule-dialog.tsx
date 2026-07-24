"use client";

// Milestone 2 · 4.2 — reschedule a booking. Product Office decision C: reuse the
// existing scheduling engine (PATCH /api/appointments/[id] with scheduled_time
// only → the guarded rescheduleAppointment path), NOT a new one. Reception
// changes ONLY the date/time; the doctor, appointment reason, and type are
// preserved automatically because the backend updates nothing else.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Appointment } from "@/shared/queue";

interface RescheduleDialogProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled: () => void;
}

/** ISO → the value a <input type="datetime-local"> expects (local, no seconds). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RescheduleDialog({ appointment, open, onOpenChange, onRescheduled }: RescheduleDialogProps) {
  // Seeded from the current time via a lazy initializer (pure — parsing an ISO,
  // not reading the clock). The parent remounts this on open (key) so it always
  // reflects the latest scheduled_time — no set-state-in-effect.
  const [when, setWhen] = React.useState(() => toLocalInput(appointment.scheduled_time));
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!when) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_time: new Date(when).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Couldn't reschedule.");
      toast.success(`${appointment.patient.full_name} rescheduled`);
      onRescheduled();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reschedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Reschedule {appointment.patient.full_name}</DialogTitle>
        </DialogHeader>

        {/* Preserved (read-only) — reception only changes the date/time */}
        <dl className="rounded-lg border bg-muted/40 p-3 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Doctor</dt>
            <dd className="font-medium">{appointment.doctor.full_name}</dd>
          </div>
          {appointment.notes?.trim() && (
            <div className="mt-1 flex justify-between gap-3">
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="max-w-[60%] truncate text-right font-medium">{appointment.notes}</dd>
            </div>
          )}
        </dl>

        <div className="space-y-1.5">
          <Label htmlFor="reschedule-when">New date &amp; time</Label>
          <Input id="reschedule-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>

        <Button className="w-full" disabled={saving || !when} onClick={submit}>
          {saving ? <Loader2 className="animate-spin" /> : "Confirm new time"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
