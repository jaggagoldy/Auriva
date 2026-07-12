"use client";

import * as React from "react";
import Link from "next/link";
import { Stethoscope, Building2, FlaskConical, Pill, MapPin, ArrowRight, Star, ShieldCheck, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import GlobalSearch from "@/components/staff/global-search";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Doctor, formatDay, formatTime, getInitials } from "@/shared/queue";
import { haversineDistanceKm } from "@/domain/geo";
import { SEARCH_AREAS } from "@/shared/areas";

const TABS = [
  { id: "doctors", label: "Doctors" },
  { id: "clinics", label: "Hospitals & Clinics" },
  { id: "labs", label: "Lab Tests" },
  { id: "pharmacy", label: "Pharmacy" },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface ClinicRow {
  id: string;
  name: string;
  address: string;
  organization_id: string;
  doctorCount: number;
  is_verified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  ratingAvg?: number | null;
  reviewCount?: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RatingLine({ avg, count }: { avg?: number | null; count?: number }) {
  if (avg == null || !count) {
    return <span className="text-[11.5px] text-muted-foreground">No reviews yet</span>;
  }
  return (
    <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
      <Star className="size-3 fill-amber-400 text-warning" />
      <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}

export default function FindCarePage() {
  const { patientProfile } = usePatientSession();
  const [tab, setTab] = React.useState<TabId>("doctors");
  const [doctors, setDoctors] = React.useState<Doctor[] | null>(null);
  const [clinics, setClinics] = React.useState<ClinicRow[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [specialtyFilters, setSpecialtyFilters] = React.useState<Set<string>>(new Set());
  const [clinicFilter, setClinicFilter] = React.useState<string | null>(null);
  const [areaId, setAreaId] = React.useState<string>(SEARCH_AREAS[0].id);
  const [availableTodayOnly, setAvailableTodayOnly] = React.useState(false);
  const [nextSlots, setNextSlots] = React.useState<Record<string, string | null>>({});
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());

  const selectedArea = SEARCH_AREAS.find((a) => a.id === areaId) ?? SEARCH_AREAS[0];

  React.useEffect(() => {
    fetch("/api/doctors", { cache: "no-store" })
      .then((res) => res.json())
      .then(setDoctors)
      .catch(() => setDoctors([]));
    fetch("/api/clinics/directory", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setClinics)
      .catch(() => setClinics([]));
    fetch("/api/patients/favorites", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((ids: string[]) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!doctors || doctors.length === 0) return;
    const ids = doctors.map((d) => d.id).join(",");
    fetch(`/api/doctors/next-slots?ids=${ids}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then(setNextSlots)
      .catch(() => {});
  }, [doctors]);

  const toggleSpecialty = (s: string) => {
    setSpecialtyFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleFavorite = async (doctorId: string) => {
    const isFavorited = favoriteIds.has(doctorId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.delete(doctorId);
      else next.add(doctorId);
      return next;
    });
    try {
      await fetch(`/api/patients/favorites/doctors/${doctorId}`, { method: isFavorited ? "DELETE" : "POST" });
    } catch {
      // revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorited) next.add(doctorId);
        else next.delete(doctorId);
        return next;
      });
    }
  };

  const specialties = React.useMemo(() => {
    const set = new Set<string>();
    (doctors ?? []).forEach((d) => d.specialty && set.add(d.specialty));
    return Array.from(set).sort();
  }, [doctors]);

  const distanceFor = (lat?: number | null, lng?: number | null) =>
    lat != null && lng != null
      ? haversineDistanceKm(selectedArea.latitude, selectedArea.longitude, lat, lng)
      : null;

  const today = todayKey();

  const filteredDoctors = (doctors ?? [])
    .filter((d) => {
      if (specialtyFilters.size > 0 && !(d.specialty && specialtyFilters.has(d.specialty))) return false;
      if (clinicFilter && d.clinic_id !== clinicFilter) return false;
      if (availableTodayOnly) {
        const next = nextSlots[d.id];
        if (!next || next.slice(0, 10) !== today) return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        d.full_name.toLowerCase().includes(q) ||
        (d.specialty && d.specialty.toLowerCase().includes(q)) ||
        d.clinic.name.toLowerCase().includes(q)
      );
    })
    .map((d) => ({ d, distance: distanceFor(d.clinic.latitude, d.clinic.longitude) }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  const sortedClinics = (clinics ?? [])
    .map((c) => ({ c, distance: distanceFor(c.latitude, c.longitude) }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return (
    <main className="mx-auto max-w-[1240px] px-7 py-6">
      <h1 className="mb-1 text-lg font-semibold">Find Care</h1>
      <p className="mb-5 text-sm text-muted-foreground">Search doctors and clinics across Auriva.</p>

      <div className="mb-5 flex flex-wrap gap-2.5">
        <Select value={areaId} onValueChange={(v) => v && setAreaId(v)}>
          <SelectTrigger className="w-[220px]">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="size-3.5 shrink-0 text-primary" />
              <SelectValue>{selectedArea.label}</SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent>
            {SEARCH_AREAS.map((area) => (
              <SelectItem key={area.id} value={area.id}>{area.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tab === "doctors" && (
          <GlobalSearch value={query} onChange={setQuery} placeholder="Search doctor, specialty, clinic…" className="max-w-xs flex-1" />
        )}
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-1 pb-2.5 text-[13px] font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            style={{ marginRight: 22 }}
          >
            {t.label}
            {(t.id === "labs" || t.id === "pharmacy") && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9.5px]">
                Soon
              </Badge>
            )}
          </button>
        ))}
      </div>

      {tab === "doctors" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Speciality
              </p>
              <div className="flex flex-col gap-1.5">
                {specialties.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 text-[12.5px]">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input accent-primary"
                      checked={specialtyFilters.has(s)}
                      onChange={() => toggleSpecialty(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Availability
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-input accent-primary"
                  checked={availableTodayOnly}
                  onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                />
                Available today
              </label>
            </div>
            <div className="h-px bg-border" />
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Sort</p>
            <p className="text-[12.5px] font-medium text-primary">Nearest first</p>
            {clinicFilter && (
              <button
                onClick={() => setClinicFilter(null)}
                className="text-[12px] font-medium text-primary hover:underline"
              >
                × Clear clinic filter
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {doctors === null ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
              ))
            ) : filteredDoctors.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
                <Stethoscope className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No doctors found</p>
                <p className="text-xs text-muted-foreground">Try a different search or clear your filters.</p>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-muted-foreground">
                  {filteredDoctors.length} doctor{filteredDoctors.length === 1 ? "" : "s"} near {selectedArea.label}
                </p>
                {filteredDoctors.map(({ d: doc, distance }) => {
                  const nextSlot = nextSlots[doc.id];
                  const isFavorited = favoriteIds.has(doc.id);
                  return (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
                      <Link href={`/patient/doctors/${doc.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                        <Avatar className="size-11 shrink-0">
                          <AvatarFallback className="text-sm font-semibold">{getInitials(doc.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[14px] font-semibold">{doc.full_name}</p>
                            {nextSlot && nextSlot.slice(0, 10) === today && (
                              <Badge className="h-4.5 border-success/30 bg-success/10 px-1.5 text-[9.5px] text-success dark:border-success/30 dark:bg-success/10 dark:text-success">
                                Available today
                              </Badge>
                            )}
                          </div>
                          <p className="text-[12px] text-muted-foreground">
                            {doc.specialty || "General Practitioner"}
                            {doc.years_experience ? ` · ${doc.years_experience} yrs exp` : ""}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{doc.clinic.name}</span>
                              {distance != null && <span>· {distance.toFixed(1)} km</span>}
                            </span>
                            <RatingLine avg={doc.ratingAvg} count={doc.reviewCount} />
                          </div>
                        </div>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={isFavorited ? "Unfavorite" : "Favorite"}
                            onClick={() => toggleFavorite(doc.id)}
                            className="text-muted-foreground transition-colors hover:text-warning"
                          >
                            <Star className={cn("size-4", isFavorited && "fill-amber-400 text-warning")} />
                          </button>
                          {doc.consultation_fee != null && (
                            <p className="text-[12px] font-semibold">₹{doc.consultation_fee.toLocaleString("en-IN")}</p>
                          )}
                        </div>
                        {nextSlot && (
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock3 className="size-3" />
                            {formatDay(nextSlot)}, {formatTime(nextSlot)}
                          </p>
                        )}
                        <BookAppointmentDialog
                          patientId={patientProfile.id}
                          initialDoctor={doc}
                          trigger={<Button size="sm">Book slot</Button>}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      ) : tab === "clinics" ? (
        clinics === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : sortedClinics.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <Building2 className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No clinics yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sortedClinics.map(({ c: clinic, distance }) => (
              <div key={clinic.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                      <Building2 className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{clinic.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{clinic.address}</p>
                    </div>
                  </div>
                  {clinic.is_verified && (
                    <Badge className="h-5 shrink-0 gap-1 border-success/30 bg-success/10 px-1.5 text-[10px] text-success dark:border-success/30 dark:bg-success/10 dark:text-success">
                      <ShieldCheck className="size-3" />
                      Auriva Verified
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2.5 text-[11.5px] text-muted-foreground">
                    {distance != null && <span>{distance.toFixed(1)} km</span>}
                    <RatingLine avg={clinic.ratingAvg} count={clinic.reviewCount} />
                    <span>{clinic.doctorCount} doctor{clinic.doctorCount === 1 ? "" : "s"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setClinicFilter(clinic.id);
                      setTab("doctors");
                    }}
                  >
                    View doctors
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === "labs" ? (
        <ComingSoonPanel
          icon={FlaskConical}
          title="Lab test booking is coming soon"
          body="Book home-collection or in-lab tests directly from Auriva. We'll notify you the moment it's live."
        />
      ) : (
        <ComingSoonPanel
          icon={Pill}
          title="Pharmacy ordering is coming soon"
          body="Order medicines and refills directly from Auriva. We'll notify you the moment it's live."
        />
      )}
    </main>
  );
}

function ComingSoonPanel({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent">
        <Icon className="size-6 text-accent-foreground" />
      </div>
      <div>
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
