"use client";

import * as React from "react";
import {
  Pill,
  FlaskConical,
  Activity,
  FileStack,
  Receipt,
  CalendarCheck2,
  Droplet,
  ShieldAlert,
  HeartPulse,
  Stethoscope,
  Phone,
  CreditCard,
  Wallet,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatientSession } from "@/components/patient/patient-session";
import HealthSummaryDialog from "@/components/patient/health-summary-dialog";
import { Appointment, STATUS_META, formatDay, formatTime, parseMedicines } from "@/shared/queue";

const TABS = [
  { id: "timeline", label: "Timeline" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "reports", label: "Lab Reports" },
  { id: "vitals", label: "Vitals" },
  { id: "documents", label: "Documents" },
  { id: "bills", label: "Bills" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const COMING_SOON: Record<Extract<TabId, "vitals" | "documents">, { icon: React.ComponentType<{ className?: string }>; title: string; body: string }> = {
  vitals: {
    icon: Activity,
    title: "Vitals tracking is coming soon",
    body: "Log and trend your own blood pressure, sugar and weight readings over time.",
  },
  documents: {
    icon: FileStack,
    title: "Document uploads are coming soon",
    body: "Store scans and external records here so they travel with the rest of your health record.",
  },
};

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
  const { patientProfile } = usePatientSession();
  const [tab, setTab] = React.useState<TabId>("timeline");
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [invoices, setInvoices] = React.useState<InvoiceRow[] | null>(null);
  const [labOrders, setLabOrders] = React.useState<LabOrderRow[] | null>(null);

  React.useEffect(() => {
    fetch(`/api/appointments?patient_id=${patientProfile.id}`, { cache: "no-store" })
      .then((res) => res.json())
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

  const lastVisit = timeline.find((a) => a.status === "completed") ?? null;
  const primaryDoctor = timeline[0]?.doctor.full_name ?? null;

  // A visit counts as "a prescription" once the doctor recorded a diagnosis,
  // notes, or at least one medicine — the same fields the Consult Workbench
  // writes via Prescription (APS-043), already real, just not surfaced here
  // until now.
  const prescriptions = timeline.filter(
    (a) => a.diagnosis?.trim() || a.prescription_notes?.trim() || parseMedicines(a.prescription_medicines_json).length > 0
  );

  return (
    <main className="mx-auto max-w-[1240px] px-7 py-6">
      <h1 className="mb-4 text-lg font-semibold">Health Records</h1>

      {/* Health Summary (APS-010) — orientation before the timeline */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <SummaryTile icon={Droplet} label="Blood Group" value={patientProfile.blood_group} tone="text-destructive" />

        <HealthSummaryDialog
          trigger={
            <button className="w-full">
              <SummaryTile
                icon={ShieldAlert}
                label="Allergies"
                value={patientProfile.allergies || undefined}
                addLabel="+ Add allergies"
              />
            </button>
          }
        />

        <HealthSummaryDialog
          trigger={
            <button className="w-full">
              <SummaryTile
                icon={HeartPulse}
                label="Chronic Conditions"
                value={patientProfile.chronic_conditions || undefined}
                addLabel="+ Add condition"
              />
            </button>
          }
        />

        <SummaryTile
          icon={Stethoscope}
          label="Primary Doctor"
          value={primaryDoctor ?? undefined}
          placeholder="Not yet seen"
          tone="text-foreground"
        />

        <HealthSummaryDialog
          trigger={
            <button className="w-full">
              <SummaryTile
                icon={Phone}
                label="Emergency Contact"
                value={
                  patientProfile.emergency_contact_name
                    ? `${patientProfile.emergency_contact_name}${patientProfile.emergency_contact_phone ? ` · ${patientProfile.emergency_contact_phone}` : ""}`
                    : undefined
                }
                addLabel="+ Add contact"
              />
            </button>
          }
        />

        <SummaryTile icon={CreditCard} label="Insurance" value={undefined} placeholder="Coming soon" muted />
        <SummaryTile icon={Wallet} label="Auriva Health ID" value={patientProfile.health_id} mono />
        <SummaryTile
          icon={Clock3}
          label="Last Visit"
          value={lastVisit ? formatDay(lastVisit.scheduled_time) : undefined}
          placeholder="No visits yet"
        />
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 border-b-2 px-1 pb-2.5 text-[13px] font-medium transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            style={{ marginRight: 22 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timeline" ? (
        appointments === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <CalendarCheck2 className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="text-xs text-muted-foreground">Your visit history will build up here over time.</p>
          </div>
        ) : (
          <div className="relative max-w-2xl pl-6">
            <div className="absolute top-1.5 bottom-1.5 left-[9px] w-px bg-border" />
            <div className="flex flex-col gap-6">
              {timeline.map((a) => {
                const meta = STATUS_META[a.status];
                return (
                  <div key={a.id} className="relative">
                    <span className={cn("absolute -left-6 top-1.5 size-3 rounded-full ring-4 ring-background", meta.dot)} />
                    <p className="text-[11px] font-medium text-muted-foreground uppercase">
                      {formatDay(a.scheduled_time)} · {formatTime(a.scheduled_time)}
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-semibold">
                      {a.status === "completed"
                        ? `Consultation — ${a.doctor.full_name}`
                        : a.status === "cancelled"
                          ? `Appointment cancelled — ${a.doctor.full_name}`
                          : a.status === "no_show"
                            ? `Missed appointment — ${a.doctor.full_name}`
                            : `Appointment with ${a.doctor.full_name}`}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {a.doctor.specialty || "General Practitioner"} · {a.clinic.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : tab === "prescriptions" ? (
        appointments === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <Pill className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No prescriptions yet</p>
            <p className="text-xs text-muted-foreground">Signed prescriptions from your visits will appear here.</p>
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-3">
            {prescriptions.map((a) => {
              const medicines = parseMedicines(a.prescription_medicines_json);
              return (
                <div key={a.id} className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13.5px] font-semibold">{a.diagnosis || "Consultation"}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {a.doctor.full_name} · {a.doctor.specialty || "General Practitioner"} ·{" "}
                        {formatDay(a.scheduled_time)}
                      </p>
                    </div>
                  </div>

                  {medicines.length > 0 && (
                    <div className="mt-3 divide-y rounded-lg border">
                      {medicines.map((m, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 text-[12px]">
                          <span className="col-span-2 font-medium">{m.name}</span>
                          <span className="text-muted-foreground">{m.dosage}</span>
                          <span className="text-muted-foreground">{m.frequency}</span>
                          {m.duration && (
                            <span className="col-span-4 mt-0.5 text-[11px] text-muted-foreground">{m.duration}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {a.prescription_notes && (
                    <p className="mt-3 text-[12.5px] text-muted-foreground">{a.prescription_notes}</p>
                  )}

                  {a.follow_up_date && (
                    <p className="mt-2 text-[11.5px] font-medium text-primary">
                      Follow-up: {formatDay(a.follow_up_date)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : tab === "reports" ? (
        labOrders === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : labOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <FlaskConical className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No lab orders yet</p>
            <p className="text-xs text-muted-foreground">Tests your doctor orders will appear here.</p>
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-3">
            {labOrders.map((order) => {
              const tests = parseTests(order.tests_json);
              return (
                <div key={order.id} className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13.5px] font-semibold">{tests.map((t) => t.name).join(", ")}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {order.doctor.full_name} · Ordered {formatDay(order.ordered_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                        order.status === "resulted"
                          ? "bg-success/10 text-success dark:text-success"
                          : order.status === "cancelled"
                            ? "bg-destructive/10 text-destructive dark:text-destructive"
                            : "bg-warning/10 text-warning dark:text-warning"
                      )}
                    >
                      {order.status === "resulted" ? "Result ready" : order.status === "cancelled" ? "Cancelled" : "Awaiting result"}
                    </span>
                  </div>
                  {order.status === "resulted" && order.result_values_json && (
                    <div className="mt-3 divide-y rounded-lg border">
                      {(() => {
                        try {
                          const values = JSON.parse(order.result_values_json) as {
                            test: string;
                            value: string;
                            unit: string;
                            reference: string;
                          }[];
                          return values.map((v, i) => (
                            <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 text-[12px]">
                              <span className="col-span-2 font-medium">{v.test}</span>
                              <span>
                                {v.value} {v.unit}
                              </span>
                              <span className="text-muted-foreground">Ref: {v.reference}</span>
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
        )
      ) : tab === "bills" ? (
        invoices === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <Receipt className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No bills yet</p>
            <p className="text-xs text-muted-foreground">Invoices from your visits will appear here.</p>
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-2">
            {invoices.map((inv) => {
              const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
              const balance = inv.total - paid;
              return (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-xs">
                  <div>
                    <p className="text-[13px] font-semibold">{inv.invoice_number}</p>
                    <p className="text-[11.5px] text-muted-foreground">{formatDay(inv.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums">₹{inv.total.toLocaleString("en-IN")}</p>
                    <p
                      className={cn(
                        "text-[11px] font-medium",
                        inv.status === "paid" ? "text-success" : balance > 0 ? "text-warning" : "text-muted-foreground"
                      )}
                    >
                      {inv.status === "paid" ? "Paid" : inv.status === "void" ? "Void" : `₹${balance.toLocaleString("en-IN")} due`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <ComingSoonPanel {...COMING_SOON[tab]} />
      )}
    </main>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  placeholder,
  addLabel,
  tone,
  mono,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  placeholder?: string;
  addLabel?: string;
  tone?: string;
  mono?: boolean;
  muted?: boolean;
}) {
  const empty = !value;
  return (
    <div
      className={cn(
        "h-full rounded-xl border bg-card p-3 text-left shadow-xs",
        empty && addLabel && "border-dashed",
        muted && "opacity-60"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-[9.5px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      </div>
      {empty ? (
        <p className={cn("mt-1.5 text-[12px] font-semibold", addLabel ? "text-primary" : "text-muted-foreground")}>
          {addLabel ?? placeholder}
        </p>
      ) : (
        <p className={cn("mt-1.5 truncate text-[13px] font-semibold", tone, mono && "font-mono")}>{value}</p>
      )}
    </div>
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
