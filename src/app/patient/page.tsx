"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Pill, FlaskConical, FileText, Users, CalendarX2 } from "lucide-react";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import NotificationCenter from "@/components/patient/notification-center";
import { Appointment, Doctor, formatDay, formatTime, getInitials } from "@/shared/queue";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES = ["scheduled", "checked_in", "waiting", "doctor_ready", "in_consultation"];

interface Recommendation {
  id: string;
  test_name: string;
  status: "pending" | "booked" | "completed" | "report_uploaded";
  recommended_at: string;
}

export default function PatientHomePage() {
  const { patientProfile, linkedProfiles } = usePatientSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);

  const fetchAppointments = React.useCallback(() => {
    return fetch(`/api/appointments?patient_id=${patientProfile.id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setAppointments(data); })
      .catch(() => {});
  }, [patientProfile.id]);

  React.useEffect(() => {
    fetchAppointments();
    fetch(`/api/patient/recommendations`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setRecommendations(d?.recommendations ?? []))
      .catch(() => setRecommendations([]));
  }, [fetchAppointments, patientProfile.id]);

  const upcoming = (appointments ?? [])
    .filter((a) => ACTIVE_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  const next = upcoming[0] ?? null;

  const visitCount = (appointments ?? []).filter((a) => a.status === "completed").length;
  const recentTest = recommendations[0] ?? null;
  const pendingTests = recommendations.filter((r) => r.status === "pending").length;

  const rescheduleDoctor: Doctor | null = next
    ? {
        id: next.doctor.id,
        full_name: next.doctor.full_name,
        specialty: next.doctor.specialty,
        clinic_id: next.doctor.clinic_id,
        clinic: next.clinic,
        user: { id: next.doctor.user_id, email: null, phone_number: "" },
      }
    : null;

  const firstName = patientProfile.full_name.split(" ")[0];

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 px-5 pt-5 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-[22px] leading-tight font-bold">Hello, {firstName} 👋</h1>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Your health, all in one place</p>
          </div>
          <div className="ml-auto">
            <NotificationCenter />
          </div>
        </div>
      </div>

      <div className="px-5 pt-1 pb-6">
        {/* Next visit */}
        {appointments === null ? (
          <div className="h-40 animate-pulse rounded-[20px] bg-muted/60" />
        ) : next ? (
          <div className="relative overflow-hidden rounded-[20px] bg-[#0B4A41] p-5 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-20 size-[280px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(232,162,76,.2), transparent 62%)" }}
            />
            <div className="relative">
              <p className="text-[11px] font-bold tracking-[0.14em] text-honey uppercase">Your next visit</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-white/15 font-heading text-[17px] font-bold">
                  {getInitials(next.doctor.full_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-heading text-[17px] font-bold">{next.doctor.full_name}</p>
                  <p className="truncate text-[13px] text-[#CFE3DC]">
                    {formatDay(next.scheduled_time)} · {formatTime(next.scheduled_time)} · {next.clinic.name}
                  </p>
                </div>
              </div>
              <div className="relative mt-4 flex gap-2.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next.clinic.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-white text-[13.5px] font-semibold text-[#083F37] transition hover:brightness-95"
                >
                  <MapPin className="size-4" /> Directions
                </a>
                <BookAppointmentDialog
                  patientId={patientProfile.id}
                  onBooked={fetchAppointments}
                  initialDoctor={rescheduleDoctor}
                  rescheduleAppointmentId={next.id}
                  trigger={
                    <button className="flex h-[42px] flex-1 items-center justify-center rounded-[14px] border border-white/20 bg-white/12 text-[13.5px] font-semibold text-white transition hover:bg-white/20">
                      Reschedule
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed py-9 text-center">
            <CalendarX2 className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2.5 text-sm font-medium">No upcoming visits</p>
            <Link href="/patient/book" className="mt-1 inline-block text-xs font-semibold text-honey-deep">
              Book a doctor →
            </Link>
          </div>
        )}

        {/* Quick access */}
        <p className="mt-6 mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          Quick access
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Tile href="/patient/records?tab=rx" tone="honey" icon={Pill} name="Prescriptions" meta="Your medicines" />
          <Tile href="/patient/records?tab=tests" tone="pine" icon={FlaskConical} name="Tests" meta={pendingTests ? `${pendingTests} to do` : "Recommended tests"} />
          <Tile href="/patient/records" tone="ok" icon={FileText} name="Records" meta={visitCount ? `${visitCount} visit${visitCount > 1 ? "s" : ""}` : "Your timeline"} />
          <Tile href="/patient/family" tone="sand" icon={Users} name="Family" meta={`${linkedProfiles.length} ${linkedProfiles.length === 1 ? "person" : "people"}`} />
        </div>

        {/* Recent */}
        {recentTest && (
          <>
            <p className="mt-6 mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">Recent</p>
            <div className="space-y-2.5">
              <Link
                href="/patient/records?tab=tests"
                className="flex items-center gap-3 rounded-[15px] border bg-card p-3.5 transition hover:shadow-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-accent text-[12px] font-bold text-accent-foreground">Test</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-[15px] font-bold">{recentTest.test_name}</p>
                  <p className="truncate text-[12.5px] text-muted-foreground">{formatDay(recentTest.recommended_at)}</p>
                </div>
                {recentTest.status === "pending" ? (
                  <span className="shrink-0 rounded-full bg-honey-soft px-2.5 py-1 text-[11px] font-bold text-honey-deep">To do</span>
                ) : (
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground/40" />
                )}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  honey: "bg-honey-soft text-honey-deep",
  pine: "bg-accent text-accent-foreground",
  ok: "bg-success/15 text-success",
  sand: "bg-secondary text-muted-foreground",
};

function Tile({
  href,
  tone,
  icon: Icon,
  name,
  meta,
}: {
  href: string;
  tone: keyof typeof TONES | string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  meta: string;
}) {
  return (
    <Link href={href} className="rounded-[16px] border bg-card p-4 text-left transition hover:shadow-sm active:scale-[0.98]">
      <span className={cn("mb-3 grid size-10 place-items-center rounded-[12px]", TONES[tone] ?? TONES.sand)}>
        <Icon className="size-5" />
      </span>
      <p className="font-heading text-[14.5px] font-bold">{name}</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{meta}</p>
    </Link>
  );
}
