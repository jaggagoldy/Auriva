"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Pill, FlaskConical, Receipt, CalendarCheck2, ChevronRight, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientSession } from "@/components/patient/patient-session";
import { Appointment, formatDay, parseMedicines } from "@/shared/queue";

const TABS = [
  { id: "timeline", label: "Timeline" },
  { id: "rx", label: "Rx" },
  { id: "bills", label: "Bills" },
  { id: "reports", label: "Reports" },
] as const;
type TabId = (typeof TABS)[number]["id"];

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: "draft" | "issued" | "paid" | "void";
  total: number;
  created_at: string;
  payments: { amount: number }[];
}
interface LabOrderRow {
  id: string;
  status: "ordered" | "resulted" | "cancelled";
  tests_json: string;
  result_values_json: string | null;
  ordered_at: string;
  resulted_at: string | null;
  doctor: { full_name: string };
}

function parseTests(json: string): { name: string }[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PatientRecordsPage() {
  return (
    <React.Suspense fallback={<div className="p-5 text-sm text-muted-foreground">Loading…</div>}>
      <RecordsInner />
    </React.Suspense>
  );
}

function RecordsInner() {
  const { patientProfile } = usePatientSession();
  const params = useSearchParams();
  const initial = TABS.some((t) => t.id === params.get("tab")) ? (params.get("tab") as TabId) : "timeline";
  const [tab, setTab] = React.useState<TabId>(initial);

  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [invoices, setInvoices] = React.useState<InvoiceRow[] | null>(null);
  const [labOrders, setLabOrders] = React.useState<LabOrderRow[] | null>(null);

  React.useEffect(() => {
    fetch(`/api/appointments?patient_id=${patientProfile.id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setAppointments)
      .catch(() => setAppointments([]));
    fetch(`/api/patients/${patientProfile.id}/invoices`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setInvoices)
      .catch(() => setInvoices([]));
    fetch(`/api/patients/${patientProfile.id}/lab-orders`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setLabOrders)
      .catch(() => setLabOrders([]));
  }, [patientProfile.id]);

  const timeline = (appointments ?? [])
    .slice()
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
  const prescriptions = timeline.filter(
    (a) => a.diagnosis?.trim() || a.prescription_notes?.trim() || parseMedicines(a.prescription_medicines_json).length > 0
  );

  return (
    <div>
      <div className="sticky top-0 z-20 bg-background/90 px-5 pt-5 pb-2 backdrop-blur">
        <h1 className="font-heading text-[21px] font-bold">Your records</h1>
        <div className="mt-3 flex gap-1.5 rounded-[13px] bg-secondary p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-[10px] py-2 font-heading text-[12.5px] font-semibold transition",
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-3 pb-6">
        {tab === "timeline" && <TimelinePane appointments={appointments} timeline={timeline} />}
        {tab === "rx" && <RxPane loading={appointments === null} prescriptions={prescriptions} />}
        {tab === "bills" && <BillsPane invoices={invoices} />}
        {tab === "reports" && <ReportsPane labOrders={labOrders} />}
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed py-14 text-center">
      <Icon className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-[16rem] text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Skeleton({ n, h }: { n: number; h: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-[15px] bg-muted/60" style={{ height: h }} />
      ))}
    </div>
  );
}

function Row({ av, avTone, title, meta, right }: { av: React.ReactNode; avTone?: string; title: string; meta: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[15px] border bg-card p-3.5">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-[13px] font-heading text-[13px] font-bold", avTone ?? "bg-accent text-accent-foreground")}>
        {av}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-[15px] font-bold">{title}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">{meta}</p>
      </div>
      {right ?? <ChevronRight className="size-5 shrink-0 text-muted-foreground/40" />}
    </div>
  );
}

function TimelinePane({ appointments, timeline }: { appointments: Appointment[] | null; timeline: Appointment[] }) {
  if (appointments === null) return <Skeleton n={3} h={72} />;
  if (timeline.length === 0)
    return <Empty icon={CalendarCheck2} title="Nothing here yet" sub="Your visit history builds up here over time." />;
  return (
    <div className="space-y-2.5">
      {timeline.map((a) => {
        const day = new Date(a.scheduled_time).getDate().toString().padStart(2, "0");
        const done = a.status === "completed";
        const label =
          a.status === "cancelled" ? "Appointment cancelled" : a.status === "no_show" ? "Missed appointment" : done ? "Consultation" : "Appointment";
        return (
          <Row
            key={a.id}
            av={day}
            avTone={done ? "bg-honey-soft text-honey-deep" : "bg-accent text-accent-foreground"}
            title={`${label} · ${a.doctor.full_name}`}
            meta={`${formatDay(a.scheduled_time)} · ${a.doctor.specialty || "General practitioner"}`}
          />
        );
      })}
    </div>
  );
}

function RxPane({ loading, prescriptions }: { loading: boolean; prescriptions: Appointment[] }) {
  if (loading) return <Skeleton n={2} h={96} />;
  if (prescriptions.length === 0)
    return <Empty icon={Pill} title="No prescriptions yet" sub="Signed prescriptions from your visits appear here." />;
  return (
    <div className="space-y-3">
      {prescriptions.map((a) => {
        const meds = parseMedicines(a.prescription_medicines_json);
        return (
          <div key={a.id} className="rounded-[15px] border bg-card p-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-honey-deep" />
              <p className="font-heading text-[15px] font-bold">{a.diagnosis || "Consultation"}</p>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {a.doctor.full_name} · {formatDay(a.scheduled_time)}
            </p>
            {meds.length > 0 && (
              <div className="mt-3 space-y-2">
                {meds.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[12px] bg-secondary/60 px-3 py-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-honey-soft text-honey-deep">
                      <Pill className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">{m.name}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {a.prescription_notes && <p className="mt-3 text-[12.5px] text-muted-foreground">{a.prescription_notes}</p>}
            {a.follow_up_date && (
              <p className="mt-2 text-[11.5px] font-semibold text-honey-deep">Follow-up: {formatDay(a.follow_up_date)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BillsPane({ invoices }: { invoices: InvoiceRow[] | null }) {
  if (invoices === null) return <Skeleton n={2} h={64} />;
  if (invoices.length === 0) return <Empty icon={Receipt} title="No bills yet" sub="Invoices from your visits appear here." />;
  return (
    <div className="space-y-2.5">
      {invoices.map((inv) => {
        const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
        const balance = inv.total - paid;
        const due = inv.status !== "paid" && inv.status !== "void" && balance > 0;
        return (
          <Row
            key={inv.id}
            av="₹"
            avTone="bg-secondary text-foreground"
            title={inv.invoice_number}
            meta={formatDay(inv.created_at)}
            right={
              <div className="shrink-0 text-right">
                <p className="font-heading text-[15px] font-bold tabular-nums">₹{inv.total.toLocaleString("en-IN")}</p>
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    inv.status === "paid" ? "text-success" : due ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {inv.status === "paid" ? "Paid" : inv.status === "void" ? "Void" : due ? "Due" : "—"}
                </span>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

function ReportsPane({ labOrders }: { labOrders: LabOrderRow[] | null }) {
  if (labOrders === null) return <Skeleton n={2} h={72} />;
  if (labOrders.length === 0)
    return <Empty icon={FlaskConical} title="No lab reports yet" sub="Tests your doctor orders appear here." />;
  return (
    <div className="space-y-2.5">
      {labOrders.map((order) => {
        const tests = parseTests(order.tests_json).map((t) => t.name).join(", ");
        const resulted = order.status === "resulted";
        return (
          <div key={order.id} className="rounded-[15px] border bg-card p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-accent font-heading text-[12px] font-bold text-accent-foreground">
                Lab
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-[15px] font-bold">{tests || "Lab test"}</p>
                <p className="truncate text-[12.5px] text-muted-foreground">
                  {order.doctor.full_name} · {formatDay(order.ordered_at)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  resulted ? "bg-success/15 text-success" : order.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-honey-soft text-honey-deep"
                )}
              >
                {resulted ? "Ready" : order.status === "cancelled" ? "Cancelled" : "Awaiting"}
              </span>
            </div>
            {resulted && order.result_values_json && (
              <div className="mt-3 divide-y rounded-[12px] border">
                {(() => {
                  try {
                    const values = JSON.parse(order.result_values_json) as { test: string; value: string; unit?: string; reference?: string }[];
                    return values.map((v, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                        <span className="font-medium">{v.test}</span>
                        <span className="tabular-nums">{[v.value, v.unit].filter(Boolean).join(" ")}</span>
                      </div>
                    ));
                  } catch {
                    return null;
                  }
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
