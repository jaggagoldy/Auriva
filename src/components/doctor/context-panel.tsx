"use client";

import * as React from "react";
import {
  AlertTriangle,
  Beaker,
  Droplets,
  FlaskConical,
  HeartPulse,
  Phone,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Appointment, formatDay } from "@/shared/queue";

interface ContextPanelProps {
  appointment: Appointment;
  history: Appointment[];
}

// The Doctor Workspace "Clinical Snapshot" (Doctor Excellence Review §4).
// Every field here is real: allergies/chronic conditions/emergency contact
// come from PatientProfile (the same fields the Patient app's Health
// Summary writes to), blood group is the existing field, and the timeline
// is this doctor's own visit history with this patient. Recent Labs,
// Insurance and Risk Flags have no backing model yet — shown as one honest
// deferred note rather than fabricated content.
export default function ContextPanel({ appointment, history }: ContextPanelProps) {
  const { patient } = appointment;
  const hasAllergies = Boolean(patient.allergies?.trim());
  const hasChronic = Boolean(patient.chronic_conditions?.trim());
  const lastVisit = history.find((h) => h.diagnosis || h.status === "completed") ?? null;

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
          <EmptyNote text="No active prescription on file yet — will populate once e-prescriptions are recorded across visits." />
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
          <SectionLabel>Last visit with me</SectionLabel>
          {lastVisit ? (
            <div className="rounded-lg border bg-background p-3">
              <div className="text-[10.5px] text-muted-foreground">{formatDay(lastVisit.scheduled_time)}</div>
              <div className="mt-0.5 text-[12.5px] font-semibold">
                {lastVisit.diagnosis || "Consultation"}
              </div>
              {lastVisit.prescription_notes && (
                <p className="mt-1 line-clamp-2 text-[11.5px] text-muted-foreground">
                  {lastVisit.prescription_notes}
                </p>
              )}
            </div>
          ) : (
            <EmptyNote text="No previous visits with this doctor." />
          )}
        </div>

        {history.length > 0 && (
          <div>
            <SectionLabel>Timeline</SectionLabel>
            <ol className="relative ml-1 space-y-3 border-l pl-4">
              {history.slice(0, 5).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1 -left-[19px] size-1.5 rounded-full bg-primary" />
                  <div className="text-[10px] text-muted-foreground">{formatDay(h.scheduled_time)}</div>
                  <div className="text-[11.5px] font-medium">{h.diagnosis || "Consultation"}</div>
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
