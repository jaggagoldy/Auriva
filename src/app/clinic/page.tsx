"use client";

import * as React from "react";
import {
  Activity,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FlaskConical,
  Home,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Stethoscope,
  Archive,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ConsultationWorkbench } from "@/components/clinic/consultation-workbench";

// Milestone 1 Batch 5: the defining workflow — Today → Consultation → Payment,
// entirely inside /clinic. Every screen answers one question and always offers
// one obvious next action.

type View = "home" | "today" | "lab" | "treatments" | "payments" | "settings";
type Save = "idle" | "saving" | "saved";
type Method = "cash" | "upi" | "card";

interface ReadyStep { key: string; label: string; done: boolean; }
interface Overview {
  clinic: { id: string; name: string; phone: string | null; accepting_bookings: boolean; is_demo: boolean };
  doctorId: string | null;
  bookingPath: string | null;
  ready: {
    steps: ReadyStep[]; completed: number; total: number; percent: number;
    nextStep: ReadyStep | null; goal: { seen: number; target: number } | null;
  };
}
interface Service {
  id: string; name: string; duration_minutes: number; price: number;
  buffer_minutes: number | null; is_active: boolean;
}
interface Appt {
  id: string; scheduled_time: string; status: string; walk_in: boolean; notes: string | null;
  patient: { id: string; full_name: string } | null;
}
interface Today {
  scope?: Scope; appointments: Appt[]; total: number; completed: number; remaining: number;
  follow_ups: number; upcoming_count: number; collected_today: number; outstanding_total: number; owner_name: string | null;
}
type Scope = "today" | "upcoming" | "all";
interface Visit {
  step: "consult" | "pay";
  appointmentId: string; patientName: string;
  invoiceId?: string; total?: number;
}

const STEP_TARGET: Record<string, View> = {
  treatment: "treatments", patient: "today", payment: "today", share: "home", profile: "settings",
};

function SaveBadge({ state }: { state: Save }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Saving…</span>;
  if (state === "saved") return <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="size-3" /> Saved</span>;
  return null;
}

