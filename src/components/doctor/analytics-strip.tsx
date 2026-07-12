"use client";

import { Smile } from "lucide-react";
import { Appointment } from "@/shared/queue";

interface AnalyticsStripProps {
  todayAppointments: Appointment[];
  allAppointments: Appointment[];
}

// Real productivity signals computed from actual appointment data — no
// survey/rating model exists yet, so Patient Satisfaction is shown as an
// honest deferred tile rather than a fabricated score.
export default function AnalyticsStrip({ todayAppointments, allAppointments }: AnalyticsStripProps) {
  const completedToday = todayAppointments.filter((a) => a.status === "completed");
  const resolvedToday = todayAppointments.filter((a) =>
    ["completed", "no_show", "cancelled"].includes(a.status)
  );
  const completionRate = resolvedToday.length
    ? Math.round((completedToday.length / resolvedToday.length) * 100)
    : null;

  const durations = completedToday
    .filter((a) => a.started_at && a.completed_at)
    .map((a) => (new Date(a.completed_at!).getTime() - new Date(a.started_at!).getTime()) / 60000);
  const avgMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const patientVisitCounts = new Map<string, number>();
  for (const a of allAppointments) {
    if (a.status !== "completed") continue;
    patientVisitCounts.set(a.patient_id, (patientVisitCounts.get(a.patient_id) ?? 0) + 1);
  }
  const returningToday = todayAppointments.filter(
    (a) => (patientVisitCounts.get(a.patient_id) ?? 0) > 1
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-2 text-[11px] text-muted-foreground">
      <span className="text-[10px] font-bold tracking-wider uppercase">Today</span>
      <AnalyticsTile label="Patients seen" value={completedToday.length.toString()} />
      <AnalyticsTile label="Avg consult time" value={avgMinutes !== null ? `${avgMinutes}m` : "—"} />
      <AnalyticsTile label="Returning patients" value={returningToday.toString()} />
      <AnalyticsTile label="Completion rate" value={completionRate !== null ? `${completionRate}%` : "—"} />
      <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-muted-foreground/70">
        <Smile className="size-3.5" />
        Patient satisfaction — coming soon
      </span>
    </div>
  );
}

function AnalyticsTile({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="font-semibold text-foreground tabular-nums">{value}</span>{" "}
      <span>{label}</span>
    </span>
  );
}
