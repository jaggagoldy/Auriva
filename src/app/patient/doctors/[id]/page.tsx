"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, GraduationCap, Languages, Clock3, Star } from "lucide-react";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Doctor, formatDay, formatTime, getInitials } from "@/shared/queue";

interface DaySlots {
  date: string;
  slots: string[];
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patientName: string;
}

export default function DoctorDetailsPage() {
  const params = useParams<{ id: string }>();
  const { patientProfile } = usePatientSession();
  const [doctor, setDoctor] = React.useState<Doctor | null | undefined>(undefined);
  const [slots, setSlots] = React.useState<DaySlots[] | null>(null);
  const [reviews, setReviews] = React.useState<ReviewRow[] | null>(null);
  const [isFavorited, setIsFavorited] = React.useState(false);

  React.useEffect(() => {
    // GET /api/doctors/[id] is a staff-only route (the Doctor Workspace's own
    // profile editor) — the patient-facing detail page instead reuses the
    // same open /api/doctors list Find Care already fetches, and finds the
    // matching doctor client-side.
    fetch("/api/doctors", { cache: "no-store" })
      .then((res) => res.json())
      .then((all: Doctor[]) => setDoctor(all.find((d) => d.id === params.id) ?? null));
    fetch(`/api/doctors/${params.id}/slots`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setSlots)
      .catch(() => setSlots([]));
    fetch(`/api/doctors/${params.id}/reviews`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setReviews)
      .catch(() => setReviews([]));
    fetch("/api/patients/favorites", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((ids: string[]) => setIsFavorited(ids.includes(params.id)))
      .catch(() => {});
  }, [params.id]);

  const toggleFavorite = async () => {
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      await fetch(`/api/patients/favorites/doctors/${params.id}`, { method: next ? "POST" : "DELETE" });
    } catch {
      setIsFavorited(!next);
    }
  };

  const nextAvailable = (slots ?? [])
    .flatMap((day) => day.slots)
    .slice(0, 3);

  if (doctor === undefined) {
    return (
      <main className="mx-auto max-w-[1240px] px-7 py-6">
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
      </main>
    );
  }

  if (doctor === null) {
    return (
      <main className="mx-auto max-w-[1240px] px-7 py-16 text-center">
        <p className="text-sm font-medium">Doctor not found</p>
        <Link href="/patient/find-care" className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline">
          Back to Find Care
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1240px] px-7 py-6">
      <Link
        href="/patient/find-care"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Find Care
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="flex items-start gap-4">
            <Avatar className="size-16 shrink-0">
              <AvatarFallback className="text-xl font-semibold">{getInitials(doctor.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold">{doctor.full_name}</h1>
                <button
                  type="button"
                  aria-label={isFavorited ? "Unfavorite" : "Favorite"}
                  onClick={toggleFavorite}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-warning"
                >
                  <Star className={cn("size-5", isFavorited && "fill-amber-400 text-warning")} />
                </button>
              </div>
              <p className="mt-0.5 text-[13.5px] text-muted-foreground">
                {doctor.specialty || "General Practitioner"}
                {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                {doctor.ratingAvg != null && (doctor.reviewCount ?? 0) > 0 ? (
                  <span className="flex items-center gap-1">
                    <Star className="size-3 fill-amber-400 text-warning" />
                    <span className="font-medium text-foreground">{doctor.ratingAvg.toFixed(1)}</span>
                    <span>({doctor.reviewCount} review{doctor.reviewCount === 1 ? "" : "s"})</span>
                  </span>
                ) : (
                  <span>No reviews yet</span>
                )}
                {doctor.years_experience != null && <span>{doctor.years_experience} yrs experience</span>}
                {doctor.languages && (
                  <span className="flex items-center gap-1">
                    <Languages className="size-3" />
                    {doctor.languages}
                  </span>
                )}
              </div>
            </div>
          </div>

          {doctor.bio && (
            <>
              <div className="my-5 h-px bg-border" />
              <p className="mb-1.5 text-[13.5px] font-semibold">About</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{doctor.bio}</p>
            </>
          )}

          <div className="my-5 h-px bg-border" />
          <p className="mb-2 text-[13.5px] font-semibold">Practices at</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{doctor.clinic.name}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">{doctor.clinic.address}</p>
              </div>
            </div>
          </div>

          {doctor.qualifications && (
            <>
              <div className="my-5 h-px bg-border" />
              <p className="mb-1.5 flex items-center gap-1.5 text-[13.5px] font-semibold">
                <GraduationCap className="size-4" />
                Qualifications
              </p>
              <p className="text-[13px] text-muted-foreground">{doctor.qualifications}</p>
            </>
          )}

          <div className="my-5 h-px bg-border" />
          <p className="mb-2 text-[13.5px] font-semibold">Patient reviews</p>
          {reviews === null ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
          ) : reviews.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold">{r.patientName}</p>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn("size-3", i < r.rating ? "fill-amber-400 text-warning" : "text-muted-foreground/30")}
                        />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-[12.5px] text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="sticky top-4 rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-[13px] font-semibold">Consultation fee</p>
            <p className="mt-1 text-[22px] font-semibold">
              {doctor.consultation_fee != null ? `₹${doctor.consultation_fee.toLocaleString("en-IN")}` : "Ask at clinic"}
            </p>
            <div className="my-3.5 h-px bg-border" />
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <Clock3 className="size-3" />
              Next available
            </p>
            {slots === null ? (
              <div className="h-8 animate-pulse rounded-lg bg-muted/60" />
            ) : nextAvailable.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No open slots in the next 7 days — pick a time and the clinic will confirm.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nextAvailable.map((iso) => (
                  <span key={iso} className="rounded-md bg-muted px-2 py-1 text-[11.5px] font-medium">
                    {formatDay(iso)}, {formatTime(iso)}
                  </span>
                ))}
              </div>
            )}
            <BookAppointmentDialog
              patientId={patientProfile.id}
              initialDoctor={doctor}
              trigger={
                <Button className="mt-4 w-full" size="lg">
                  Book appointment
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
