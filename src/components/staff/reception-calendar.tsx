"use client";

// PKG-4 Reception Calendar — every doctor's day, side by side (doctors as
// columns, time-slot rows). Tap a free slot to book. Reads existing data
// (reception dashboard for doctors, /api/appointments per doctor); no new
// scheduling capability, no availability editing.

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Appointment, STATUS_META } from "@/shared/queue";
import { DoctorOption } from "@/components/staff/doctor-filter";
import BookAppointmentDialog from "@/components/staff/book-appointment-dialog";

// The clinic day, in 30-minute slots (Sunrise runs 09:00–20:00).
const DAY_START = 9;
const DAY_END = 20;
const SLOTS: { label: string; minutes: number }[] = [];
for (let h = DAY_START; h < DAY_END; h++) {
  for (const m of [0, 30]) {
    SLOTS.push({
      label: `${String(h % 12 === 0 ? 12 : h % 12)}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`,
      minutes: h * 60 + m,
    });
  }
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export default function ReceptionCalendar() {
  const [date, setDate] = React.useState<Date | null>(null);
  const [doctors, setDoctors] = React.useState<DoctorOption[]>([]);
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [byDoctor, setByDoctor] = React.useState<Map<string, Appointment[]> | null>(null);
  const [booking, setBooking] = React.useState<{ doctorId: string; scheduledTime: string } | null>(null);

  // Clock reads only in effects (never render), per project convention.
  React.useEffect(() => {
    setDate(new Date());
  }, []);

  const load = React.useCallback(async (forDate: Date) => {
    setByDoctor(null);
    const dashRes = await fetch("/api/reception/dashboard", { cache: "no-store" });
    if (!dashRes.ok) return;
    const dash = await dashRes.json();
    const docs: DoctorOption[] = dash.doctors.map((d: DoctorOption) => ({
      id: d.id,
      full_name: d.full_name,
      specialty: d.specialty,
    }));
    setDoctors(docs);
    setClinicId(dash.clinic_id);

    const key = dateKey(forDate);
    const entries = await Promise.all(
      docs.map(async (doc) => {
        const res = await fetch(`/api/appointments?doctor_id=${doc.id}`, { cache: "no-store" });
        const list: Appointment[] = res.ok ? await res.json() : [];
        const sameDay = list.filter((a) => dateKey(new Date(a.scheduled_time)) === key);
        return [doc.id, sameDay] as const;
      })
    );
    setByDoctor(new Map(entries));
  }, []);

  React.useEffect(() => {
    if (date) load(date);
  }, [date, load]);

  const shiftDay = (delta: number) => {
    setDate((prev) => {
      const base = prev ?? new Date();
      const next = new Date(base);
      next.setDate(base.getDate() + delta);
      return next;
    });
  };

  const openBook = (doctorId: string, slotMinutes: number) => {
    if (!date) return;
    const d = new Date(date);
    d.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
    // datetime-local wants "YYYY-MM-DDTHH:MM" in local time.
    const local = `${dateKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setBooking({ doctorId, scheduledTime: local });
  };

  const heading = date
    ? date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "";
  const isToday = date ? dateKey(date) === dateKey(new Date()) : false;

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b px-6 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Front desk</div>
        <h1 className="text-lg font-bold tracking-tight">Clinic calendar</h1>
        <p className="text-xs text-muted-foreground">Every doctor&apos;s day, side by side. Tap a free slot to book.</p>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b px-6 py-2.5">
        <Button variant="outline" size="icon-sm" aria-label="Previous day" onClick={() => shiftDay(-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next day" onClick={() => shiftDay(1)}>
          <ChevronRight />
        </Button>
        <Button variant={isToday ? "secondary" : "outline"} size="sm" onClick={() => setDate(new Date())}>
          Today
        </Button>
        <span className="ml-1 text-sm font-semibold">{heading}</span>
      </div>

      {byDoctor === null ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No doctors on this clinic yet.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className="grid min-w-max"
            style={{ gridTemplateColumns: `5rem repeat(${doctors.length}, minmax(11rem, 1fr))` }}
          >
            {/* Header row */}
            <div className="sticky top-0 z-10 border-b border-r bg-card" />
            {doctors.map((doc) => (
              <div key={doc.id} className="sticky top-0 z-10 border-b border-r bg-card px-3 py-2.5">
                <div className="truncate text-sm font-semibold">{doc.full_name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{doc.specialty ?? "Doctor"}</div>
              </div>
            ))}

            {/* Slot rows */}
            {SLOTS.map((slot) => (
              <React.Fragment key={slot.minutes}>
                <div className="border-b border-r bg-muted/20 px-2 py-2 text-right text-[11px] tabular-nums text-muted-foreground">
                  {slot.label}
                </div>
                {doctors.map((doc) => {
                  const appts = (byDoctor.get(doc.id) ?? []).filter((a) => {
                    const m = minutesOfDay(a.scheduled_time);
                    return m >= slot.minutes && m < slot.minutes + 30;
                  });
                  return (
                    <div key={doc.id} className="min-h-[3.25rem] border-b border-r p-1">
                      {appts.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => openBook(doc.id, slot.minutes)}
                          className="flex h-full min-h-[2.75rem] w-full items-center justify-center rounded-md border border-dashed border-transparent text-[11px] text-muted-foreground/50 transition-colors hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary"
                        >
                          + Free
                        </button>
                      ) : (
                        <div className="space-y-1">
                          {appts.map((a) => {
                            const meta = STATUS_META[a.status];
                            return (
                              <div
                                key={a.id}
                                className={cn(
                                  "rounded-md border-l-2 px-2 py-1.5",
                                  a.status === "completed"
                                    ? "border-l-success bg-success/5"
                                    : a.status === "in_consultation"
                                      ? "border-l-primary bg-primary/5"
                                      : "border-l-honey bg-honey-tint/50"
                                )}
                              >
                                <div className="truncate text-[12px] font-medium">{a.patient.full_name}</div>
                                <div className="flex items-center gap-1 truncate text-[10.5px] text-muted-foreground">
                                  <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                                  {a.notes?.trim() || meta.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Controlled booking dialog, opened by a free slot (doctor + time prefilled) */}
      {clinicId && (
        <BookAppointmentDialog
          clinicId={clinicId}
          doctors={doctors}
          hideTrigger
          open={booking !== null}
          onOpenChange={(o) => !o && setBooking(null)}
          prefill={booking ?? undefined}
          onBooked={() => {
            setBooking(null);
            if (date) load(date);
          }}
        />
      )}
    </div>
  );
}
