import { CalendarPlus, CheckCircle2, LogIn, RefreshCw, UserPlus, XCircle } from "lucide-react";

import type { AppointmentEvent } from "@/shared/queue";
import { STATUS_META, formatDay, formatTime } from "@/shared/queue";
import { isAppointmentStatus } from "@/domain/appointment-status";
import { cn } from "@/lib/utils";

function describeEvent(event: AppointmentEvent): string {
  switch (event.type) {
    case "created":
      return "Appointment created";
    case "checked_in":
      return "Checked in";
    case "walk_in_registered":
      return "Registered as walk-in";
    case "status_changed": {
      if (event.to_status && isAppointmentStatus(event.to_status)) {
        return `Moved to ${STATUS_META[event.to_status].label}`;
      }
      return "Status updated";
    }
    default:
      return event.type;
  }
}

function iconFor(event: AppointmentEvent) {
  if (event.type === "created") return CalendarPlus;
  if (event.type === "checked_in") return LogIn;
  if (event.type === "walk_in_registered") return UserPlus;
  if (event.to_status === "completed") return CheckCircle2;
  if (event.to_status === "cancelled" || event.to_status === "no_show") return XCircle;
  return RefreshCw;
}

export default function TimelineCard({ events }: { events: AppointmentEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const Icon = iconFor(event);
        const isLast = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span className="absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px bg-border" />
            )}
            <span
              className={cn(
                "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background"
              )}
            >
              <Icon className="size-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium">{describeEvent(event)}</p>
              {event.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {formatDay(event.created_at)} · {formatTime(event.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
