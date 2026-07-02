"use client";

import * as React from "react";
import {
  Building2,
  Check,
  Clock,
  Droplets,
  FileText,
  Info,
  Loader2,
  PenLine,
  Pill,
  Play,
  Plus,
  Stethoscope,
  Trash2,
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
} from "@/lib/queue";
import AppointmentDrawer from "@/components/shared/appointment-drawer";

interface ConsultationPaneProps {
  appointment: Appointment | null;
  updating: boolean;
  onUpdateStatus: (appointment: Appointment, next: AppointmentStatus) => void;
}

export default function ConsultationPane({
  appointment,
  updating,
  onUpdateStatus,
}: ConsultationPaneProps) {
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
              Patient ID{" "}
              <span className="font-mono">
                {appointment.patient.id.slice(0, 8)}
              </span>{" "}
              · Appointment{" "}
              <span className="font-mono">{appointment.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View appointment details"
            onClick={() => setDetailsOpen(true)}
          >
            <Info />
          </Button>
          {appointment.status === "scheduled" && (
            <Button
              variant="outline"
              disabled={updating}
              onClick={() => onUpdateStatus(appointment, "waiting")}
            >
              Move to Waiting
            </Button>
          )}
          {(appointment.status === "scheduled" ||
            appointment.status === "waiting") && (
            <Button
              disabled={updating}
              onClick={() => onUpdateStatus(appointment, "in_consultation")}
            >
              {updating ? <Loader2 className="animate-spin" /> : <Play />}
              Mark as In Consultation
            </Button>
          )}
          {appointment.status === "in_consultation" && (
            <p className="text-sm text-muted-foreground">
              Consultation in progress
            </p>
          )}
          {appointment.status === "completed" && (
            <p className="text-sm text-muted-foreground">
              Consultation completed
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-6 py-5">
          <dl className="grid grid-cols-4 divide-x rounded-xl border bg-card">
            <DetailCell
              icon={Droplets}
              label="Blood Group"
              value={
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {appointment.patient.blood_group}
                </span>
              }
            />
            <DetailCell
              icon={Clock}
              label="Scheduled"
              value={`${formatDay(appointment.scheduled_time)} · ${formatTime(
                appointment.scheduled_time
              )}`}
              hint={formatRelative(appointment.scheduled_time)}
            />
            <DetailCell
              icon={Stethoscope}
              label="Attending Doctor"
              value={appointment.doctor.full_name}
              hint={appointment.doctor.specialty ?? undefined}
            />
            <DetailCell
              icon={Building2}
              label="Clinic"
              value={appointment.clinic.name}
              hint={appointment.clinic.address}
            />
          </dl>

          <PrescriptionEditor
            key={appointment.id}
            appointment={appointment}
            updating={updating}
            onComplete={() => onUpdateStatus(appointment, "completed")}
          />
        </div>
      </div>

      <AppointmentDrawer
        appointmentId={appointment.id}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </main>
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
      {hint && (
        <dd className="truncate text-xs text-muted-foreground">{hint}</dd>
      )}
    </div>
  );
}

const NOTES_TEMPLATE = `Dx:

Findings:

Advice:

Follow-up:`;

interface MedicineRow {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionDraft {
  notes: string;
  medicines: MedicineRow[];
}

function emptyMedicine(): MedicineRow {
  return { id: crypto.randomUUID(), name: "", dosage: "", frequency: "", duration: "" };
}

function loadDraft(storageKey: string): PrescriptionDraft {
  const fallback = { notes: "", medicines: [emptyMedicine()] };
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.medicines)) {
      return {
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        medicines: parsed.medicines.length
          ? parsed.medicines
          : [emptyMedicine()],
      };
    }
  } catch {
    // Fall through: treat pre-JSON drafts as plain clinical notes.
  }
  return { notes: raw, medicines: [emptyMedicine()] };
}

