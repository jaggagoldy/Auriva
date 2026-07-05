"use client";

import * as React from "react";
import { AlarmClock, CalendarClock, ChevronDown, FileWarning, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Appointment, formatRelative } from "@/shared/queue";

export interface ActionCenterData {
  waitingTooLong: Appointment[];
  followUpsDue: Appointment[];
  needsSignature: Appointment[];
}

interface ActionCenterProps {
  data: ActionCenterData;
  onSelect: (appointmentId: string) => void;
}

// Everything here is backed by real data: waiting duration from
// checked_in_at, follow-ups from Appointment.follow_up_date (set by the
// doctor in the Consult Workbench), needs-signature from a completed visit
// with no diagnosis/prescription recorded, or a consultation left open past
// the day it happened. Lab review / referrals / messages have no backing
// model yet — shown as one honest deferred note, not five empty categories.
export default function ActionCenter({ data, onSelect }: ActionCenterProps) {
  const [expanded, setExpanded] = React.useState(true);
  const total = data.waitingTooLong.length + data.followUpsDue.length + data.needsSignature.length;

  if (total === 0) {
    return (
      <div className="border-b bg-muted/30 px-6 py-2.5 text-[11.5px] text-muted-foreground">
        Action Center is clear — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div className="border-b bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-6 py-2 text-left"
      >
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Action Center
        </span>
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums">
          {total}
        </span>
        <ChevronDown className={cn("ml-auto size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="flex flex-wrap gap-2 px-6 pb-3">
          {data.waitingTooLong.map((a) => (
            <ActionChip
              key={`wait-${a.id}`}
              icon={AlarmClock}
              tone="warning"
              title={a.patient.full_name}
              subtitle={`Waiting ${a.checked_in_at ? formatRelative(a.checked_in_at).replace("ago", "").trim() + " so far" : "a while"}`}
              onClick={() => onSelect(a.id)}
            />
          ))}
          {data.followUpsDue.map((a) => (
            <ActionChip
              key={`follow-${a.id}`}
              icon={CalendarClock}
              tone="info"
              title={a.patient.full_name}
              subtitle="Follow-up due"
              onClick={() => onSelect(a.id)}
            />
          ))}
          {data.needsSignature.map((a) => (
            <ActionChip
              key={`sign-${a.id}`}
              icon={FileWarning}
              tone="danger"
              title={a.patient.full_name}
              subtitle="Record incomplete"
              onClick={() => onSelect(a.id)}
            />
          ))}
          <div className="flex items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <Inbox className="size-3.5" />
            Lab review, referrals &amp; messages — coming soon
          </div>
        </div>
      )}
    </div>
  );
}

function ActionChip({
  icon: Icon,
  tone,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "warning" | "info" | "danger";
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  // APS-031 design system — semantic status tokens, not hardcoded hex, so
  // these read correctly in dark mode too.
  const toneClass = {
    warning: "border-warning/30 bg-warning/10 text-warning",
    info: "border-info/30 bg-info/10 text-info",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
  }[tone];

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn("h-auto gap-2 rounded-lg border px-2.5 py-1.5 font-normal", toneClass)}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="text-left leading-tight">
        <span className="block text-[11.5px] font-semibold">{title}</span>
        <span className="block text-[10px] opacity-80">{subtitle}</span>
      </span>
    </Button>
  );
}
