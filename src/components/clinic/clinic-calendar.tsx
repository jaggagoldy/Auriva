"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Ban, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// P2 Doctor Calendar — Day / Week / Month over the real schedule read-model
// (/api/clinic/schedule): booked appointments + doctor time blocks, plus quick
// slot blocking (POST /api/doctors/[id]/time-blocks). All clock reads happen in
// effects/handlers (never in render) to satisfy react-hooks/purity.

type CalView = "day" | "week" | "month";
interface SAppt { id: string; time: string; patient_name: string; status: string; walk_in: boolean; invoice_status: string | null }
interface SBlock { id: string; start: string; end: string; reason: string | null }
interface SDay { date: string; appointments: SAppt[]; blocks: SBlock[] }

// ── date helpers (operate on "YYYY-MM-DD" strings; only called in handlers/effects) ──
function todayKey(): string {
  const d = new Date();
  return keyOf(d);
}
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseKey(k: string): Date {
  const d = new Date(`${k}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
function weekStart(k: string): string {
  const d = parseKey(k);
  d.setDate(d.getDate() - d.getDay()); // Sunday-start
  return keyOf(d);
}
function monthGridStart(k: string): string {
  const d = parseKey(k);
  d.setDate(1);
  d.setDate(1 - d.getDay());
  return keyOf(d);
}
function windowFor(anchor: string, view: CalView): { start: string; days: number } {
  if (view === "day") return { start: anchor, days: 1 };
  if (view === "week") return { start: weekStart(anchor), days: 7 };
  return { start: monthGridStart(anchor), days: 42 };
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEWS: CalView[] = ["day", "week", "month"];

export function ClinicCalendar({ doctorId }: { doctorId: string | null }) {
  const [view, setView] = React.useState<CalView>("week");
  const [anchor, setAnchor] = React.useState<string | null>(null);
  const [days, setDays] = React.useState<SDay[] | null>(null);
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [reloadTick, setReloadTick] = React.useState(0);

  // Initialise the anchor to "today" without reading the clock in render.
  React.useEffect(() => {
    Promise.resolve().then(() => setAnchor((cur) => cur ?? todayKey()));
  }, []);

  React.useEffect(() => {
    if (!anchor) return;
    let cancelled = false;
    const w = windowFor(anchor, view);
    const key = `${w.start}:${view}:${reloadTick}`;
    fetch(`/api/clinic/schedule?start=${w.start}&days=${w.days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) { setDays(d.schedule as SDay[]); setLoadedKey(key); } });
    return () => { cancelled = true; };
  }, [anchor, view, reloadTick]);

  const currentKey = anchor ? `${windowFor(anchor, view).start}:${view}:${reloadTick}` : null;
  const busy = !days || loadedKey !== currentKey;

  function shift(dir: number) {
    if (!anchor) return;
    const step = view === "day" ? 1 : view === "week" ? 7 : 30;
    // For month, jump by calendar month rather than 30 days.
    if (view === "month") {
      const d = parseKey(anchor);
      d.setMonth(d.getMonth() + dir);
      setAnchor(keyOf(d));
    } else {
      setAnchor(addDays(anchor, dir * step));
    }
  }

  const rangeLabel = React.useMemo(() => {
    if (!anchor) return "";
    const a = parseKey(anchor);
    if (view === "day") return a.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    if (view === "month") return a.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const ws = parseKey(weekStart(anchor));
    const we = parseKey(addDays(weekStart(anchor), 6));
    return `${ws.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${we.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  }, [anchor, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-lg border hover:bg-muted" aria-label="Previous"><ChevronLeft className="size-4" /></button>
          <button onClick={() => shift(1)} className="grid size-9 place-items-center rounded-lg border hover:bg-muted" aria-label="Next"><ChevronRight className="size-4" /></button>
          <button onClick={() => setAnchor(todayKey())} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted">Today</button>
        </div>
        <div className="font-heading text-base font-bold">{rangeLabel}</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 rounded-[12px] bg-secondary p-1">
            {VIEWS.map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("rounded-[9px] px-3 py-1.5 text-[13px] font-semibold capitalize transition", view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setBlockOpen(true)}><Ban className="size-4" /> Block time</Button>
        </div>
      </div>

      {busy || !days ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : view === "day" ? (
        <DayView day={days[0]} />
      ) : view === "week" ? (
        <WeekView days={days} onPick={(date) => { setAnchor(date); setView("day"); }} />
      ) : (
        <MonthView days={days} anchor={anchor!} onPick={(date) => { setAnchor(date); setView("day"); }} />
      )}

      {blockOpen && (
        <BlockDialog
          doctorId={doctorId}
          defaultDate={anchor ?? todayKey()}
          onClose={() => setBlockOpen(false)}
          onBlocked={() => { setBlockOpen(false); setReloadTick((t) => t + 1); }}
        />
      )}
    </div>
  );
}

function StatusDot({ status, invoice }: { status: string; invoice: string | null }) {
  const tone =
    status === "cancelled" || status === "no_show" ? "bg-muted-foreground/40"
      : status === "completed" ? (invoice === "paid" ? "bg-success" : "bg-honey")
      : "bg-primary";
  return <span className={cn("size-2 shrink-0 rounded-full", tone)} />;
}

function ApptCard({ a }: { a: SAppt }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-[12px]">
      <StatusDot status={a.status} invoice={a.invoice_status} />
      <span className="font-semibold tabular-nums">{fmtTime(a.time)}</span>
      <span className="min-w-0 flex-1 truncate">{a.patient_name}</span>
    </div>
  );
}

function BlockCard({ b }: { b: SBlock }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-2.5 py-1.5 text-[12px] text-muted-foreground">
      <Ban className="size-3 shrink-0" />
      <span className="tabular-nums">{fmtTime(b.start)}–{fmtTime(b.end)}</span>
      <span className="min-w-0 flex-1 truncate">{b.reason || "Blocked"}</span>
    </div>
  );
}

function DayView({ day }: { day?: SDay }) {
  if (!day) return null;
  const items = [
    ...day.appointments.map((a) => ({ t: a.time, node: <ApptCard key={`a${a.id}`} a={a} /> })),
    ...day.blocks.map((b) => ({ t: b.start, node: <BlockCard key={`b${b.id}`} b={b} /> })),
  ].sort((x, y) => new Date(x.t).getTime() - new Date(y.t).getTime());
  return (
    <Card className="p-4">
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing scheduled this day.</p>
      ) : (
        <div className="space-y-2">{items.map((i) => i.node)}</div>
      )}
    </Card>
  );
}

function WeekView({ days, onPick }: { days: SDay[]; onPick: (date: string) => void }) {
  const today = todayKey();
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-2">
        {days.map((d) => {
          const date = parseKey(d.date);
          const isToday = d.date === today;
          return (
            <div key={d.date} className={cn("rounded-xl border bg-card p-2", isToday && "border-honey-deep/40 ring-1 ring-honey-deep/30")}>
              <button onClick={() => onPick(d.date)} className="mb-2 w-full text-left">
                <div className="text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">{WEEKDAYS[date.getDay()]}</div>
                <div className={cn("font-heading text-lg font-bold", isToday && "text-honey-deep")}>{date.getDate()}</div>
              </button>
              <div className="space-y-1.5">
                {d.appointments.map((a) => <ApptCard key={a.id} a={a} />)}
                {d.blocks.map((b) => <BlockCard key={b.id} b={b} />)}
                {d.appointments.length === 0 && d.blocks.length === 0 && (
                  <p className="py-2 text-center text-[11px] text-muted-foreground/70">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ days, anchor, onPick }: { days: SDay[]; anchor: string; onPick: (date: string) => void }) {
  const today = todayKey();
  const anchorMonth = parseKey(anchor).getMonth();
  return (
    <Card className="p-3">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const date = parseKey(d.date);
          const inMonth = date.getMonth() === anchorMonth;
          const isToday = d.date === today;
          const count = d.appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show").length;
          return (
            <button key={d.date} onClick={() => onPick(d.date)}
              className={cn(
                "flex min-h-[68px] flex-col rounded-lg border p-1.5 text-left transition hover:bg-muted/50",
                inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground/60",
                isToday && "border-honey-deep/50 ring-1 ring-honey-deep/30"
              )}>
              <span className={cn("text-[12px] font-semibold", isToday && "text-honey-deep")}>{date.getDate()}</span>
              <div className="mt-auto flex flex-wrap items-center gap-1">
                {count > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{count}</span>}
                {d.blocks.length > 0 && <Ban className="size-3 text-muted-foreground" />}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function BlockDialog({ doctorId, defaultDate, onClose, onBlocked }: { doctorId: string | null; defaultDate: string; onClose: () => void; onBlocked: () => void }) {
  const [date, setDate] = React.useState(defaultDate);
  const [from, setFrom] = React.useState("13:00");
  const [to, setTo] = React.useState("14:00");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!doctorId) return toast.error("Add your clinic profile first.");
    if (!date || from >= to) return toast.error("End time must be after start time.");
    setBusy(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/time-blocks`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: new Date(`${date}T${from}`).toISOString(), end_at: new Date(`${date}T${to}`).toISOString(), reason: reason.trim() || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.message ?? "Couldn't block that time."); return; }
      toast.success("Time blocked");
      onBlocked();
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground"><CalendarDays className="size-4" /></span>
          <div>
            <h2 className="font-heading text-base font-semibold">Block time</h2>
            <p className="text-xs text-muted-foreground">Mark yourself unavailable — no one can book this window.</p>
          </div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="bd-date">Date</Label><Input id="bd-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5"><Label htmlFor="bd-from">From</Label><Input id="bd-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="flex-1 space-y-1.5"><Label htmlFor="bd-to">To</Label><Input id="bd-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="bd-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="bd-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lunch, surgery, personal" /></div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{busy && <Loader2 className="size-4 animate-spin" />} Block time</Button>
        </div>
      </Card>
    </div>
  );
}