function PrescriptionEditor({
  appointment,
  updating,
  onComplete,
}: {
  appointment: Appointment;
  updating: boolean;
  onComplete: () => void;
}) {
  // The editor is remounted per appointment (keyed by id), so the draft can
  // be read once on mount.
  const storageKey = `eprescription_draft_${appointment.id}`;
  const [notes, setNotes] = React.useState(() => loadDraft(storageKey).notes);
  const [medicines, setMedicines] = React.useState(
    () => loadDraft(storageKey).medicines
  );
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const skipAutosaveRef = React.useRef(true);

  const isEmpty =
    !notes.trim() &&
    medicines.every(
      (m) => !m.name.trim() && !m.dosage && !m.frequency && !m.duration
    );

  const persist = React.useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify({ notes, medicines }));
    setSavedAt(new Date());
  }, [storageKey, notes, medicines]);

  // Autosave the draft shortly after the doctor stops typing.
  React.useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      if (isEmpty) {
        localStorage.removeItem(storageKey);
        setSavedAt(null);
      } else {
        persist();
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [notes, medicines, isEmpty, persist, storageKey]);

  const setMedicineField = (
    id: string,
    field: keyof Omit<MedicineRow, "id">,
    value: string
  ) => {
    setMedicines((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const completed = appointment.status === "completed";

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">E-Prescription</h2>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {savedAt ? `Draft saved ${formatTime(savedAt)}` : "No draft saved"}
        </span>
      </header>

      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="clinical-notes">Clinical Notes</Label>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setNotes((prev) => prev || NOTES_TEMPLATE)}
              disabled={Boolean(notes)}
            >
              <PenLine />
              Insert template
            </Button>
          </div>
          <Textarea
            id="clinical-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={`Diagnosis, findings and advice for ${appointment.patient.full_name}…`}
            className="min-h-40 resize-y bg-background font-mono text-[13px] leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <Pill className="size-3.5 text-muted-foreground" />
              Medicines
            </Label>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setMedicines((rows) => [...rows, emptyMedicine()])}
            >
              <Plus />
              Add medicine
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-px border-b bg-muted/50 px-2 py-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              <span>Medicine</span>
              <span>Dosage</span>
              <span>Frequency</span>
              <span>Duration</span>
              <span />
            </div>
            <div className="divide-y">
              {medicines.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2 px-2 py-1.5"
                >
                  <Input
                    aria-label={`Medicine ${index + 1} name`}
                    value={row.name}
                    onChange={(e) => setMedicineField(row.id, "name", e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                  />
                  <Input
                    aria-label={`Medicine ${index + 1} dosage`}
                    value={row.dosage}
                    onChange={(e) => setMedicineField(row.id, "dosage", e.target.value)}
                    placeholder="500 mg"
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                  />
                  <Input
                    aria-label={`Medicine ${index + 1} frequency`}
                    value={row.frequency}
                    onChange={(e) => setMedicineField(row.id, "frequency", e.target.value)}
                    placeholder="1-0-1"
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                  />
                  <Input
                    aria-label={`Medicine ${index + 1} duration`}
                    value={row.duration}
                    onChange={(e) => setMedicineField(row.id, "duration", e.target.value)}
                    placeholder="5 days"
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove medicine ${index + 1}`}
                    disabled={medicines.length === 1}
                    onClick={() =>
                      setMedicines((rows) => rows.filter((r) => r.id !== row.id))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {notes.length} chars ·{" "}
            {medicines.filter((m) => m.name.trim()).length} medicine
            {medicines.filter((m) => m.name.trim()).length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isEmpty}
              onClick={() => {
                setNotes("");
                setMedicines([emptyMedicine()]);
                localStorage.removeItem(storageKey);
                setSavedAt(null);
              }}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isEmpty}
              onClick={() => {
                persist();
                toast.success(
                  `E-Prescription saved for ${appointment.patient.full_name}`
                );
              }}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              disabled={completed || updating}
              onClick={() => {
                if (!isEmpty) persist();
                onComplete();
              }}
            >
              {updating ? <Loader2 className="animate-spin" /> : <Check />}
              {completed ? "Completed" : "Mark as Completed"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
