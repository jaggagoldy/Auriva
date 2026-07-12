"use client";

import * as React from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Appointment, STATUS_META, formatTime } from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export default function DoctorSchedule() {
  const doctor = useDoctorSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [weekStart, setWeekStart] = React.useState<Date>(() => startOfWeek(new Date()));
  const [tab, setTab] = React.useState<"calendar" | "availability">("calendar");

  React.useEffect(() => {
    fetch(`/api/appointments?doctor_id=${doctor.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setAppointments)
      .catch(() => setAppointments([]));
  }, [doctor.id]);

  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const byDay = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(day.toDateString(), []);
    for (const a of appointments ?? []) {
      const key = new Date(a.scheduled_time).toDateString();
      if (map.has(key)) {
        map.get(key)!.push(a);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    }
    return map;
  }, [days, appointments]);

  const today = new Date().toDateString();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
        <h1 className="text-sm font-semibold">Schedule</h1>
        <div className="flex items-center rounded-lg bg-muted p-0.5">
          <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
            Calendar
          </TabButton>
          <TabButton active={tab === "availability"} onClick={() => setTab("availability")}>
            Availability
          </TabButton>
        </div>
        {tab === "calendar" && weekStart && (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft />
            </Button>
            <span className="px-2 text-[12.5px] font-medium tabular-nums">
              {days[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
              {days[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight />
            </Button>
          </div>
        )}
      </header>

      {tab === "availability" ? (
        <AvailabilityEditor doctorId={doctor.id} />
      ) : appointments === null ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="grid min-w-[980px] grid-cols-7 gap-3">
            {days.map((day) => {
              const items = byDay.get(day.toDateString()) ?? [];
              const isToday = day.toDateString() === today;
              return (
                <div
                  key={day.toDateString()}
                  className={cn("flex min-h-[420px] flex-col rounded-xl border", isToday && "border-primary/50 bg-primary/[0.03]")}
                >
                  <div className={cn("border-b px-3 py-2 text-center", isToday && "bg-primary/5")}>
                    <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className={cn("text-sm font-semibold", isToday && "text-primary")}>
                      {day.getDate()}
                      {isToday && <span className="ml-1 text-[9px] font-bold text-primary uppercase">Today</span>}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5 p-2">
                    {items.length === 0 ? (
                      <p className="pt-4 text-center text-[10.5px] text-muted-foreground">No visits</p>
                    ) : (
                      items.map((a) => {
                        const meta = STATUS_META[a.status];
                        return (
                          <div key={a.id} className={cn("rounded-md border-l-2 px-2 py-1.5 text-[11px]", meta.badge)}>
                            <div className="font-semibold tabular-nums">{formatTime(a.scheduled_time)}</div>
                            <div className="truncate">{a.patient.full_name}</div>
                            <div className="mt-0.5 truncate text-[9.5px] opacity-75">Clinic Session · {a.clinic.name}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium">Session types:</span>
            <Badge variant="outline" className="font-normal">Clinic Session</Badge>
            {["Hospital Session", "Teleconsultation", "Personal Block", "Leave", "Emergency Slot"].map((label) => (
              <Badge key={label} variant="outline" className="font-normal text-muted-foreground/60">
                {label} · Soon
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors",
        active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// Sprint 3 (OPS-001 §5): the doctor's recurring weekly working hours, backed
// by GET/PUT /api/doctors/[id]/availability. One working window per weekday —
// date-specific holiday/leave overrides remain an honest "coming soon" below.

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

const DEFAULT_DAY: DayHours = { enabled: false, start: "09:00", end: "17:00" };

function AvailabilityEditor({ doctorId }: { doctorId: string }) {
  const [days, setDays] = React.useState<DayHours[] | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/doctors/${doctorId}/availability`, { cache: "no-store" })
      .then((res) => res.json())
      .then((rows: { day_of_week: number; start_time: string; end_time: string }[]) => {
        if (cancelled) return;
        const base = Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }));
        for (const row of rows ?? []) {
          if (row.day_of_week >= 0 && row.day_of_week <= 6) {
            base[row.day_of_week] = { enabled: true, start: row.start_time, end: row.end_time };
          }
        }
        setDays(base);
        setDirty(false);
      })
      .catch(() => {
        if (!cancelled) setDays(Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY })));
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  function update(index: number, patch: Partial<DayHours>) {
    setDays((prev) =>
      prev ? prev.map((d, i) => (i === index ? { ...d, ...patch } : d)) : prev
    );
    setDirty(true);
  }

  async function save() {
    if (!days) return;
    const entries = days.flatMap((d, i) =>
      d.enabled ? [{ day_of_week: i, start_time: d.start, end_time: d.end }] : []
    );
    for (const e of entries) {
      if (e.start_time >= e.end_time) {
        toast.error(`${WEEKDAYS[e.day_of_week]}: start time must be before end time.`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Could not save availability");
      }
      toast.success("Working hours saved");
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save availability");
    } finally {
      setSaving(false);
    }
  }

  if (days === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-xl border bg-card">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Weekly working hours</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Your recurring availability for clinic sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
              {dirty && <span className="text-[11px] text-muted-foreground">Unsaved changes</span>}
              <Button size="sm" disabled={!dirty || saving} onClick={save}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving…" : "Save hours"}
              </Button>
            </div>
          </header>
          <div className="divide-y">
            {days.map((day, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-24 text-sm font-medium">{WEEKDAYS[i]}</span>
                <Button
                  type="button"
                  variant={day.enabled ? "default" : "outline"}
                  size="sm"
                  className="w-24"
                  onClick={() => update(i, { enabled: !day.enabled })}
                >
                  {day.enabled ? "Working" : "Day off"}
                </Button>
                {day.enabled ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      aria-label={`${WEEKDAYS[i]} start time`}
                      value={day.start}
                      onChange={(e) => update(i, { start: e.target.value })}
                      className="rounded-md border bg-background px-2 py-1 tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                      type="time"
                      aria-label={`${WEEKDAYS[i]} end time`}
                      value={day.end}
                      onChange={(e) => update(i, { end: e.target.value })}
                      className="rounded-md border bg-background px-2 py-1 tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                ) : (
                  <span className="text-[12.5px] text-muted-foreground">Not available</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <CalendarClock className="mt-0.5 size-4 shrink-0" />
          <p>
            Date-specific overrides — holidays, leave, teleconsultation windows and emergency
            slots — are coming next. These weekly hours are the recurring baseline.
          </p>
        </div>
      </div>
    </div>
  );
}
