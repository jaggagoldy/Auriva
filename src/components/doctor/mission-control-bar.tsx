"use client";

import * as React from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Appointment, formatDay, getInitials } from "@/shared/queue";

interface MissionControlBarProps {
  doctorName: string;
  clinicName: string;
  todayAppointments: Appointment[];
  nextUp: Appointment | null;
  refreshing: boolean;
  lastSyncedAt: Date | null;
  onRefresh: () => void;
  onCallIn: (appointment: Appointment) => void;
  updating: boolean;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function MissionControlBar({
  doctorName,
  clinicName,
  todayAppointments,
  nextUp,
  refreshing,
  lastSyncedAt,
  onRefresh,
  onCallIn,
  updating,
}: MissionControlBarProps) {
  const waiting = todayAppointments.filter(
    (a) => a.status === "waiting" || a.status === "doctor_ready"
  ).length;
  const completed = todayAppointments.filter((a) => a.status === "completed").length;
  const total = todayAppointments.length;
  const firstName = doctorName.replace(/^Dr\.?\s+/i, "").split(" ")[0];

  return (
    <div className="border-b bg-card">
      <div className="flex flex-wrap items-center gap-5 px-6 py-3.5">
        <div className="min-w-40">
          <div className="text-[15px] leading-tight font-semibold">
            {greeting()}, Dr. {firstName}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {formatDay(new Date())} · {clinicName}
          </div>
        </div>

        <div className="h-9 w-px bg-border" />

        <div className="flex items-center gap-5 text-[11px] text-muted-foreground">
          <Stat label="patients" value={total} valueClassName="text-foreground" />
          <Stat label="waiting" value={waiting} valueClassName="text-warning" />
          <Stat label="completed" value={completed} valueClassName="text-success" />
        </div>

        <div className="h-9 w-px bg-border" />

        {nextUp ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px] font-semibold">
                {getInitials(nextUp.patient.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="text-[8.5px] font-bold tracking-wider text-primary uppercase">Next</div>
              <div className="text-[11.5px] font-semibold">{nextUp.patient.full_name}</div>
            </div>
            <Button
              size="sm"
              className="ml-1 h-7 px-2.5 text-[11px]"
              disabled={updating || nextUp.status === "in_consultation"}
              onClick={() => onCallIn(nextUp)}
            >
              {updating ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              Call in
            </Button>
          </div>
        ) : (
          <div className="text-[11.5px] text-muted-foreground">Queue is clear</div>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          <Badge variant="outline" className="gap-1.5 font-normal">
            {refreshing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            )}
            <span className="tabular-nums">
              {lastSyncedAt
                ? `Live · ${lastSyncedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                : "Live"}
            </span>
          </Badge>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div>
      <div className={cn("text-base leading-none font-bold tabular-nums", valueClassName)}>{value}</div>
      <div className="mt-0.5">{label}</div>
    </div>
  );
}