export default function MyClinicWorkspace() {
  const [view, setView] = React.useState<View>("home");
  const [ov, setOv] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [visit, setVisit] = React.useState<Visit | null>(null);

  const refreshOverview = React.useCallback(() => {
    return fetch("/api/clinic/overview", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setOv(d); });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/clinic/overview", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setOv(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [resetting, setResetting] = React.useState(false);
  async function resetDemo() {
    setResetting(true);
    const res = await fetch("/api/demo/reset", { method: "POST" });
    if (res.ok) {
      toast.success("Demo reset to the original sample clinic");
      // Full reload so every view (Today, Payments, …) picks up the fresh story.
      window.location.reload();
    } else {
      toast.error("Couldn't reset the demo.");
      setResetting(false);
    }
  }

  async function toggleAccepting() {
    if (!ov) return;
    const next = !ov.clinic.accepting_bookings;
    const res = await fetch("/api/clinic/booking-status", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accepting_bookings: next }),
    });
    if (res.ok) {
      setOv({ ...ov, clinic: { ...ov.clinic, accepting_bookings: next } });
      toast.success(next ? "Now accepting online bookings" : "Online bookings paused");
    } else toast.error("Couldn't update booking status.");
  }

  const NAV: { key: View; label: string; q: string; icon: React.ReactNode }[] = [
    { key: "home", label: "My Clinic", q: "Am I ready?", icon: <Home className="size-4" /> },
    { key: "today", label: "Today", q: "What do I do next?", icon: <CalendarDays className="size-4" /> },
    { key: "lab", label: "Lab", q: "What tests are pending?", icon: <FlaskConical className="size-4" /> },
    { key: "treatments", label: "Treatments", q: "What do I offer?", icon: <Stethoscope className="size-4" /> },
    { key: "payments", label: "Payments", q: "What have I collected?", icon: <Banknote className="size-4" /> },
    { key: "settings", label: "Settings", q: "How do I run my clinic?", icon: <SettingsIcon className="size-4" /> },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-center" />
      {ov?.clinic.is_demo && (
        <div className="flex items-center gap-2.5 bg-primary px-4 py-2 text-xs text-primary-foreground">
          <Sparkles className="size-3.5 shrink-0" />
          <span className="font-semibold">Demo clinic</span>
          <span className="hidden opacity-90 md:inline">
            You&apos;re exploring a sample clinic with fictional patients — nothing here affects a real practice.
          </span>
          <button
            onClick={resetDemo}
            disabled={resetting}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary-foreground/15 px-2.5 py-1 font-medium transition-colors hover:bg-primary-foreground/25 disabled:opacity-60"
          >
            {resetting ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
            Reset demo
          </button>
        </div>
      )}
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-background p-3 sm:flex">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><Activity className="size-4" /></div>
            <div className="text-sm font-semibold leading-tight">{ov?.clinic.name ?? "My Clinic"}</div>
          </div>
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setView(n.key)}
              className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
                view === n.key ? "bg-honey-soft text-honey-deep" : "text-foreground hover:bg-muted")}>
              {n.icon}
              <span className="flex-1">{n.label}
                <span className="block text-[11px] font-normal text-muted-foreground">{n.q}</span>
              </span>
              {n.key === "home" && ov && (
                <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{ov.ready.percent}%</span>
              )}
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 pb-16 sm:pb-0">
          <Header ov={ov} onToggle={toggleAccepting} />
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-24 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : !ov ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">Couldn&apos;t load your clinic.</Card>
            ) : view === "home" ? (
              <HomeView ov={ov} goto={setView} onShared={refreshOverview} />
            ) : view === "today" ? (
              <TodayView bookingPath={ov.bookingPath} onBooked={refreshOverview} onStart={(appt, name) => setVisit({ step: "consult", appointmentId: appt, patientName: name })} />
            ) : view === "lab" ? (
              <LabView />
            ) : view === "treatments" ? (
              <TreatmentsView onChanged={refreshOverview} />
            ) : view === "payments" ? (
              <PaymentsView />
            ) : (
              <SettingsView ov={ov} onChanged={refreshOverview} onToggle={toggleAccepting} />
            )}
          </div>
        </main>
      </div>

      {/* B6 (Founder MVP Audit F1): /clinic had no navigation fallback below
          `sm` — the sidebar above is sm:flex only. Same NAV/setView the
          sidebar uses, just rendered as a fixed bottom bar on mobile. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background sm:hidden">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            aria-current={view === n.key ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              view === n.key ? "text-honey-deep" : "text-muted-foreground"
            )}
          >
            {n.icon}
            {n.label}
            {n.key === "home" && ov && ov.ready.percent < 100 && (
              <span className="absolute top-1 right-[calc(50%-16px)] size-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </nav>

      {visit && (
        <VisitOverlay
          visit={visit}
          clinicName={ov?.clinic.name ?? "My Clinic"}
          onClose={() => setVisit(null)}
          onAdvance={(v) => setVisit(v)}
          onDone={() => { setVisit(null); setView("today"); refreshOverview(); }}
        />
      )}
    </div>
  );
}

function Header({ ov, onToggle }: { ov: Overview | null; onToggle: () => void }) {
  const accepting = ov?.clinic.accepting_bookings ?? true;
  return (
    <header className="flex items-center gap-3 border-b bg-background px-5 py-3">
      <div className="min-w-0 flex-1 sm:max-w-xs sm:flex-none"><PatientSearch /></div>
      <div className="hidden flex-1 sm:block" />
      <button onClick={onToggle}
        className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap",
          accepting ? "border-primary/30 bg-primary/5 text-primary" : "border-destructive/30 bg-destructive/5 text-destructive")}>
        <span className={cn("size-2 shrink-0 rounded-full", accepting ? "bg-primary" : "bg-destructive")} />
        <span className="hidden sm:inline">{accepting ? "Accepting bookings" : "Bookings paused"}</span>
        <span className="sm:hidden">{accepting ? "Accepting" : "Paused"}</span>
      </button>
    </header>
  );
}

function PatientSearch() {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<{ id: string; full_name: string; health_id: string; phones: string[] }[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/patients?name=${encodeURIComponent(q.trim())}`);
      const data = await res.json().catch(() => ({ profiles: [] }));
      setResults(res.ok ? data.profiles ?? [] : []);
    } finally { setBusy(false); }
  }

  return (
    <div className="relative w-full max-w-xs">
      <form onSubmit={run} className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setResults(null); }} placeholder="Search patients…" className="pl-8" />
        {busy && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </form>
      {results && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-background p-1 shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No patients found.</div>
          ) : results.slice(0, 6).map((p) => (
            <div key={p.id} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
              <div className="font-medium">{p.full_name}</div>
              <div className="text-xs text-muted-foreground">{p.health_id}{p.phones[0] ? ` · ${p.phones[0]}` : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Ring({ percent }: { percent: number }) {
  return (
    <div className="grid size-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#E8A24C ${percent}%, rgba(255,255,255,.18) 0)` }}>
      <div className="grid place-items-center rounded-full bg-[#0B4A41]" style={{ width: 60, height: 60 }}>
        <span className="font-heading text-lg font-bold text-honey">{percent}%</span>
      </div>
    </div>
  );
}

function HomeView({ ov, goto, onShared }: { ov: Overview; goto: (v: View) => void; onShared: () => void }) {
  const bookingUrl = ov.bookingPath ? `${typeof window !== "undefined" ? window.location.origin : ""}${ov.bookingPath}` : "";
  const next = ov.ready.nextStep;

  async function markShared() { await fetch("/api/clinic/booking-shared", { method: "POST" }); onShared(); }
  async function copyLink() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success("Booking link copied");
    } catch {
      toast.error("Couldn't copy the link — copy it manually instead.");
      return;
    }
    markShared();
  }
  function whatsapp() { if (bookingUrl) window.open(`https://wa.me/?text=${encodeURIComponent(`Book an appointment with me: ${bookingUrl}`)}`, "_blank"); markShared(); }
  function preview() { if (ov.bookingPath) window.open(ov.bookingPath, "_blank"); }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-none bg-[#0B4A41] p-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 size-[220px] rounded-full" style={{ background: "radial-gradient(circle, rgba(232,162,76,.22), transparent 62%)" }} />
        {next ? (
          <div className="relative flex items-center gap-4">
            <Ring percent={ov.ready.percent} />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-bold">Get your clinic ready</h2>
              <div className="mt-2 rounded-[12px] bg-white/10 p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-honey">Next step</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium">{next.label}</span>
                  <button onClick={() => (next.key === "share" ? copyLink() : goto(STEP_TARGET[next.key]))}
                    className="shrink-0 rounded-[10px] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#083F37] transition hover:brightness-95">
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center rounded-full bg-honey/20"><Trophy className="size-8 text-honey" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-bold">Your clinic is ready 🎉</h2>
              {ov.ready.goal && (
                <div className="mt-2 rounded-[12px] bg-white/10 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-honey">Next goal</div>
                  <div className="mt-0.5 text-sm font-medium">See {ov.ready.goal.target} patients</div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="h-full bg-honey" style={{ width: `${Math.min(100, Math.round((ov.ready.goal.seen / ov.ready.goal.target) * 100))}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-white/70">{ov.ready.goal.seen} of {ov.ready.goal.target} seen</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {next && (
        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold">Get your clinic ready</h3>
          <p className="mb-3 text-xs text-muted-foreground">Each step is a real win, not a settings form.</p>
          <div className="divide-y">
            {ov.ready.steps.map((s) => (
              <button key={s.key} onClick={() => (s.done ? undefined : s.key === "share" ? copyLink() : goto(STEP_TARGET[s.key]))}
                className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40">
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-honey-deep" /> : <Circle className="size-5 shrink-0 text-muted-foreground/40" />}
                <span className={cn("min-w-0 flex-1 text-sm font-medium", s.done && "text-muted-foreground line-through")}>{s.label}</span>
                {!s.done && <span className="shrink-0 text-xs font-semibold text-honey-deep">Do this →</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block size-2 rounded-full bg-success" /> Your booking page is live
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">Share it and patients book themselves.</p>
        <div className="mb-3 truncate rounded-lg border bg-muted/40 p-2.5 text-xs font-medium text-primary">{bookingUrl || "—"}</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={copyLink}><Copy className="size-3.5" /> Copy booking link</Button>
          <Button size="sm" variant="outline" onClick={whatsapp}><MessageCircle className="size-3.5" /> Share via WhatsApp</Button>
          <Button size="sm" variant="outline" onClick={preview}><ExternalLink className="size-3.5" /> Preview booking page</Button>
        </div>
      </Card>
    </div>
  );
}

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const SCOPES: { id: Scope; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
];

function dayHeading(iso: string): string {
  const d = new Date(iso);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function computeDefaultWhen(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TodayView({ bookingPath, onBooked, onStart }: { bookingPath: string | null; onBooked: () => void; onStart: (appointmentId: string, patientName: string) => void }) {
  const [data, setData] = React.useState<Today | null>(null);
  const [scope, setScope] = React.useState<Scope>("today");
  const [nextId, setNextId] = React.useState<string | null>(null);
  const [greeting, setGreeting] = React.useState("Hello");
  // Holds the default datetime string while the Book dialog is open; null = closed.
  const [bookingDefault, setBookingDefault] = React.useState<string | null>(null);

  const load = React.useCallback((s: Scope) => {
    return fetch(`/api/clinic/today?scope=${s}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Today | null) => {
        if (!d) return;
        setData(d);
        setGreeting(greetingFor(new Date().getHours()));
        // Next patient (today's soonest active) computed here, not in render,
        // so no impure clock read during paint.
        if (s === "today") {
          const now = Date.now();
          const n = d.appointments.find((a) => new Date(a.scheduled_time).getTime() >= now && a.status !== "completed");
          setNextId(n?.id ?? null);
        } else {
          setNextId(null);
        }
      });
  }, []);

  React.useEffect(() => { load(scope); }, [scope, load]);

  if (!data) return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  const stale = data.scope !== scope; // fetch for the newly-selected tab in flight
  const nextAppt = scope === "today" ? data.appointments.find((a) => a.id === nextId) ?? null : null;

  // Group the list by calendar day for Upcoming/All.
  const groups: { day: string; items: Appt[] }[] = [];
  for (const a of data.appointments) {
    const day = dayHeading(a.scheduled_time);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="relative overflow-hidden border-none bg-[#0B4A41] p-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-[240px] rounded-full" style={{ background: "radial-gradient(circle, rgba(232,162,76,.22), transparent 62%)" }} />
        <div className="relative">
          <p className="text-[13px] text-white/70">{greeting}{data.owner_name ? `, ${data.owner_name}` : ""}.</p>
          {nextAppt ? (
            <div className="mt-2">
              <div className="text-[11px] font-bold tracking-[0.12em] text-honey uppercase">Your next patient</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-white/15 font-heading text-sm font-bold">
                  {(nextAppt.patient?.full_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-lg leading-tight font-bold">{nextAppt.patient?.full_name ?? "Patient"}</div>
                  <div className="truncate text-[13px] text-[#CFE3DC]">
                    {new Date(nextAppt.scheduled_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    {nextAppt.notes ? ` · ${nextAppt.notes}` : ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onStart(nextAppt.id, nextAppt.patient?.full_name ?? "Patient")}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-[12px] bg-white px-4 text-[14px] font-semibold text-[#083F37] transition hover:brightness-95"
              >
                Start consultation
              </button>
            </div>
          ) : (
            <p className="mt-1.5 text-[14px] text-white/85">
              {data.total === 0
                ? data.upcoming_count > 0
                  ? `No appointments today — you have ${data.upcoming_count} upcoming.`
                  : "No appointments today."
                : "All caught up — no one else waiting."}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/15 pt-3 text-[12px] text-white/70">
            <span><strong className="text-white">{data.remaining}</strong> remaining</span>
            <span><strong className="text-white">{data.completed}</strong> seen</span>
            {data.follow_ups > 0 && <span><strong className="text-white">{data.follow_ups}</strong> follow-up{data.follow_ups === 1 ? "" : "s"}</span>}
            <span><strong className="text-white">₹{data.collected_today.toLocaleString()}</strong> collected</span>
            {data.outstanding_total > 0 && <span><strong className="text-white">₹{data.outstanding_total.toLocaleString()}</strong> outstanding</span>}
          </div>
        </div>
      </Card>

      {/* Schedule with Today / Upcoming / All */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-[12px] bg-secondary p-1">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className={cn("rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition", scope === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                {s.label}
                {s.id === "upcoming" && data.upcoming_count > 0 && <span className="ml-1.5 text-honey-deep">{data.upcoming_count}</span>}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setBookingDefault(computeDefaultWhen())}><Plus className="size-4" /> Book</Button>
        </div>

        {stale ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : data.appointments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {scope === "today"
                ? data.upcoming_count > 0 ? "Nothing today. Check Upcoming for your next patients." : "Your day is clear. Get your first patient in."
                : scope === "upcoming" ? "No upcoming appointments." : "No appointments yet."}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setBookingDefault(computeDefaultWhen())}><Plus className="size-4" /> Book a patient</Button>
              {bookingPath && (
                <Button variant="outline" onClick={() => window.open(bookingPath, "_blank")}>
                  <ExternalLink className="size-4" /> Share booking page
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.day}>
                {scope !== "today" && <p className="mb-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{g.day}</p>}
                <div className="divide-y">
                  {g.items.map((a) => {
                    const done = a.status === "completed";
                    const cancelled = a.status === "cancelled" || a.status === "no_show";
                    return (
                      <div key={a.id} className="flex items-center gap-3 py-3">
                        <div className={cn("grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold", done || cancelled ? "bg-muted text-muted-foreground" : "bg-honey-soft text-honey-deep")}>
                          {(a.patient?.full_name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{a.patient?.full_name ?? "Patient"}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {scope !== "today" ? `${new Date(a.scheduled_time).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ` : ""}
                            {new Date(a.scheduled_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                            {a.walk_in ? " · walk-in" : ""} · {a.status.replace(/_/g, " ")}
                          </div>
                        </div>
                        {done ? (
                          <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">Seen</span>
                        ) : cancelled ? (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground capitalize">{a.status.replace(/_/g, " ")}</span>
                        ) : (
                          <Button size="sm" variant={a.id === nextAppt?.id ? "default" : "outline"} onClick={() => onStart(a.id, a.patient?.full_name ?? "Patient")}>
                            Start
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {bookingDefault !== null && (
        <BookPatientDialog
          defaultWhen={bookingDefault}
          onClose={() => setBookingDefault(null)}
          onBooked={() => { setBookingDefault(null); load(scope); onBooked(); }}
        />
      )}
    </div>
  );
}

// In-clinic booking — a patient by name + phone at a chosen time, no public
// link, no new tab. On success it refreshes Today and the readiness checklist.
function BookPatientDialog({ defaultWhen, onClose, onBooked }: { defaultWhen: string; onClose: () => void; onBooked: () => void }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [when, setWhen] = React.useState(defaultWhen);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (name.trim().length < 2) return toast.error("Enter the patient's name.");
    if (phone.replace(/\D/g, "").length < 7) return toast.error("Enter a valid phone number.");
    if (!when) return toast.error("Pick a date and time.");
    setBusy(true);
    try {
      const res = await fetch("/api/clinic/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_name: name.trim(), patient_phone: phone.trim(), scheduled_time: new Date(when).toISOString(), notes: reason.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.message ?? "Couldn't book the patient."); return; }
      toast.success(`Booked ${name.trim()}${d.is_new_patient ? " (new patient)" : ""}`);
      onBooked();
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-heading text-base font-semibold">Book a patient</h2>
          <p className="text-xs text-muted-foreground">New or returning — we match the phone number to an existing record.</p>
        </div>
        <div className="space-y-1.5"><Label htmlFor="bp-name">Patient name</Label>
          <Input id="bp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" autoFocus /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-phone">Mobile number</Label>
          <Input id="bp-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98450 12210" /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-when">When</Label>
          <Input id="bp-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="bp-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="bp-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Tooth pain" /></div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{busy && <Loader2 className="size-4 animate-spin" />} Book patient</Button>
        </div>
      </Card>
    </div>
  );
}

function VisitOverlay({ visit, clinicName, onClose, onAdvance, onDone }: {
  visit: Visit; clinicName: string; onClose: () => void; onAdvance: (v: Visit) => void; onDone: () => void;
}) {
  const [services, setServices] = React.useState<Service[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/services", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then((d) => { if (!cancelled) setServices(d); });
    return () => { cancelled = true; };
  }, []);

  if (visit.step === "consult") {
    return (
      <ConsultationWorkbench
        appointmentId={visit.appointmentId}
        patientName={visit.patientName}
        clinicName={clinicName}
        services={services}
        onCancel={onClose}
        onCompleted={(inv) => onAdvance({ ...visit, step: "pay", invoiceId: inv.invoiceId, total: inv.total })}
      />
    );
  }

  return <PaymentStep visit={visit} onClose={onClose} onDone={onDone} />;
}

// Its own component so it mounts fresh at the pay step and can lazy-init the
// amount from the treatment total — no setState-in-effect needed.
function PaymentStep({ visit, onClose, onDone }: { visit: Visit; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = React.useState<Method>("cash");
  const [amount, setAmount] = React.useState(() => (visit.total != null ? String(visit.total) : ""));
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pay() {
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return toast.error("Enter a valid amount.");
    setBusy(true);
    try {
      const res = await fetch("/api/clinic/payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: visit.invoiceId, amount: amt, method }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.message ?? "Couldn't record the payment."); return; }
      toast.success(`₹${amt.toLocaleString()} received from ${visit.patientName}`);
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-base font-semibold">Collect payment</h2>
          <p className="text-xs text-muted-foreground">{visit.patientName}</p>
        </div>
        <div className="text-3xl font-bold">₹{Number(amount || visit.total || 0).toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">Amount comes from the treatment — you can adjust it. This <strong>records</strong> a payment you received; Auriva doesn&apos;t process the money.</p>
        <div className="space-y-1.5"><Label htmlFor="amt">Amount (₹)</Label>
          <Input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
        <div className="space-y-1.5"><Label>How did they pay?</Label>
          <div className="inline-flex overflow-hidden rounded-lg border">
            {(["cash", "upi", "card"] as Method[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={cn("px-4 py-2 text-sm font-medium capitalize", method === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}>{m}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onDone}>Skip</Button>
          <Button disabled={busy} onClick={pay}>{busy && <Loader2 className="size-4 animate-spin" />} Record ₹{Number(amount || 0).toLocaleString()} received</Button>
        </div>
      </Card>
    </div>
  );
}

function PaymentsView() {
  const [data, setData] = React.useState<{ payments: { id: string; amount: number; method: string; received_at: string; invoice: { invoice_number: string; patient: { full_name: string } | null } | null }[]; summary: { collected_today: number; payments_today: number; outstanding_total: number; open_invoices: number } } | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/clinic/payments", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);

  if (!data) return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xl font-bold">₹{data.summary.collected_today.toLocaleString()}</div><div className="text-xs text-muted-foreground">Collected today</div></Card>
        <Card className="p-4"><div className="text-xl font-bold">₹{data.summary.outstanding_total.toLocaleString()}</div><div className="text-xs text-muted-foreground">Outstanding</div></Card>
        <Card className="p-4"><div className="text-xl font-bold">{data.summary.payments_today}</div><div className="text-xs text-muted-foreground">Payments today</div></Card>
      </div>
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold">Today&apos;s payments</h3>
        {data.payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No payments yet today. Complete a visit and record the payment.</p>
        ) : (
          <div className="divide-y">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{p.invoice?.patient?.full_name ?? "Patient"}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.invoice?.invoice_number ?? ""} · {p.method} · {new Date(p.received_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">₹{p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Lab worklist ────────────────────────────────────────────────────────────
// The other half of the consult loop: investigations ordered during a visit
// arrive here as a worklist. The owner results them at the desk (ordered →
// resulted) — which files the values onto the patient's record and flags the
// result back. One question: "What tests are pending?"
interface LabOrderRow {
  id: string;
  status: "ordered" | "resulted" | "cancelled";
  tests_json: string;
  clinical_note: string | null;
  result_values_json: string | null;
  result_notes: string | null;
  ordered_at: string;
  resulted_at: string | null;
  patient: { id: string; full_name: string } | null;
  doctor: { id: string; full_name: string } | null;
}

function parseTests(json: string): string[] {
  try {
    const arr = JSON.parse(json) as { name?: string }[];
    return Array.isArray(arr) ? arr.map((t) => t?.name ?? "").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function LabView() {
  const [orders, setOrders] = React.useState<LabOrderRow[] | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    return fetch("/api/clinic/lab", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOrders(d?.orders ?? []));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  if (!orders) return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  const pending = orders.filter((o) => o.status === "ordered");
  const resulted = orders.filter((o) => o.status === "resulted");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-xl font-bold">{pending.length}</div><div className="text-xs text-muted-foreground">Waiting for results</div></Card>
        <Card className="p-4"><div className="text-xl font-bold">{resulted.length}</div><div className="text-xs text-muted-foreground">Resulted</div></Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold">To result</h3>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tests waiting. Investigations you order during a consultation show up here to result.
          </p>
        ) : (
          <div className="space-y-2.5">
            {pending.map((o) => (
              <LabPendingRow
                key={o.id}
                order={o}
                open={openId === o.id}
                onToggle={() => setOpenId(openId === o.id ? null : o.id)}
                onDone={() => { setOpenId(null); load(); }}
              />
            ))}
          </div>
        )}
      </Card>

      {resulted.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Recently resulted</h3>
          <div className="divide-y">
            {resulted.slice(0, 12).map((o) => {
              const tests = parseTests(o.tests_json);
              return (
                <div key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{o.patient?.full_name ?? "Patient"}</div>
                    <div className="truncate text-xs text-muted-foreground">{tests.join(", ")}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                    Resulted{o.resulted_at ? ` · ${new Date(o.resulted_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function LabPendingRow({ order, open, onToggle, onDone }: { order: LabOrderRow; open: boolean; onToggle: () => void; onDone: () => void }) {
  const tests = React.useMemo(() => parseTests(order.tests_json), [order.tests_json]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const result_values = tests
      .map((t) => ({ test: t, value: (values[t] ?? "").trim() }))
      .filter((v) => v.value);
    if (!result_values.length && !notes.trim()) {
      toast.error("Enter at least one result value or a note.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/clinic/lab", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "result", lab_order_id: order.id, result_values, result_notes: notes.trim() || undefined }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Result filed to the patient's record"); onDone(); }
    else toast.error("Couldn't save the result.");
  }

  async function cancel() {
    setSaving(true);
    const res = await fetch("/api/clinic/lab", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", lab_order_id: order.id }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Order cancelled"); onDone(); }
    else toast.error("Couldn't cancel the order.");
  }

  return (
    <div className="rounded-lg border">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{order.patient?.full_name ?? "Patient"}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {tests.map((t) => (
              <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{t}</span>
            ))}
          </div>
          {order.clinical_note && <div className="mt-1 truncate text-xs text-muted-foreground">Note: {order.clinical_note}</div>}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {new Date(order.ordered_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t p-3">
          {tests.map((t) => (
            <div key={t} className="flex items-center gap-2.5">
              <span className="w-28 shrink-0 text-sm font-medium">{t}</span>
              <Input
                value={values[t] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [t]: e.target.value }))}
                placeholder="Result value (e.g. 13.2 g/dL)"
                className="flex-1"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor={`ln-${order.id}`}>Notes (optional)</Label>
            <Textarea id={`ln-${order.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Interpretation or advice for this result." />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} File result
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={saving} className="text-muted-foreground">
              Cancel order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TreatmentsView({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = React.useState<Service[] | null>(null);
  const [save, setSave] = React.useState<Save>("idle");
  const [form, setForm] = React.useState({ name: "", duration: "30", price: "", buffer: "" });
  const [editId, setEditId] = React.useState<string | null>(null);
  const [edit, setEdit] = React.useState({ name: "", duration: "", price: "", buffer: "" });

  const load = React.useCallback(() => {
    return fetch("/api/services?include_inactive=true", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : [])).then((d) => setItems(d));
  }, []);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/services?include_inactive=true", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : [])).then((d) => { if (!cancelled) setItems(d); });
    return () => { cancelled = true; };
  }, []);

  function flash() { setSave("saved"); setTimeout(() => setSave("idle"), 1500); }

  async function add() {
    if (form.name.trim().length < 2) return toast.error("Enter a treatment name.");
    const duration = Number(form.duration), price = Number(form.price);
    if (!Number.isInteger(duration) || duration <= 0) return toast.error("Duration must be a positive whole number of minutes.");
    if (!Number.isInteger(price) || price < 0) return toast.error("Price must be a whole number (₹).");
    setSave("saving");
    const res = await fetch("/api/services", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, duration_minutes: duration, price, buffer_minutes: form.buffer ? Number(form.buffer) : undefined }),
    });
    if (res.ok) { setForm({ name: "", duration: "30", price: "", buffer: "" }); await load(); onChanged(); flash(); }
    else { const d = await res.json().catch(() => ({})); setSave("idle"); toast.error(d.message ?? "Couldn't add treatment."); }
  }

  function startEdit(s: Service) {
    setEditId(s.id);
    setEdit({ name: s.name, duration: String(s.duration_minutes), price: String(s.price), buffer: s.buffer_minutes != null ? String(s.buffer_minutes) : "" });
  }

  async function saveEdit(id: string) {
    setSave("saving");
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name, duration_minutes: Number(edit.duration), price: Number(edit.price),
        buffer_minutes: edit.buffer ? Number(edit.buffer) : null,
      }),
    });
    if (res.ok) { setEditId(null); await load(); onChanged(); flash(); }
    else { const d = await res.json().catch(() => ({})); setSave("idle"); toast.error(d.message ?? "Couldn't save treatment."); }
  }

  async function setActive(id: string, isActive: boolean) {
    setSave("saving");
    const res = await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: isActive }) });
    if (res.ok) { await load(); onChanged(); flash(); } else { setSave("idle"); toast.error("Couldn't update treatment."); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Treatments &amp; Services</h2>
            <p className="text-xs text-muted-foreground">Name, duration, price and buffer — one clear list. Drives your slots and payment amounts.</p>
          </div>
          <SaveBadge state={save} />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <Input className="col-span-5" placeholder="Treatment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input className="col-span-2" inputMode="numeric" placeholder="Mins" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          <Input className="col-span-2" inputMode="numeric" placeholder="₹ Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input className="col-span-2" inputMode="numeric" placeholder="Buffer" value={form.buffer} onChange={(e) => setForm({ ...form, buffer: e.target.value })} />
          <Button className="col-span-1" onClick={add}><Plus className="size-4" /></Button>
        </div>
      </Card>

      <Card className="p-5">
        {!items ? (
          <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No treatments yet. Add your first above.</p>
        ) : (
          <div className="divide-y">
            <div className="grid grid-cols-12 gap-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="col-span-4">Name</span><span className="col-span-2">Duration</span>
              <span className="col-span-2">Price</span><span className="col-span-2">Status</span><span className="col-span-2 text-right">Edit</span>
            </div>
            {items.map((s) => editId === s.id ? (
              <div key={s.id} className="grid grid-cols-12 items-center gap-2 py-2.5">
                <Input className="col-span-4" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                <Input className="col-span-2" inputMode="numeric" value={edit.duration} onChange={(e) => setEdit({ ...edit, duration: e.target.value })} />
                <Input className="col-span-2" inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
                <Input className="col-span-2" inputMode="numeric" placeholder="Buffer" value={edit.buffer} onChange={(e) => setEdit({ ...edit, buffer: e.target.value })} />
                <span className="col-span-2 flex justify-end gap-1">
                  <Button size="sm" onClick={() => saveEdit(s.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                </span>
              </div>
            ) : (
              <div key={s.id} className="grid grid-cols-12 items-center gap-2 py-2.5 text-sm">
                <span className="col-span-4 font-medium">{s.name}</span>
                <span className="col-span-2 text-muted-foreground">{s.duration_minutes} min{s.buffer_minutes ? ` +${s.buffer_minutes}` : ""}</span>
                <span className="col-span-2">₹{s.price.toLocaleString()}</span>
                <span className="col-span-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {s.is_active ? "Active" : "Archived"}
                  </span>
                </span>
                <span className="col-span-2 flex justify-end gap-2 text-muted-foreground">
                  <button title="Edit" onClick={() => startEdit(s)} className="hover:text-foreground"><Pencil className="size-4" /></button>
                  {s.is_active ? (
                    <button title="Archive" onClick={() => setActive(s.id, false)} className="hover:text-destructive"><Archive className="size-4" /></button>
                  ) : (
                    <button title="Restore" onClick={() => setActive(s.id, true)} className="hover:text-primary"><RotateCcw className="size-4" /></button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SettingsView({ ov, onChanged, onToggle }: { ov: Overview; onChanged: () => void; onToggle: () => void }) {
  const [phone, setPhone] = React.useState(ov.clinic.phone ?? "");
  const [phoneSave, setPhoneSave] = React.useState<Save>("idle");
  const [bio, setBio] = React.useState("");
  const [reg, setReg] = React.useState("");
  const [profileSave, setProfileSave] = React.useState<Save>("idle");

  function flash(set: (s: Save) => void) { set("saved"); setTimeout(() => set("idle"), 1500); }

  async function saveContact() {
    setPhoneSave("saving");
    const res = await fetch(`/api/clinics/${ov.clinic.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    if (res.ok) { flash(setPhoneSave); onChanged(); } else { setPhoneSave("idle"); toast.error("Couldn't save contact number."); }
  }
  async function saveProfile() {
    if (!ov.doctorId) return toast.error("No profile to update.");
    setProfileSave("saving");
    const res = await fetch(`/api/doctors/${ov.doctorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio, registration_number: reg }) });
    if (res.ok) { flash(setProfileSave); onChanged(); } else { setProfileSave("idle"); toast.error("Couldn't save profile."); }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Clinic contact number</h2><SaveBadge state={phoneSave} /></div>
        <p className="text-xs text-muted-foreground">Shown on your booking page. This is <strong>separate from your login</strong> — changing it never affects how you sign in.</p>
        <div className="flex gap-2"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98450 12345" /><Button onClick={saveContact}>Save</Button></div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-semibold">Online bookings</h2>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{ov.clinic.accepting_bookings ? "Accepting bookings" : "Bookings paused"}</div>
            <div className="text-xs text-muted-foreground">{ov.clinic.accepting_bookings ? "Patients can book online." : "Patients see \"call the clinic\" instead of times. Existing appointments are unaffected."}</div>
          </div>
          <Button variant={ov.clinic.accepting_bookings ? "outline" : "default"} onClick={onToggle}>{ov.clinic.accepting_bookings ? "Pause" : "Resume"}</Button>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Your profile</h2><SaveBadge state={profileSave} /></div>
        <p className="text-xs text-muted-foreground">A short bio and registration number build patient trust on your booking page.</p>
        <div className="space-y-1.5"><Label htmlFor="reg">Registration number</Label><Input id="reg" value={reg} onChange={(e) => setReg(e.target.value)} placeholder="e.g. KA-PT-10482" /></div>
        <div className="space-y-1.5"><Label htmlFor="bio">Short bio</Label><Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Physiotherapist, 12 years in sports & post-op rehab." /></div>
        <Button onClick={saveProfile}>Save profile</Button>
      </Card>

      {/* Scale path — a solo owner can see and act on growing to multi-clinic.
          Multi-doctor is the next edition (Coming soon); the request routes to a
          real contact flow, on the same account — never a migration. */}
      <Card className="space-y-3 border-primary/25 bg-primary/[0.03] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Growing your practice?</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Right now you run everything yourself — that&apos;s Auriva Solo, free forever. When you add a
          second doctor or a front desk, Auriva grows into the <strong>multi-clinic edition</strong> on this
          same account. Same patients, same history — you never migrate.
        </p>
        <a
          href="/contact-sales?from=solo-upgrade"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit gap-2")}
        >
          Talk to us about multi-clinic
          <ExternalLink className="size-4" />
        </a>
      </Card>
    </div>
  );
}
