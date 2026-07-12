"use client";

// Patient timeline (APS-046 / APS-025): one chronological view of everything
// that happened to a patient — the user-facing audit trail. Reached by
// patient id from billing, the queue, or a direct link.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  FlaskConical,
  IndianRupee,
  Pill,
  ReceiptText,
  Stethoscope,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/shared/queue";
import { cn } from "@/lib/utils";

type TimelineKind = "appointment" | "prescription" | "lab" | "invoice" | "payment";

interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  at: string;
}

interface TimelineData {
  patient: {
    id: string;
    full_name: string;
    blood_group: string;
    date_of_birth: string | null;
    gender: string | null;
  };
  entries: TimelineEntry[];
}

const KIND_META: Record<
  TimelineKind,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  appointment: { icon: Stethoscope, className: "bg-info/10 text-info dark:text-info" },
  prescription: { icon: Pill, className: "bg-info/10 text-info dark:text-info" },
  lab: { icon: FlaskConical, className: "bg-warning/10 text-warning dark:text-warning" },
  invoice: { icon: ReceiptText, className: "bg-muted text-muted-foreground dark:text-muted-foreground" },
  payment: { icon: IndianRupee, className: "bg-success/10 text-success dark:text-success" },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

const FILTERS: Array<{ id: "all" | TimelineKind; label: string }> = [
  { id: "all", label: "All" },
  { id: "appointment", label: "Visits" },
  { id: "prescription", label: "Prescriptions" },
  { id: "lab", label: "Labs" },
  { id: "invoice", label: "Invoices" },
  { id: "payment", label: "Payments" },
];

export default function PatientTimeline({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<TimelineData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["id"]>("all");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/patients/${patientId}/timeline`, { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setError(res.status === 404 ? "Patient not found." : "Could not load the timeline.");
        return;
      }
      setData(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const age = data ? ageFromDob(data.patient.date_of_birth) : null;
  const visibleEntries = data
    ? filter === "all"
      ? data.entries
      : data.entries.filter((e) => e.kind === filter)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Back
      </Button>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : !data ? (
        <>
          <Skeleton className="h-16 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <Avatar className="size-12">
              <AvatarFallback className="text-sm font-semibold">
                {getInitials(data.patient.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">{data.patient.full_name}</h1>
              <p className="text-sm text-muted-foreground">
                {age !== null ? `${age} yrs · ` : ""}
                {data.patient.gender ? `${data.patient.gender} · ` : ""}
                <span className="font-medium text-destructive dark:text-destructive">
                  {data.patient.blood_group}
                </span>
              </p>
            </div>
            <div className="ml-auto text-right text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{data.entries.length}</div>
              events
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="size-4 text-muted-foreground" />
                Complete timeline
              </h2>
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      filter === f.id
                        ? "border-foreground bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {data.entries.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nothing recorded for this patient yet.
                </CardContent>
              </Card>
            ) : visibleEntries.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No {FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} for this patient yet.
                </CardContent>
              </Card>
            ) : (
              <ol className="relative space-y-1 border-l pl-6">
                {visibleEntries.map((entry) => {
                  const meta = KIND_META[entry.kind];
                  const Icon = meta.icon;
                  return (
                    <li key={entry.id} className="relative pb-4">
                      <span
                        className={cn(
                          "absolute -left-[34px] flex size-6 items-center justify-center rounded-full ring-4 ring-background",
                          meta.className
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{entry.title}</div>
                          {entry.detail && (
                            <div className="truncate text-xs text-muted-foreground">
                              {entry.detail}
                            </div>
                          )}
                        </div>
                        <time className="shrink-0 text-[11px] text-muted-foreground">
                          {formatWhen(entry.at)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
