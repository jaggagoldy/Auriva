"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pill,
  Plus,
  Printer,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DiagnosticsSelector } from "@/components/clinic/diagnostics-selector";
import { getTest } from "@/domain/diagnostics-catalog";

// Phase 5 — Clinical consultation (matches design/mockups/auriva-clinical.html,
// adapted to real data + the warm design tokens). This REPLACES the cramped
// 4-field consult modal with a proper documentation workbench, without touching
// the backend contract: everything serializes into the existing
// `/api/clinic/consultation` (action:"complete") fields —
//   notes, diagnosis, prescription_notes (string), follow_up_date, treatment_id.
// The structured prescription is the value here (the top doctor-friction fix):
// medicine/dosage/frequency/duration rows + one-tap templates, serialized to
// prescription_notes. No fabricated vitals/allergies (architecture rule: no
// fake UI) — the side rail shows an honest, live "this visit" recap instead.

export interface WorkbenchService {
  id: string;
  name: string;
  price: number;
}

interface RxRow {
  id: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const FOLLOW_UP_OPTIONS = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
] as const;

const COMPLAINT_SUGGESTIONS = ["Pain", "Swelling", "Fever", "Stiffness", "Fatigue"];
// Generic starter templates — a real Medicine Library (with the owner's own
// favourites) is a later batch; these just remove first-visit typing.
const RX_TEMPLATES: { label: string; row: Omit<RxRow, "id"> }[] = [
  { label: "Paracetamol 650mg", row: { medicine: "Paracetamol 650mg", dosage: "1 tab", frequency: "SOS", duration: "3 days" } },
  { label: "Ibuprofen 400mg", row: { medicine: "Ibuprofen 400mg", dosage: "1 tab", frequency: "1-0-1", duration: "5 days" } },
  { label: "Pantoprazole 40mg", row: { medicine: "Pantoprazole 40mg", dosage: "1 tab", frequency: "1-0-0", duration: "5 days" } },
];

let rid = 0;
function newRow(seed?: Partial<RxRow>): RxRow {
  rid += 1;
  return { id: `rx-${rid}`, medicine: "", dosage: "", frequency: "", duration: "", ...seed };
}

function initials(name: string) {
  return (name.trim().slice(0, 2) || "?").toUpperCase();
}

function isoDateInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface ConsultationWorkbenchProps {
  appointmentId: string;
  patientName: string;
  clinicName: string;
  services: WorkbenchService[];
  onCancel: () => void;
  onCompleted: (invoice: { invoiceId?: string; total?: number }) => void;
}

