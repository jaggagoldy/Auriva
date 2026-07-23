"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, CalendarDays, ReceiptText, FileText, Users, CalendarCheck, Pill, IndianRupee, Check, FlaskConical } from "lucide-react";
import { PatientPlans } from "@/components/shared/treatment-plan/treatment-plan";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import NotificationCenter from "@/components/patient/notification-center";
import { Appointment, AppointmentStatus, Doctor, formatDay, formatTime, getInitials, parseMedicines } from "@/shared/queue";
import { cn } from "@/lib/utils";
import { PatientVisitDetailModal } from "@/components/patient/patient-visit-detail-modal";

interface InvoiceRow {
  id: string;
  status: string;
  total: number;
  payments: { amount: number }[];
}

const ACTIVE_STATUSES: AppointmentStatus[] = ["scheduled", "checked_in", "waiting", "doctor_ready", "in_consultation"];

interface Recommendation {
  id: string;
  test_name: string;
  status: "pending" | "booked" | "completed" | "report_uploaded";
  recommended_at: string;
}

export default function PatientHomePage() {
  return (
    <React.Suspense fallback={<div className="p-5 text-sm text-muted-foreground">Loading…</div>}>
      <PatientDashboardInner />
    </React.Suspense>
  );
}

function PatientDashboardInner() {
  const { patientProfile, linkedProfiles } = usePatientSession();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([]);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);

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
    fetch(`/api/patients/${patientProfile.id}/invoices`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setInvoices(Array.isArray(d) ? d : []))
      .catch(() => setInvoices([]));
  }, [fetchAppointments, patientProfile.id]);

  const upcoming = (appointments ?? [])
    .filter((a) => ACTIVE_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  const next = upcoming[0] ?? null;

  const visitCount = (appointments ?? []).filter((a) => a.status === "completed").length;
  const recentTest = recommendations[0] ?? null;

  // Payment status (real): outstanding balance across issued/unpaid invoices.
  const dueAmount = invoices
    .filter((i) => i.status !== "paid" && i.status !== "void")
    .reduce((sum, i) => sum + Math.max(0, i.total - i.payments.reduce((s, p) => s + p.amount, 0)), 0);

  // "For you today" medicines (real): from the most recent completed visit that
  // recorded a prescription. Informational — no adherence tracking (deferred).
  const lastRx = (appointments ?? [])
    .filter((a) => a.status === "completed" && parseMedicines(a.prescription_medicines_json).length > 0)
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime())[0] ?? null;
  const activeMeds = lastRx ? parseMedicines(lastRx.prescription_medicines_json) : [];

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

  // Clock reads happen in an effect, never in render (react-hooks purity).
  const [greeting, setGreeting] = React.useState("Hello");
  const [todayLabel, setTodayLabel] = React.useState("");
  React.useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setTodayLabel(formatDay(new Date()));
  }, []);

  return (
    <div>
      {/* Header — warm greeting + today (reassurance before information) */}
      <div className="sticky top-0 z-20 bg-background/90 px-5 pt-5 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-[22px] leading-tight font-bold">{greeting}, {firstName}</h1>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{todayLabel}</p>
          </div>
          <div className="ml-auto">
            <NotificationCenter />
          </div>
        </div>
      </div>

      <div className="px-5 pt-1 pb-6">
        {/* PKG-5 Today summary — appointment · medicine · payment, at a glance */}
        {appointments !== null && (
          <div className="mb-5 rounded-[18px] border bg-card p-4">
            <p className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">Today</p>
            <ul className="space-y-2.5">
              <SummaryRow
                done={Boolean(next)}
                icon={CalendarCheck}
                text={next ? <>Appointment at <b>{formatTime(next.scheduled_time)}</b> · {next.doctor.full_name}</> : <span className="text-muted-foreground">No appointment today</span>}
              />
              {activeMeds.length > 0 && (
                <SummaryRow done icon={Pill} text={<><b>{activeMeds.length}</b> medicine{activeMeds.length > 1 ? "s" : ""} in your plan</>} />
              )}
              <SummaryRow
                done={dueAmount === 0}
                icon={IndianRupee}
                text={dueAmount > 0 ? <><b>₹{dueAmount.toLocaleString("en-IN")}</b> to pay</> : <><b>Nothing</b> <span className="text-muted-foreground">due to pay</span></>}
              />
            </ul>
          </div>
        )}

        {/* Next visit */}
        {appointments !== null && next && (
          <p className="mb-2.5 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">Next visit</p>
        )}
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
              <p className="text-[11px] font-bold tracking-[0.14em] text-honey uppercase">
                {formatDay(next.scheduled_time)} · {formatTime(next.scheduled_time)}
              </p>
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
              <div className="relative mt-3.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90">
                  <FileText className="size-3" /> Bring previous reports
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90">
                  {dueAmount > 0 ? (
                    <><IndianRupee className="size-3" /> ₹{dueAmount.toLocaleString("en-IN")} to pay</>
                  ) : (
                    <><Check className="size-3" /> Payment completed</>
                  )}
                </span>
              </div>
              <div className="relative mt-3.5 flex gap-2.5">
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
          <div className="rounded-[20px] border border-dashed bg-honey-tint/40 py-9 text-center">
            <p className="font-heading text-[17px] font-bold">You&apos;re free today</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Nothing on your schedule — enjoy your day.</p>
            <Link href="/patient/book" className="mt-2.5 inline-block text-xs font-semibold text-honey-deep">
              Book a doctor →
            </Link>
          </div>
        )}

        {/* PKG-5 For you today — active medicines + anything ready to view */}
        {(activeMeds.length > 0 || recentTest) && (
          <>
            <p className="mt-6 mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              For you today
            </p>
            <div className="space-y-2.5">
              {activeMeds.slice(0, 2).map((m, i) => (
                <div key={m.id || i} className="flex items-center gap-3 rounded-[15px] border bg-card p-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-honey-soft text-honey-deep">
                    <Pill className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-[15px] font-bold">
                      {m.name}
                      {m.dosage ? ` · ${m.dosage}` : ""}
                    </p>
                    <p className="truncate text-[12.5px] text-muted-foreground">
                      {[m.frequency, m.duration].filter(Boolean).join(" · ") || "As prescribed"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    From last visit
                  </span>
                </div>
              ))}
              {recentTest && (
                <Link
                  href="/patient/records?tab=tests"
                  className="flex items-center gap-3 rounded-[15px] border bg-card p-3.5 transition hover:shadow-sm"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-accent text-accent-foreground">
                    <FlaskConical className="size-5" />
                  </span>
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
              )}
            </div>
          </>
        )}

        {/* PKG-5: Quick actions */}
        <p className="mt-6 mb-3 px-1 text-[12px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Tile href="/patient/book" tone="honey" icon={CalendarDays} name="Book" meta="Find a doctor" />
          <Tile href="/patient/records" tone="pine" icon={FileText} name="Records" meta={visitCount ? `${visitCount} visit${visitCount > 1 ? "s" : ""}` : "Your timeline"} />
          <Tile href="/patient/family" tone="ok" icon={Users} name="Family" meta={`${linkedProfiles.length} ${linkedProfiles.length === 1 ? "person" : "people"}`} />
          <Tile href="/patient/records?tab=bills" tone="sand" icon={ReceiptText} name="Payments" meta="Bills & receipts" />
        </div>

        {/* C2: the patient's active treatment plans (renders only if any). */}
        <div className="mt-6"><PatientPlans /></div>
      </div>

      <PatientVisitDetailModal
        appointment={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onOpenChange={(open) => !open && setSelectedAppointment(null)}
      />
    </div>
  );
}

function SummaryRow({
  done,
  icon: Icon,
  text,
}: {
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  text: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 text-[13.5px]">
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full",
          done ? "bg-success/15 text-success" : "bg-honey-soft text-honey-deep"
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
      </span>
      <span className="min-w-0 truncate">{text}</span>
    </li>
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
