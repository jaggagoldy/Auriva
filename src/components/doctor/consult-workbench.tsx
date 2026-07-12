"use client";

import * as React from "react";
import {
  Building2,
  ClipboardList,
  Droplets,
  FlaskConical,
  HeartPulse,
  Info,
  Loader2,
  MessageSquareText,
  Play,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Appointment,
  AppointmentStatus,
  STATUS_META,
  formatDay,
  formatRelative,
  formatTime,
  getInitials,
  parseVitals,
} from "@/shared/queue";
import AppointmentDrawer from "@/components/shared/appointment-drawer";
import PrescriptionEditor from "@/components/doctor/prescription-editor";

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

interface ConsultWorkbenchProps {
  appointment: Appointment | null;
  doctorId: string;
  recentMedicines: string[];
  updating: boolean;
  onUpdateStatus: (appointment: Appointment, next: AppointmentStatus) => void;
  onSaveClinical: (
    appointment: Appointment,
    patch: Record<string, string | null>,
    opts?: { silent?: boolean }
  ) => Promise<void>;
}

export default function ConsultWorkbench({
  appointment,
  doctorId,
  recentMedicines,
  updating,
  onUpdateStatus,
  onSaveClinical,
}: ConsultWorkbenchProps) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  if (!appointment) {
    return (
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/50">
          <Stethoscope className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No patient selected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a patient from the queue to open their consultation.
          </p>
        </div>
      </main>
    );
  }

  const meta = STATUS_META[appointment.status];
  const age = ageFromDob(appointment.patient.date_of_birth ?? null);

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar className="size-11 rounded-lg">
            <AvatarFallback className="rounded-lg text-sm font-semibold">
              {getInitials(appointment.patient.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-lg leading-tight font-semibold">
                {appointment.patient.full_name}
              </h1>
              <Badge className={cn("gap-1.5", meta.badge)}>
                <span className={cn("size-1.5 rounded-full", meta.dot)} />
                {meta.label}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {age !== null ? `${age} · ` : ""}
              {appointment.patient.gender ?? ""}
              {appointment.patient.gender ? " · " : ""}
              Token <span className="font-mono">{appointment.queue_number ?? "—"}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="View appointment details" onClick={() => setDetailsOpen(true)}>
            <Info />
          </Button>
          {appointment.status === "scheduled" && (
            <Button variant="outline" disabled={updating} onClick={() => onUpdateStatus(appointment, "waiting")}>
              Move to Waiting
            </Button>
          )}
          {(appointment.status === "scheduled" ||
            appointment.status === "waiting" ||
            appointment.status === "doctor_ready" ||
            appointment.status === "skipped") && (
            <Button disabled={updating} onClick={() => onUpdateStatus(appointment, "in_consultation")}>
              {updating ? <Loader2 className="animate-spin" /> : <Play />}
              Start Consultation
            </Button>
          )}
          {appointment.status === "in_consultation" && (
            <p className="text-sm text-muted-foreground">Consultation in progress</p>
          )}
          {appointment.status === "completed" && (
            <p className="text-sm text-muted-foreground">Consultation completed</p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-6 py-5">
          <dl className="grid grid-cols-4 divide-x rounded-xl border bg-card">
            <DetailCell
              icon={Droplets}
              label="Blood Group"
              value={<span className="font-semibold text-destructive dark:text-destructive">{appointment.patient.blood_group}</span>}
            />
            <DetailCell
              icon={ClipboardList}
              label="Scheduled"
              value={`${formatDay(appointment.scheduled_time)} · ${formatTime(appointment.scheduled_time)}`}
              hint={formatRelative(appointment.scheduled_time)}
            />
            <DetailCell icon={Stethoscope} label="Attending Doctor" value={appointment.doctor.full_name} hint={appointment.doctor.specialty ?? undefined} />
            <DetailCell icon={Building2} label="Clinic" value={appointment.clinic.name} hint={appointment.clinic.address} />
          </dl>

          <IntakeSection
            key={`intake-${appointment.id}`}
            appointment={appointment}
            onSave={(patch) => onSaveClinical(appointment, patch, { silent: true })}
          />

          <LabOrdersSection
            key={`lab-${appointment.id}`}
            appointment={appointment}
            doctorId={doctorId}
          />

          <PrescriptionEditor
            key={`rx-${appointment.id}`}
            appointment={appointment}
            doctorId={doctorId}
            recentMedicines={recentMedicines}
            updating={updating}
            onSaveDraft={(patch) => onSaveClinical(appointment, patch, { silent: true })}
            onSignComplete={async (patch) => {
              await onSaveClinical(appointment, patch);
              onUpdateStatus(appointment, "completed");
              toast.success(`Consultation signed & completed for ${appointment.patient.full_name}`);
            }}
          />
        </div>
      </div>

      <AppointmentDrawer appointmentId={appointment.id} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </main>
  );
}

function IntakeSection({
  appointment,
  onSave,
}: {
  appointment: Appointment;
  onSave: (patch: Record<string, string | null>) => Promise<void>;
}) {
  const [chiefComplaint, setChiefComplaint] = React.useState(appointment.chief_complaint ?? "");
  const [history, setHistory] = React.useState(appointment.history_notes ?? "");
  const initialVitals = parseVitals(appointment.vitals_json) ?? { bp: "", pulse: "", temp: "", spo2: "", weight: "" };
  const [vitals, setVitals] = React.useState(initialVitals);
  const skipRef = React.useRef(true);

  React.useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      onSave({
        chief_complaint: chiefComplaint,
        history_notes: history,
        vitals_json: JSON.stringify(vitals),
      });
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiefComplaint, history, vitals]);

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <MessageSquareText className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Chief Complaint &amp; History</h2>
      </header>
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="chief-complaint">Chief complaint</Label>
          <Textarea
            id="chief-complaint"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="What the patient came in for, in their own words…"
            className="min-h-20 resize-y bg-background text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="history">History</Label>
          <Textarea
            id="history"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Relevant medical / surgical / family history…"
            className="min-h-20 resize-y bg-background text-[13px]"
          />
        </div>
      </div>
      <div className="border-t px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
          <HeartPulse className="size-3.5 text-muted-foreground" />
          <Label className="text-[12px]">Vitals</Label>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <VitalInput label="BP" placeholder="120/80" value={vitals.bp} onChange={(v) => setVitals((s) => ({ ...s, bp: v }))} />
          <VitalInput label="Pulse" placeholder="72 bpm" value={vitals.pulse} onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))} />
          <VitalInput label="Temp" placeholder="98.6°F" value={vitals.temp} onChange={(v) => setVitals((s) => ({ ...s, temp: v }))} />
          <VitalInput label="SpO2" placeholder="98%" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} />
          <VitalInput label="Weight" placeholder="70 kg" value={vitals.weight} onChange={(v) => setVitals((s) => ({ ...s, weight: v }))} />
        </div>
      </div>
    </section>
  );
}

function VitalInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 bg-background text-[12.5px]" />
    </div>
  );
}

// APS-042: order labs from the consult; the org worklist fulfills, the
// result lands back here (and on the patient timeline).
interface WorkbenchLabOrder {
  id: string;
  status: "ordered" | "resulted" | "cancelled";
  tests_json: string;
  result_values_json: string | null;
  result_notes: string | null;
  resulted_at: string | null;
}

function LabOrdersSection({
  appointment,
  doctorId,
}: {
  appointment: Appointment;
  doctorId: string;
}) {
  const [orders, setOrders] = React.useState<WorkbenchLabOrder[] | null>(null);
  const [testInput, setTestInput] = React.useState("");
  const [note, setNote] = React.useState("");
  const [placing, setPlacing] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(
      `/api/lab-orders?patient_id=${appointment.patient.id}&doctor_id=${doctorId}`,
      { cache: "no-store" }
    );
    if (res.ok) setOrders(await res.json());
  }, [appointment.patient.id, doctorId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const placeOrder = async () => {
    const tests = testInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    if (!tests.length) {
      toast.error("Enter one or more tests, comma-separated");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: appointment.patient.id,
          doctor_id: doctorId,
          appointment_id: appointment.id,
          tests,
          clinical_note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not place order");
      toast.success(`Lab order placed — ${tests.map((t) => t.name).join(", ")}`);
      setTestInput("");
      setNote("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <FlaskConical className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Lab Orders</h2>
      </header>

      {orders && orders.length > 0 && (
        <ul className="divide-y border-b">
          {orders.map((order) => {
            const tests: { name: string }[] = JSON.parse(order.tests_json || "[]");
            const values: { test: string; value: string; unit?: string; reference?: string }[] =
              order.result_values_json ? JSON.parse(order.result_values_json) : [];
            return (
              <li key={order.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {tests.map((t) => (
                      <Badge key={t.name} variant="outline">{t.name}</Badge>
                    ))}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-auto",
                      order.status === "resulted"
                        ? "bg-success/10 text-success"
                        : order.status === "ordered"
                          ? "bg-warning/10 text-warning dark:text-warning"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {order.status}
                  </Badge>
                </div>
                {order.status === "resulted" && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-[12.5px]">
                    {values.map((v) => (
                      <div key={v.test} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{v.test}</span>
                        <span className="font-medium tabular-nums">
                          {v.value} {v.unit}
                          {v.reference ? (
                            <span className="ml-1 font-normal text-muted-foreground">
                              (ref {v.reference})
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                    {order.result_notes && (
                      <p className="mt-1.5 border-t pt-1.5 text-muted-foreground">
                        {order.result_notes}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-end gap-2 p-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="lab-tests">Order tests</Label>
          <Input
            id="lab-tests"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="CBC, CRP, HbA1c…"
            className="bg-background text-[13px]"
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="lab-note">Clinical note</Label>
          <Input
            id="lab-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why (shown to the lab)"
            className="bg-background text-[13px]"
          />
        </div>
        <Button disabled={placing} onClick={placeOrder}>
          {placing ? <Loader2 className="animate-spin" /> : <FlaskConical />}
          Order
        </Button>
      </div>
    </section>
  );
}

function DetailCell({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
      {hint && <dd className="truncate text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}
