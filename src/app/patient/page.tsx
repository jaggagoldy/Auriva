"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  Stethoscope,
  FileText,
  FlaskConical,
  Pill,
  CalendarX2,
  AlertCircle,
  MapPin,
  CalendarClock,
  FlaskConical as LabIcon,
} from "lucide-react";
import { toast } from "sonner";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import { Appointment, Doctor, formatDay, formatTime, getInitials } from "@/shared/queue";

const ACTIVE_STATUSES = ["scheduled", "checked_in", "waiting", "doctor_ready", "in_consultation"];

interface LabOrderRow {
  id: string;
  status: "ordered" | "resulted" | "cancelled";
  tests_json: string;
  ordered_at: string;
  resulted_at: string | null;
}

function parseTestNames(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map((t) => t.name).join(", ") : "";
  } catch {
    return "";
  }
}

export default function PatientHomePage() {
  const { patientProfile } = usePatientSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [labOrders, setLabOrders] = React.useState<LabOrderRow[] | null>(null);

  const fetchAppointments = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?patient_id=${patientProfile.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      setAppointments(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [patientProfile.id]);

  React.useEffect(() => {
    fetchAppointments();
    fetch("/api/doctors", { cache: "no-store" })
      .then((res) => res.json())
      .then(setDoctors)
      .catch(() => setDoctors([]));
    fetch(`/api/patients/${patientProfile.id}/lab-orders`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setLabOrders)
      .catch(() => setLabOrders([]));
  }, [fetchAppointments, patientProfile.id]);

  const upcoming = (appointments ?? [])
    .filter((a) => ACTIVE_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  const next = upcoming[0] ?? null;

  // Real data already carried on each Appointment (Prescription.follow_up_date,
  // projected onto the appointment payload) — the nearest one still ahead of
  // now, not a separate tracked entity.
  const nextFollowUp = (appointments ?? [])
    .filter((a) => a.follow_up_date && new Date(a.follow_up_date).getTime() > Date.now())
    .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())[0] ?? null;

  const recentLabOrder = (labOrders ?? [])
    .slice()
    .sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime())[0] ?? null;

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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // "Needs your attention" only fires for something genuinely missing —
  // never a permanent nag once the profile is actually complete.
  const missingEmergencyContact = !patientProfile.emergency_contact_name;

  return (
    <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-5 px-7 py-7 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Here&apos;s what needs your attention today</p>
        </div>

        {/* Next appointment hero */}
        {appointments === null ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
        ) : next ? (
          <Card className="overflow-hidden rounded-xl border-none bg-gradient-to-br from-primary to-[#083F37] p-0 text-primary-foreground shadow-md">
            <CardContent className="p-5.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">
                    Next appointment
                  </p>
                  <p className="mt-1.5 text-lg font-semibold">
                    {next.doctor.full_name} · {formatDay(next.scheduled_time)}, {formatTime(next.scheduled_time)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-white/80">
                    {next.clinic.name} · {next.doctor.specialty || "General Practitioner"}
                  </p>
                </div>
                <Avatar className="size-12 shrink-0 bg-white/15">
                  <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
                    {getInitials(next.doctor.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next.clinic.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  className="flex-1 bg-white text-primary hover:bg-accent"
                >
                  <MapPin className="size-3.5" />
                  Get directions
                </Button>
                <BookAppointmentDialog
                  patientId={patientProfile.id}
                  onBooked={fetchAppointments}
                  initialDoctor={rescheduleDoctor}
                  rescheduleAppointmentId={next.id}
                  trigger={
                    <Button className="flex-1 bg-white/15 text-white hover:bg-white/25">
                      Reschedule
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border-dashed py-8 text-center">
            <CardContent>
              <CalendarX2 className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2.5 text-sm font-medium">No upcoming appointments</p>
              <p className="mt-1 text-xs text-muted-foreground">Book a doctor to get started.</p>
            </CardContent>
          </Card>
        )}

        {/* Quick actions — one primary action promoted, everything else recedes */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Link
            href="/patient/find-care"
            className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-left transition-colors hover:border-primary/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-primary">Find a doctor</p>
              <p className="text-[11px] text-primary/80">
                {doctors.length > 0 ? `${doctors.length} available near you` : "Search doctors & clinics"}
              </p>
            </div>
          </Link>
          <Link
            href="/patient/records"
            className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs transition-colors hover:border-primary/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">View records</p>
              <p className="text-[11px] text-muted-foreground">Timeline &amp; prescriptions</p>
            </div>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <ComingSoonQuickAction icon={FlaskConical} label="Book a lab test" />
          <ComingSoonQuickAction icon={Pill} label="Order medicines" />
        </div>
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-4">
        {nextFollowUp && (
          <Card className="rounded-xl">
            <CardContent>
              <p className="mb-2 text-[13px] font-semibold">Follow-up due</p>
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-[10.5px] font-semibold">
                    {getInitials(nextFollowUp.doctor.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium">{nextFollowUp.doctor.full_name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarClock className="size-3" />
                    Due {formatDay(nextFollowUp.follow_up_date!)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {recentLabOrder && (
          <Card className="rounded-xl">
            <CardContent>
              <p className="mb-2 text-[13px] font-semibold">Recent lab report</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <LabIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium">{parseTestNames(recentLabOrder.tests_json) || "Lab test"}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDay(recentLabOrder.ordered_at)}</p>
                  </div>
                </div>
                <Link href="/patient/records" className="shrink-0 text-[11.5px] font-medium text-primary hover:underline">
                  View
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Needs your attention — only when something is actually missing */}
        {missingEmergencyContact && (
          <Card className="rounded-xl border-warning/30 bg-warning/10">
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  <p className="text-[12px] font-semibold text-warning">
                    Complete your profile
                  </p>
                  <p className="mt-0.5 text-[11px] text-warning/85">
                    Add your emergency contact so clinics can reach the right person fast.
                  </p>
                </div>
              </div>
              <Button
                nativeButton={false}
                render={<Link href="/patient/records" />}
                size="sm"
                variant="secondary"
                className="w-full bg-white"
              >
                Go to Health Records
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-xl">
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">Upcoming this week</p>
              <Link href="/patient/care" className="text-[11.5px] font-medium text-primary hover:underline">
                See all
              </Link>
            </div>
            {appointments === null ? (
              <div className="space-y-2 pt-2">
                <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
              </div>
            ) : upcoming.length === 0 ? (
              <p className="pt-2 text-xs text-muted-foreground">Nothing scheduled yet.</p>
            ) : (
              <div className="divide-y">
                {upcoming.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 py-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-[10px] font-semibold">
                        {getInitials(a.doctor.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{a.doctor.full_name}</p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <Clock className="size-2.5" />
                        {formatDay(a.scheduled_time)} · {formatTime(a.scheduled_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ComingSoonQuickAction({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        toast(`${label} is coming soon`, { description: "We'll let you know the moment it's ready." })
      }
      className="flex items-center gap-2.5 rounded-xl border border-dashed p-3 text-left text-muted-foreground transition-colors hover:border-primary/40"
    >
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[12px] font-medium">{label}</p>
        <p className="text-[10px]">Coming soon</p>
      </div>
    </button>
  );
}
