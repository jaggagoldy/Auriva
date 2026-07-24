"use client";

import * as React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// P2 (Doctor Calendar & Availability) — the weekly working-hours grid the solo
// owner edits, wired to GET/PUT /api/doctors/[id]/availability. Each working
// day carries hours + an optional recurring break + an optional per-day patient
// cap (the DoctorAvailability columns added this batch). Patient booking
// (getBookableSlots) already consumes all of it. Slot-duration/buffer (clinic-
// level) and holidays (time blocks) are a following sub-slice.

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  max_patients: number | null;
}

interface DayState {
  enabled: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
  maxPatients: string;
}

// Clinic-friendly order (Mon first), mapped to day_of_week (0=Sun).
const DAYS = [
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
] as const;

const DEFAULT_DAY: DayState = {
  enabled: false,
  start: "09:00",
  end: "17:00",
  breakStart: "",
  breakEnd: "",
  maxPatients: "",
};

const timeCls =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];
const BUFFERS = [0, 5, 10, 15, 30];

export function AvailabilitySettings({ doctorId, clinicId }: { doctorId: string | null; clinicId: string }) {
  const [days, setDays] = React.useState<Record<number, DayState>>(() =>
    Object.fromEntries(DAYS.map((d) => [d.dow, { ...DEFAULT_DAY }]))
  );
  // Clinic-level scheduling knobs (default_slot_duration_minutes / buffer_minutes).
  const [slotDuration, setSlotDuration] = React.useState(15);
  const [buffer, setBuffer] = React.useState(0);
  // Only "loading" when there's actually a profile to fetch — avoids a
  // synchronous setState in the effect for the no-doctor case.
  const [loading, setLoading] = React.useState(() => doctorId != null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Clinic-level slot/buffer come from the clinic record.
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/clinics/${clinicId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (cancelled || !c) return;
        if (typeof c.default_slot_duration_minutes === "number") setSlotDuration(c.default_slot_duration_minutes);
        if (typeof c.buffer_minutes === "number") setBuffer(c.buffer_minutes);
      });
    return () => { cancelled = true; };
  }, [clinicId]);

  React.useEffect(() => {
    if (!doctorId) return; // nothing to fetch; loading is already false
    let cancelled = false;
    fetch(`/api/doctors/${doctorId}/availability`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: AvailabilityRow[]) => {
        if (cancelled) return;
        setDays((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            next[row.day_of_week] = {
              enabled: true,
              start: row.start_time,
              end: row.end_time,
              breakStart: row.break_start ?? "",
              breakEnd: row.break_end ?? "",
              maxPatients: row.max_patients != null ? String(row.max_patients) : "",
            };
          }
          return next;
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctorId]);

  function patch(dow: number, p: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [dow]: { ...prev[dow], ...p } }));
    setSaved(false);
  }

  async function save() {
    if (!doctorId) return toast.error("No doctor profile to update.");
    const entries: {
      day_of_week: number; start_time: string; end_time: string;
      break_start: string | null; break_end: string | null; max_patients: number | null;
    }[] = [];

    for (const { dow } of DAYS) {
      const d = days[dow];
      if (!d.enabled) continue;
      if (d.start >= d.end) return toast.error("Start time must be before end time.");
      const hasBreak = !!d.breakStart || !!d.breakEnd;
      if (hasBreak && (!d.breakStart || !d.breakEnd)) return toast.error("A break needs both a start and an end time.");
      const max = d.maxPatients.trim() ? Number(d.maxPatients) : null;
      if (max != null && (!Number.isInteger(max) || max < 1)) return toast.error("Maximum patients must be a whole number above 0.");
      entries.push({
        day_of_week: dow,
        start_time: d.start,
        end_time: d.end,
        break_start: hasBreak ? d.breakStart : null,
        break_end: hasBreak ? d.breakEnd : null,
        max_patients: max,
      });
    }

    setSaving(true);
    try {
      // Clinic-level slot/buffer first — if it fails, don't half-save.
      const clinicRes = await fetch(`/api/clinics/${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_slot_duration_minutes: slotDuration, buffer_minutes: buffer }),
      });
      if (!clinicRes.ok) {
        const d = await clinicRes.json().catch(() => ({}));
        toast.error(d.message ?? "Couldn't save slot duration.");
        return;
      }

      const res = await fetch(`/api/doctors/${doctorId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.message ?? "Couldn't save your availability."); return; }
      setSaved(true);
      toast.success("Availability saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Availability &amp; scheduling</h2>
          <p className="text-xs text-muted-foreground">
            The hours patients can book. Add a daily break or a per-day limit if you need one.
          </p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="size-3" /> Saved
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : !doctorId ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No doctor profile is linked to this clinic yet.</p>
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-4 rounded-xl border bg-muted/30 p-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Appointment length</span>
              <select value={slotDuration} onChange={(e) => { setSlotDuration(Number(e.target.value)); setSaved(false); }} className={cn(timeCls, "w-28")}>
                {SLOT_DURATIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Buffer between patients</span>
              <select value={buffer} onChange={(e) => { setBuffer(Number(e.target.value)); setSaved(false); }} className={cn(timeCls, "w-28")}>
                {BUFFERS.map((m) => <option key={m} value={m}>{m === 0 ? "None" : `${m} min`}</option>)}
              </select>
            </label>
          </div>

          {DAYS.map(({ dow, label }) => {
            const d = days[dow];
            return (
              <div
                key={dow}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  d.enabled ? "border-border bg-card" : "border-border/60 bg-muted/30"
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => patch(dow, { enabled: e.target.checked })}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    {label}
                  </label>

                  {d.enabled ? (
                    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex items-center gap-1.5">
                        <input type="time" value={d.start} onChange={(e) => patch(dow, { start: e.target.value })} className={cn(timeCls, "w-28")} aria-label={`${label} opens at`} />
                        <span className="text-xs text-muted-foreground">to</span>
                        <input type="time" value={d.end} onChange={(e) => patch(dow, { end: e.target.value })} className={cn(timeCls, "w-28")} aria-label={`${label} closes at`} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Break</span>
                        <input type="time" value={d.breakStart} onChange={(e) => patch(dow, { breakStart: e.target.value })} className={cn(timeCls, "w-24")} aria-label={`${label} break start`} />
                        <span className="text-xs text-muted-foreground">–</span>
                        <input type="time" value={d.breakEnd} onChange={(e) => patch(dow, { breakEnd: e.target.value })} className={cn(timeCls, "w-24")} aria-label={`${label} break end`} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Max/day</span>
                        <Input
                          inputMode="numeric"
                          value={d.maxPatients}
                          onChange={(e) => patch(dow, { maxPatients: e.target.value.replace(/\D/g, "") })}
                          placeholder="∞"
                          className="h-9 w-16"
                          aria-label={`${label} maximum patients`}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-1">
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Save availability
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