export function ConsultationWorkbench({
  appointmentId,
  patientName,
  clinicName,
  services,
  onCancel,
  onCompleted,
}: ConsultationWorkbenchProps) {
  const [complaint, setComplaint] = React.useState("");
  const [exam, setExam] = React.useState("");
  const [diagnoses, setDiagnoses] = React.useState<string[]>([]);
  const [dxInput, setDxInput] = React.useState("");
  const [rows, setRows] = React.useState<RxRow[]>([newRow()]);
  const [testCodes, setTestCodes] = React.useState<string[]>([]);
  const [followUpDays, setFollowUpDays] = React.useState<number | null>(null);
  const [advice, setAdvice] = React.useState("");
  const [treatmentId, setTreatmentId] = React.useState("");
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [vitals, setVitals] = React.useState<VitalsState>({ bp: "", pulse: "", temp: "", spo2: "" });
  const [context, setContext] = React.useState<ConsultContext | null>(null);

  // Real clinical context for the left rail — scoped patient allergies /
  // current medicines / past visits. No fake vitals: vitals are captured live
  // by the clinician below and folded into the encounter note on complete.
  React.useEffect(() => {
    fetch(`/api/clinic/consultation?appointment_id=${appointmentId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ConsultContext | null) => { if (d) setContext(d); })
      .catch(() => {});
  }, [appointmentId]);

  const selectedService = services.find((s) => s.id === treatmentId) ?? null;
  const filledRx = rows.filter((r) => r.medicine.trim());

  function addDiagnosis(value: string) {
    const v = value.trim();
    if (!v) return;
    setDiagnoses((prev) => (prev.some((d) => d.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
    setDxInput("");
  }
  function updateRow(id: string, patch: Partial<RxRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setRows((prev) => {
      if (prev.length <= 1) {
        toast.info("At least one medicine row is required.");
        return prev;
      }
      return prev.filter((r) => r.id !== id);
    });
  }
  function appendComplaint(word: string) {
    setComplaint((prev) => (prev.trim() ? `${prev.replace(/\s+$/, "")}, ${word.toLowerCase()}` : word));
  }

  // Map the structured UI onto the real backend fields. Medicines go to the
  // structured Prescription store (medicines_json) so they reach the printable
  // prescription and the patient timeline; chief complaint has its own column;
  // examination + investigations become the encounter note; advice rides on
  // the prescription's notes line.
  function buildPayload() {
    const medicines = filledRx.map((r) => ({
      name: r.medicine.trim(),
      dosage: r.dosage.trim(),
      frequency: r.frequency.trim(),
      duration: r.duration.trim(),
    }));

    // Vitals captured this visit ride into the encounter note (no schema
    // change) so they persist on the record and the printable summary.
    const vitalsLine = [
      vitals.bp.trim() && `BP ${vitals.bp.trim()}`,
      vitals.pulse.trim() && `Pulse ${vitals.pulse.trim()}`,
      vitals.temp.trim() && `Temp ${vitals.temp.trim()}`,
      vitals.spo2.trim() && `SpO₂ ${vitals.spo2.trim()}`,
    ].filter(Boolean).join(", ");
    const notes = [vitalsLine && `Vitals: ${vitalsLine}`, exam.trim()].filter(Boolean).join("\n");

    return {
      action: "complete" as const,
      appointment_id: appointmentId,
      chief_complaint: complaint.trim() || undefined,
      notes: notes || undefined,
      diagnosis: diagnoses.join(", ") || undefined,
      prescription_notes: advice.trim() || undefined,
      prescription_medicines_json: medicines.length ? JSON.stringify(medicines) : undefined,
      test_codes: testCodes.length ? testCodes : undefined,
      follow_up_date: followUpDays != null ? isoDateInDays(followUpDays) : undefined,
      treatment_id: treatmentId || undefined,
    };
  }

  async function completeVisit() {
    setBusy(true);
    try {
      const res = await fetch("/api/clinic/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.message ?? "Couldn't complete the visit.");
        return;
      }
      onCompleted({ invoiceId: d.invoiceId, total: d.total });
    } finally {
      setBusy(false);
    }
  }

  const followUpLabel =
    followUpDays != null ? FOLLOW_UP_OPTIONS.find((o) => o.days === followUpDays)?.label ?? null : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Workspace</span>
        </button>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card py-1 pl-1 pr-3">
          <span className="grid size-8 place-items-center rounded-lg bg-honey-soft text-xs font-bold text-honey-deep">
            {initials(patientName)}
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{patientName}</div>
            <div className="text-[11px] text-muted-foreground">Consultation in progress</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="hidden sm:inline-flex">
            Cancel
          </Button>
          <Button size="sm" onClick={() => setReviewOpen(true)}>
            <CheckCircle2 className="size-4" /> Review &amp; complete
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-5 p-4 md:grid-cols-[288px_minmax(0,1fr)] md:p-6 lg:gap-6 xl:px-8">
          {/* LEFT — real clinical context rail (matches the approved mockup) */}
          <ContextRail context={context} vitals={vitals} onVitals={setVitals} />

          {/* Main documentation column */}
          <div className="min-w-0 space-y-4">
            <Section icon={<Stethoscope className="size-4" />} title="Chief complaint" hint="why they came in">
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="e.g. Lower-back pain, worse on bending, 3 days…"
                className={textareaCls}
                rows={2}
                autoFocus
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {COMPLAINT_SUGGESTIONS.map((s) => (
                  <SuggestChip key={s} onClick={() => appendComplaint(s)}>
                    + {s}
                  </SuggestChip>
                ))}
              </div>
            </Section>

            <Section title="Examination &amp; notes">
              <textarea
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                placeholder="Clinical findings…"
                className={textareaCls}
                rows={3}
              />
            </Section>

            <Section title="Diagnosis">
              {diagnoses.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-2">
                  {diagnoses.map((d) => (
                    <Chip key={d} onRemove={() => setDiagnoses((prev) => prev.filter((x) => x !== d))}>
                      {d}
                    </Chip>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={dxInput}
                  onChange={(e) => setDxInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDiagnosis(dxInput);
                    }
                  }}
                  placeholder="Add a diagnosis and press Enter"
                />
                <Button variant="outline" onClick={() => addDiagnosis(dxInput)}>
                  Add
                </Button>
              </div>
            </Section>

            {/* Prescription builder — the core of this screen */}
            <Section icon={<Pill className="size-4" />} title="Prescription" hint="dose · frequency · duration">
              <div className="hidden gap-2 px-1 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1.6fr_1fr_1fr_1fr_32px]">
                <span>Medicine</span>
                <span>Dosage</span>
                <span>Frequency</span>
                <span>Duration</span>
                <span />
              </div>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-3 gap-2 sm:grid-cols-[1.6fr_1fr_1fr_1fr_32px] sm:items-center">
                    <Input
                      className="col-span-3 sm:col-span-1"
                      value={r.medicine}
                      onChange={(e) => updateRow(r.id, { medicine: e.target.value })}
                      placeholder="Medicine"
                    />
                    <Input value={r.dosage} onChange={(e) => updateRow(r.id, { dosage: e.target.value })} placeholder="1 tab" />
                    <Input value={r.frequency} onChange={(e) => updateRow(r.id, { frequency: e.target.value })} placeholder="1-0-1" />
                    <Input value={r.duration} onChange={(e) => updateRow(r.id, { duration: e.target.value })} placeholder="5 days" />
                    <button
                      onClick={() => removeRow(r.id)}
                      className="hidden size-8 place-items-center rounded-lg bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:grid"
                      aria-label="Remove medicine"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <button
                      onClick={() => removeRow(r.id)}
                      className="col-span-3 inline-flex items-center justify-center gap-1 rounded-lg bg-secondary py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:hidden"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, newRow()])}>
                  <Plus className="size-3.5" /> Add medicine
                </Button>
                {RX_TEMPLATES.map((t) => (
                  <SuggestChip key={t.label} onClick={() => setRows((prev) => [...prev.filter((r) => r.medicine.trim()), newRow(t.row)])}>
                    + {t.label}
                  </SuggestChip>
                ))}
              </div>
            </Section>

            <Section icon={<ClipboardList className="size-4" />} title="Investigations" hint="recommend tests — sent to the patient">
              <DiagnosticsSelector selected={testCodes} onChange={setTestCodes} />
            </Section>

            <Section title="Follow-up &amp; advice">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">Review in</div>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_OPTIONS.map((o) => (
                  <button
                    key={o.days}
                    onClick={() => setFollowUpDays((cur) => (cur === o.days ? null : o.days))}
                    className={cn(
                      "rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                      followUpDays === o.days
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs font-semibold text-muted-foreground">Advice</div>
              <textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Rest, warm compress, avoid heavy lifting…"
                className={cn(textareaCls, "mt-1.5")}
                rows={2}
              />
            </Section>

            {/* Treatment & fee — the visit charge. Single-service for now;
                multi-line-item billing is a later (P4) scope. */}
            <Section icon={<Banknote className="size-4" />} title="Treatment &amp; fee">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Consultation (default fee)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ₹{s.price.toLocaleString()}
                    </option>
                  ))}
                </select>
                <div className="flex items-baseline justify-between gap-3 sm:justify-end">
                  <span className="text-sm text-muted-foreground">To collect</span>
                  <span className="font-heading text-xl font-bold text-honey-deep">
                    {selectedService ? `₹${selectedService.price.toLocaleString()}` : "Default fee"}
                  </span>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>

      {reviewOpen && (
        <VisitSummary
          clinicName={clinicName}
          patientName={patientName}
          complaint={complaint}
          diagnoses={diagnoses}
          rx={filledRx}
          investigations={testCodes.map((c) => getTest(c)?.name ?? c)}
          advice={advice}
          followUpLabel={followUpLabel}
          fee={selectedService ? `₹${selectedService.price.toLocaleString()}` : "Consultation fee"}
          busy={busy}
          onBack={() => setReviewOpen(false)}
          onComplete={completeVisit}
        />
      )}
    </div>
  );
}

const textareaCls =
  "w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: title }} />
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Chip({ children, onRemove, honey }: { children: React.ReactNode; onRemove: () => void; honey?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium",
        honey ? "bg-honey-soft text-honey-deep" : "bg-primary/10 text-primary"
      )}
    >
      {children}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100" aria-label="Remove">
        <X className="size-3.5" />
      </button>
    </span>
  );
}

function SuggestChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </button>
  );
}

type VitalsState = { bp: string; pulse: string; temp: string; spo2: string };
interface ConsultContext {
  patient: {
    full_name: string;
    blood_group: string | null;
    allergies: string | null;
    chronic_conditions: string | null;
    date_of_birth: string | null;
    gender: string | null;
  } | null;
  current_medicines: { name: string; dosage?: string; frequency?: string; duration?: string }[];
  past_visits: { id: string; date: string; title: string; subtitle: string }[];
}

// Left clinical-context rail (matches design/mockups/auriva-clinical.html):
// real allergies / current meds / past visits, plus live vitals capture (no
// fabricated readings — empty until the clinician enters them).
function ContextRail({
  context,
  vitals,
  onVitals,
}: {
  context: ConsultContext | null;
  vitals: VitalsState;
  onVitals: React.Dispatch<React.SetStateAction<VitalsState>>;
}) {
  const p = context?.patient;
  const allergies = p?.allergies?.trim();
  const conditions = p?.chronic_conditions?.trim();
  return (
    <aside className="space-y-3 md:sticky md:top-4 md:self-start">
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Vitals</span>
          <span className="text-[10px] text-muted-foreground">this visit</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <VitalInput label="BP" unit="mmHg" placeholder="120/80" value={vitals.bp} onChange={(v) => onVitals((s) => ({ ...s, bp: v }))} />
          <VitalInput label="Pulse" unit="bpm" placeholder="72" value={vitals.pulse} onChange={(v) => onVitals((s) => ({ ...s, pulse: v }))} />
          <VitalInput label="Temp" unit="°F" placeholder="98.4" value={vitals.temp} onChange={(v) => onVitals((s) => ({ ...s, temp: v }))} />
          <VitalInput label="SpO₂" unit="%" placeholder="98" value={vitals.spo2} onChange={(v) => onVitals((s) => ({ ...s, spo2: v }))} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Allergies</div>
        {allergies ? (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] font-semibold text-destructive">
            <AlertTriangle className="size-4 shrink-0" /> {allergies}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">None recorded</p>
        )}
        {conditions && (
          <p className="mt-2 text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">Conditions:</span> {conditions}
          </p>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Current medicines</div>
        {context && context.current_medicines.length > 0 ? (
          <div className="divide-y">
            {context.current_medicines.map((m, i) => (
              <div key={i} className="py-2 first:pt-0 last:pb-0">
                <div className="text-[13px] font-semibold">{m.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{[m.frequency, m.duration].filter(Boolean).join(" · ") || "—"}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">None on record</p>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Past visits</div>
        {context && context.past_visits.length > 0 ? (
          <div className="space-y-2.5">
            {context.past_visits.map((v) => (
              <div key={v.id} className="flex gap-2.5 text-[12.5px]">
                <span className="w-11 shrink-0 font-heading font-bold text-primary">
                  {new Date(v.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{v.title}</div>
                  {v.subtitle && <div className="truncate text-muted-foreground">{v.subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">First visit</p>
        )}
      </div>
    </aside>
  );
}

function VitalInput({
  label,
  unit,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-background px-2.5 py-2">
      <div className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent font-heading text-[15px] font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
      />
      <div className="text-[9.5px] text-muted-foreground">{unit}</div>
    </div>
  );
}

function VisitSummary({
  clinicName,
  patientName,
  complaint,
  diagnoses,
  rx,
  investigations,
  advice,
  followUpLabel,
  fee,
  busy,
  onBack,
  onComplete,
}: {
  clinicName: string;
  patientName: string;
  complaint: string;
  diagnoses: string[];
  rx: RxRow[];
  investigations: string[];
  advice: string;
  followUpLabel: string | null;
  fee: string;
  busy: boolean;
  onBack: () => void;
  onComplete: () => void;
}) {
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 backdrop-blur-sm print:static print:block print:bg-transparent print:p-0">
      <div className="my-6 w-full max-w-[620px] overflow-hidden rounded-2xl bg-card shadow-xl print:my-0 print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center gap-3 border-b p-4 print:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-success/15 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">Visit summary</h3>
            <p className="text-xs text-muted-foreground">Review, then complete the visit and collect payment</p>
          </div>
          <button onClick={onBack} className="ml-auto grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {/* Printable prescription paper */}
        <div id="visit-summary-paper" className="px-6 py-6 text-sm">
          <div className="mb-4 flex items-start justify-between border-b-2 border-primary pb-3">
            <div>
              <div className="font-heading text-lg font-bold text-primary">{clinicName}</div>
              <div className="text-xs text-muted-foreground">Prescription &amp; visit summary</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">{today}</div>
          </div>

          <div className="mb-4 flex items-center justify-between text-[13px]">
            <span className="font-semibold">{patientName}</span>
          </div>

          {complaint.trim() && <SummarySec label="Chief complaint">{complaint.trim()}</SummarySec>}

          {diagnoses.length > 0 && <SummarySec label="Diagnosis">{diagnoses.join(", ")}</SummarySec>}

          <div className="mb-4">
            <div className="mb-1.5 font-heading text-xl font-bold text-primary">℞</div>
            {rx.length === 0 ? (
              <div className="text-sm text-muted-foreground">No medicines prescribed.</div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {rx.map((r) => (
                    <tr key={r.id} className="border-b border-border/70">
                      <td className="py-1.5 pr-2 align-top font-medium">{r.medicine}</td>
                      <td className="py-1.5 pr-2 align-top text-muted-foreground">
                        {[r.dosage, r.frequency].filter(Boolean).join(" · ")}
                      </td>
                      <td className="py-1.5 text-right align-top text-muted-foreground">{r.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {investigations.length > 0 && <SummarySec label="Investigations">{investigations.join(", ")}</SummarySec>}

          {(advice.trim() || followUpLabel) && (
            <SummarySec label="Advice &amp; follow-up">
              {advice.trim()}
              {advice.trim() && followUpLabel ? " " : ""}
              {followUpLabel ? <strong>Review in {followUpLabel}.</strong> : null}
            </SummarySec>
          )}

          <div className="mt-5 flex items-end justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>
              Fee · <strong className="text-honey-deep">{fee}</strong> · to collect
            </span>
            <span>{clinicName}</span>
          </div>
        </div>

        <div className="flex gap-2 border-t bg-muted/40 p-4 print:hidden">
          <Button variant="outline" onClick={onBack} disabled={busy}>
            Back to edit
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={busy}>
            <Printer className="size-4" /> Print
          </Button>
          <Button className="ml-auto" onClick={onComplete} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Complete &amp; collect
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummarySec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div
        className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
