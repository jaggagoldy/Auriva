"use client";

// C1 — shared Treatment Plan components. Used across surfaces by construction:
//  • TreatmentPlanCreate — doctor creates a plan during consultation (both
//    /clinic and /doctor consult surfaces).
//  • TreatmentPlanPanel  — reception sees active plans + books the next session
//    at Checkout, and can view/print the plan.
//  • PatientPlanCard     — read-only plan for the patient app.
// All money/scheduling flows through existing engines; this is presentation.

import * as React from "react";
import { CalendarPlus, ChevronDown, Loader2, Plus, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PlanSession { id: string; sequence: number; status: string; appointment_id: string | null }
export interface PlanView {
  id: string; title: string; status: string;
  sessions_planned: number; sessions_completed: number; sessions_booked: number;
  service_id: string; doctor_id: string; notes: string | null; created_at: string;
  sessions: PlanSession[];
}
interface CatalogService { id: string; name: string; price: number; category?: string; kind?: string }

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

async function planApi(body: Record<string, unknown>): Promise<PlanView | PlanView[] | { id: string } | null> {
  const res = await fetch("/api/clinic/treatment-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) { toast.error((d as { message?: string }).message ?? "Couldn't update the plan."); return null; }
  return d;
}

// ---- Create (consultation) --------------------------------------------------
export function TreatmentPlanCreate({ appointmentId, patientId, doctorId }: { appointmentId: string; patientId: string; doctorId: string }) {
  const [catalog, setCatalog] = React.useState<CatalogService[]>([]);
  const [plans, setPlans] = React.useState<PlanView[]>([]);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [sessions, setSessions] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cat, pl] = await Promise.all([
        fetch("/api/services", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/clinic/treatment-plans?patient_id=${patientId}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
      ]);
      if (cancelled) return;
      setCatalog(Array.isArray(cat) ? cat.filter((s: CatalogService) => (s.kind ?? "clinical") === "clinical") : []);
      setPlans(Array.isArray(pl) ? pl : []);
    })();
    return () => { cancelled = true; };
  }, [patientId, reload]);

  async function create() {
    const n = Number(sessions);
    if (!title.trim()) return toast.info("Name the plan.");
    if (!serviceId) return toast.info("Pick the service for each session.");
    if (!Number.isInteger(n) || n < 1) return toast.info("Enter the number of sessions.");
    setBusy(true);
    try {
      const d = await planApi({ action: "create", activate: true, patient_id: patientId, doctor_id: doctorId, origin_appointment_id: appointmentId, title: title.trim(), service_id: serviceId, sessions_planned: n });
      if (d) { setOpen(false); setTitle(""); setServiceId(""); setSessions(""); setReload((x) => x + 1); toast.success("Treatment plan created."); }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {plans.filter((p) => p.status === "active" || p.status === "draft").map((p) => (
        <div key={p.id} className="rounded-xl border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{p.title}</span>
            <span className="text-xs text-muted-foreground">{p.sessions_completed}/{p.sessions_planned} · {p.status}</span>
          </div>
        </div>
      ))}
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New treatment plan</Button>
      ) : (
        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plan title (e.g. ACL Rehab)" />
          <div className="flex gap-2">
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="">Service per session…</option>
              {catalog.map((s) => <option key={s.id} value={s.id}>{s.name} — {inr(s.price)}</option>)}
            </select>
            <Input value={sessions} onChange={(e) => setSessions(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="# sessions" className="w-28" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={busy} onClick={create}>{busy && <Loader2 className="size-4 animate-spin" />} Create plan</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Panel (checkout) -------------------------------------------------------
export function TreatmentPlanPanel({ patientId }: { patientId: string }) {
  const [plans, setPlans] = React.useState<PlanView[] | null>(null);
  const [reload, setReload] = React.useState(0);
  const [bookingFor, setBookingFor] = React.useState<string | null>(null);
  const [when, setWhen] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/clinic/treatment-plans?active_patient_id=${patientId}`, { cache: "no-store" });
      if (cancelled) return;
      setPlans(res.ok ? await res.json() : []);
    })();
    return () => { cancelled = true; };
  }, [patientId, reload]);

  async function bookNext(planId: string) {
    if (!when) return toast.info("Pick a date & time.");
    setBusy(true);
    try {
      const d = await planApi({ action: "book_next", plan_id: planId, scheduled_time: new Date(when).toISOString() });
      if (d) { setBookingFor(null); setWhen(""); setReload((x) => x + 1); toast.success("Next session booked."); }
    } finally { setBusy(false); }
  }
  async function print(planId: string) {
    const d = await planApi({ action: "print", plan_id: planId });
    if (d && "id" in d) window.open(`/print/document/${d.id}`, "_blank");
  }

  if (plans === null) return <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Loading plans…</div>;
  if (plans.length === 0) return <p className="text-xs text-muted-foreground">No active treatment plan.</p>;

  return (
    <div className="space-y-2">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{p.title}</span>
            <span className="text-xs font-semibold text-honey-deep">{p.sessions_completed} / {p.sessions_planned}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((p.sessions_completed / p.sessions_planned) * 100)}%` }} />
          </div>
          {bookingFor === p.id ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="flex-1" />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setBookingFor(null)}>Cancel</Button>
                <Button size="sm" disabled={busy} onClick={() => bookNext(p.id)}>Book</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setBookingFor(p.id); setWhen(""); }}><CalendarPlus className="size-3.5" /> Book next</Button>
              <Button variant="ghost" size="sm" onClick={() => print(p.id)}><Printer className="size-3.5" /> View</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Patient card (read-only) ----------------------------------------------
export function PatientPlanCard({ plans }: { plans: PlanView[] }) {
  const active = plans.filter((p) => p.status === "active" || p.status === "completed");
  if (active.length === 0) return null;
  return (
    <div className="space-y-3">
      {active.map((p) => (
        <div key={p.id} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-honey-deep" />
            <span className="font-semibold">{p.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">{p.status}</span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">{p.sessions_completed} of {p.sessions_planned} sessions complete</div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-honey" style={{ width: `${Math.round((p.sessions_completed / p.sessions_planned) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// convenience: a collapsible section wrapper (checkout side rail)
export function PlanSection({ children, title = "Treatment Plans" }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = React.useState(true);
  return (
    <section className="rounded-2xl border bg-card p-4">
      <button className="mb-2 flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && children}
    </section>
  );
}
