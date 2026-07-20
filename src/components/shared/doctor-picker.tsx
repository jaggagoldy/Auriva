"use client";

// Milestone 2 · 3.3 — the unified reception doctor picker. One component for
// walk-in + booking, built on the shared filter model (3.1). Per Product Office
// req #2 each row shows queue load + next slot so reception never assigns blind:
//   Search → Specialty → Available today → [ Dr Name · Specialty · N waiting · Next … ]
// Waiting counts reuse /api/reception/dashboard; next slots reuse
// /api/doctors/next-slots. No new API.

import * as React from "react";
import { Check, ChevronDown, Search, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getInitials } from "@/shared/queue";
import type { DoctorOption } from "@/components/staff/doctor-filter";
import {
  EMPTY_DOCTOR_FILTERS,
  formatNextSlot,
  matchesDoctorFilters,
  uniqueSpecialties,
  type DoctorFilters,
} from "@/shared/doctor-directory";
import { useNextSlots, useTodayKey } from "@/components/shared/use-doctor-directory";

interface DoctorPickerProps {
  doctors: DoctorOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  id?: string;
}

export default function DoctorPicker({ doctors, value, onChange, placeholder = "Select a doctor", id }: DoctorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<DoctorFilters>(EMPTY_DOCTOR_FILTERS);
  const [waitingById, setWaitingById] = React.useState<Record<string, number>>({});

  const doctorIds = React.useMemo(() => doctors.map((d) => d.id), [doctors]);
  const nextSlots = useNextSlots(doctorIds);
  const todayKey = useTodayKey();
  const specialties = React.useMemo(() => uniqueSpecialties(doctors), [doctors]);

  // Queue load per doctor (reception dashboard). Graceful if unavailable.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/reception/dashboard", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.doctors) return;
        const map: Record<string, number> = {};
        for (const d of data.doctors) map[d.id] = d.waiting ?? 0;
        setWaitingById(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selected = doctors.find((d) => d.id === value) ?? null;
  const filtered = doctors.filter((d) => matchesDoctorFilters(d, filters, nextSlots[d.id], todayKey));

  const pick = (docId: string) => {
    onChange(docId);
    setOpen(false);
    setFilters(EMPTY_DOCTOR_FILTERS);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        id={id}
        className="w-full justify-between font-normal"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("flex items-center gap-2 truncate", !selected && "text-muted-foreground")}>
          <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            <>
              {selected.full_name}
              {selected.specialty && <span className="text-muted-foreground">· {selected.specialty}</span>}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>

      {open && (
        <>
          {/* click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            <div className="space-y-2 border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  placeholder="Search doctor…"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={filters.specialty}
                  onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))}
                  className="h-8 flex-1 rounded-md border bg-background px-2 text-[13px]"
                  aria-label="Filter by specialty"
                >
                  <option value="">All specialties</option>
                  {specialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant={filters.availableToday ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 shrink-0 text-[12px]"
                  onClick={() => setFilters((f) => ({ ...f, availableToday: !f.availableToday }))}
                >
                  {filters.availableToday && <Check className="size-3" />}
                  Available today
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-64">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">No doctors match.</p>
              ) : (
                <ul className="p-1">
                  {filtered.map((d) => {
                    const waiting = waitingById[d.id];
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => pick(d.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
                            d.id === value && "bg-muted"
                          )}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                            {getInitials(d.full_name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{d.full_name}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {d.specialty ?? "General"}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span
                              className={cn(
                                "block text-[11px] font-semibold tabular-nums",
                                waiting && waiting > 0 ? "text-honey-deep" : "text-muted-foreground"
                              )}
                            >
                              {waiting === undefined ? "—" : `${waiting} waiting`}
                            </span>
                            <span className="block text-[10.5px] text-muted-foreground">
                              {formatNextSlot(nextSlots[d.id], todayKey)}
                            </span>
                          </span>
                          {d.id === value && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
