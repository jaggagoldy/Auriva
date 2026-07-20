"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Star, Check } from "lucide-react";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import { Doctor, getInitials } from "@/shared/queue";
import {
  EMPTY_DOCTOR_FILTERS,
  formatNextSlot,
  matchesDoctorFilters,
  uniqueSpecialties,
  type DoctorFilters,
} from "@/shared/doctor-directory";
import { useNextSlots, useTodayKey } from "@/components/shared/use-doctor-directory";
import { cn } from "@/lib/utils";

// Book tab (Milestone 2 · 3.1/3.2). The list matches the approved mockup; tapping
// a doctor opens the real BookAppointmentDialog. Now availability-aware: specialty
// + "Available today" filters and a "Next available" line, reusing the shared
// doctor-filter model and /api/doctors/next-slots.
export default function PatientBookPage() {
  const { patientProfile } = usePatientSession();
  const router = useRouter();
  const [doctors, setDoctors] = React.useState<Doctor[] | null>(null);
  const [filters, setFilters] = React.useState<DoctorFilters>(EMPTY_DOCTOR_FILTERS);

  React.useEffect(() => {
    fetch("/api/doctors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);

  const doctorIds = React.useMemo(() => (doctors ?? []).map((d) => d.id), [doctors]);
  const nextSlots = useNextSlots(doctorIds);
  const todayKey = useTodayKey();
  const specialties = React.useMemo(() => uniqueSpecialties(doctors ?? []), [doctors]);

  const filtered = (doctors ?? []).filter((d) => matchesDoctorFilters(d, filters, nextSlots[d.id], todayKey));

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background/90 px-5 pt-5 pb-2 backdrop-blur">
        <h1 className="font-heading text-[21px] font-bold">Find a doctor</h1>
      </div>

      <div className="px-5 pt-2 pb-6">
        <div className="mb-2.5 flex items-center gap-2.5 rounded-[14px] border bg-card px-3.5">
          <Search className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search doctors, clinics, specialties"
            className="flex-1 bg-transparent py-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* 3.1/3.2 filters: specialty + available-today */}
        <div className="mb-4 flex items-center gap-2">
          <select
            value={filters.specialty}
            onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))}
            className="h-9 flex-1 rounded-[12px] border bg-card px-3 text-[13px]"
            aria-label="Filter by specialty"
          >
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, availableToday: !f.availableToday }))}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border px-3 text-[13px] font-semibold transition-colors",
              filters.availableToday ? "border-honey-soft bg-honey-soft text-honey-deep" : "bg-card text-muted-foreground"
            )}
          >
            {filters.availableToday && <Check className="size-3.5" />}
            Available today
          </button>
        </div>

        {doctors === null ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-[15px] bg-muted/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {filters.query.trim() || filters.specialty || filters.availableToday
              ? "No doctors match your filters."
              : "No doctors available yet."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((d) => (
              <BookAppointmentDialog
                key={d.id}
                patientId={patientProfile.id}
                initialDoctor={d}
                onBooked={() => router.push("/patient")}
                trigger={
                  <button className="flex w-full items-center gap-3 rounded-[15px] border bg-card p-3.5 text-left transition hover:shadow-sm active:scale-[0.99]">
                    <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-honey-soft font-heading text-[15px] font-bold text-honey-deep">
                      {getInitials(d.full_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-[15px] font-bold">{d.full_name}</p>
                      <p className="truncate text-[12.5px] text-muted-foreground">
                        {[d.specialty || "General practitioner", d.clinic.name].join(" · ")}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] font-medium text-honey-deep">
                        Next: {formatNextSlot(nextSlots[d.id], todayKey)}
                      </p>
                    </div>
                    {typeof d.ratingAvg === "number" ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-honey-soft px-2 py-1 text-[11px] font-bold text-honey-deep">
                        <Star className="size-3 fill-current" /> {d.ratingAvg.toFixed(1)}
                      </span>
                    ) : (
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground/40" />
                    )}
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
