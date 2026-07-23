import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Beaker,
  Droplets,
  FlaskConical,
  HeartPulse,
  Pill,
  Phone,
  Sparkles,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Appointment, formatDay, parseMedicines } from "@/shared/queue";

interface ContextPanelProps {
  appointment: Appointment;
  history: Appointment[];
}

export default function ContextPanel({ appointment, history }: ContextPanelProps) {
  const { patient } = appointment;
  const hasAllergies = Boolean(patient.allergies?.trim());
  const hasChronic = Boolean(patient.chronic_conditions?.trim());

  // Prioritize last visit with the current doctor, fallback to any past visit
  const lastVisit =
    history.find(
      (h) => (h.status === "completed" || h.diagnosis || h.notes) && h.doctor_id === appointment.doctor_id
    ) ?? history.find((h) => h.status === "completed" || h.diagnosis || h.notes) ?? null;

  // Extract all active/recent medications across current consultation & past history
  const currentMedications = React.useMemo(() => {
    const medsMap = new Map<string, { name: string; dosage?: string; frequency?: string; duration?: string }>();
    
    // Check current appointment's prescription
    const currentMeds = parseMedicines(appointment.prescription_medicines_json);
    for (const m of currentMeds) {
      if (m.name?.trim()) medsMap.set(m.name.trim().toLowerCase(), m);
    }
    
    // Check historical prescriptions
    for (const h of history) {
      const pastMeds = parseMedicines(h.prescription_medicines_json);
      for (const m of pastMeds) {
        if (m.name?.trim() && !medsMap.has(m.name.trim().toLowerCase())) {
          medsMap.set(m.name.trim().toLowerCase(), m);
        }
      }
    }
    return Array.from(medsMap.values());
  }, [appointment, history]);

  return (
    <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          Clinical Snapshot
        </h3>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {(hasAllergies || hasChronic) && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-destructive uppercase">
              <AlertTriangle className="size-3.5" />
              Clinical alerts
            </div>
            {hasAllergies && (
              <p className="mt-1.5 text-[12px] text-destructive">
                <span className="font-semibold">Allergies:</span> {patient.allergies}
              </p>
            )}
            {hasChronic && (
              <p className="mt-1 text-[12px] text-destructive">
                <span className="font-semibold">Chronic:</span> {patient.chronic_conditions}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <SnapshotTile
            icon={Droplets}
            label="Blood Group"
            value={patient.blood_group}
            valueClassName="text-destructive dark:text-destructive"
          />
          <SnapshotTile
            icon={Phone}
            label="Emergency Contact"
            value={patient.emergency_contact_name ?? "Not on file"}
            hint={patient.emergency_contact_phone ?? undefined}
          />
        </div>

        <div>
          <SectionLabel>Current Medication</SectionLabel>
          {currentMedications.length > 0 ? (
            <div className="space-y-1.5">
              {currentMedications.map((med, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-[12px]">
                  <div className="flex items-center gap-2 font-medium">
                    <Pill className="size-3.5 text-primary shrink-0" />
                    <span>{med.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {[med.dosage, med.frequency].filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote text="No active prescription on file yet — will populate once e-prescriptions are recorded across visits." />
          )}
        </div>

        <div>
          <SectionLabel>Recent Labs</SectionLabel>
          <EmptyNote text="Lab integration coming soon." icon={FlaskConical} />
        </div>

        <div>
          <SectionLabel>Insurance</SectionLabel>
          <EmptyNote text="Insurance coming soon." icon={Beaker} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <SectionLabel>Last visit with me</SectionLabel>
            <Link
              href={`/doctor/patients/${patient.id}`}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              Timeline <ExternalLink className="size-2.5" />
            </Link>
          </div>
          {lastVisit ? (
            <Link
              href={`/doctor/patients/${patient.id}`}
              className="group block rounded-lg border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                <span>{formatDay(lastVisit.scheduled_time)}</span>
                <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">View full history →</span>
              </div>
              <div className="mt-0.5 text-[12.5px] font-semibold text-foreground group-hover:text-primary transition-colors">
                {lastVisit.diagnosis || lastVisit.notes || lastVisit.chief_complaint || "Consultation"}
              </div>
              {lastVisit.prescription_notes && (
                <p className="mt-1 line-clamp-2 text-[11.5px] text-muted-foreground">
                  {lastVisit.prescription_notes}
                </p>
              )}
              {parseMedicines(lastVisit.prescription_medicines_json).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {parseMedicines(lastVisit.prescription_medicines_json).map((m, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] font-normal py-0.5 px-1.5">
                      <Pill className="size-2.5 mr-1 text-primary" />
                      {m.name} {m.dosage ? `(${m.dosage})` : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          ) : (
            <EmptyNote text="No previous visits with this doctor." />
          )}
        </div>

        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <SectionLabel>Timeline</SectionLabel>
              <Link
                href={`/doctor/patients/${patient.id}`}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                View full history →
              </Link>
            </div>
            <ol className="relative ml-1 space-y-2 border-l pl-3">
              {history.slice(0, 5).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[16.5px] size-1.5 rounded-full bg-primary" />
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    className="group block rounded-md p-1.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatDay(h.scheduled_time)}</span>
                      <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                    </div>
                    <div className="text-[11.5px] font-medium group-hover:text-primary transition-colors">
                      {h.diagnosis || h.notes || h.chief_complaint || "Consultation"}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="rounded-lg border border-dashed p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            <Sparkles className="size-3.5" />
            AI Assist
            <Badge variant="outline" className="ml-auto text-[9px] font-normal">Reserved</Badge>
          </div>
          <ul className="mt-2 space-y-1.5">
            {[
              "Suggested diagnosis",
              "Drug interaction check",
              "Clinical guideline lookup",
              "Recommended tests",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2 text-[11px] text-muted-foreground/80">
                <span className="size-1 rounded-full bg-muted-foreground/40" />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10.5px] text-muted-foreground/70">
            Not part of this release — no output is generated today.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function SnapshotTile({
  icon: Icon,
  label,
  value,
  hint,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-[9.5px] font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3" />
        {label}
      </div>
      <div className={`mt-1 truncate text-[12.5px] font-semibold ${valueClassName ?? ""}`}>{value}</div>
      {hint && <div className="truncate text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EmptyNote({
  text,
  icon: Icon = HeartPulse,
}: {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-[11px] text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      {text}
    </div>
  );
}
