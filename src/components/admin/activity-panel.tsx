"use client";

// Real "Activity" panel for the Organization Workspace topbar (APS-031 #6),
// replacing the mockup's notification bell. The mockup's bell had two tabs —
// "Alerts" (stock levels, room double-booking — no backing domain data
// exists) and "Approvals" (discount approval, leave request — leave request
// is OPS-002, on hold; discount-approval has no workflow yet). Neither is
// real, so instead this reuses the Event Platform's org-scoped event log
// (GET /api/organizations/[id]/events, real per OPS-001C) as a live feed of
// what's actually happened — no invented alerts, no fake unread count.

import * as React from "react";
import { Bell, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface EventRow {
  id: string;
  eventType: string;
  occurredAt: string;
  status: "completed" | "pending" | "dead_letter" | "no_subscribers";
}

function humanize(eventType: string): string {
  const label = eventType.replace(/[._]/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const STATUS_DOT: Record<EventRow["status"], string> = {
  completed: "bg-success",
  pending: "bg-warning",
  dead_letter: "bg-destructive",
  no_subscribers: "bg-muted-foreground/40",
};

export default function ActivityBell({ organizationId }: { organizationId: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [events, setEvents] = React.useState<EventRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!organizationId) return;
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/events?limit=15`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setEvents(await res.json());
    } catch {
      setError("Could not load recent activity.");
    }
  }, [organizationId]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label="Recent activity" disabled={!organizationId} />
        }
      >
        <Bell />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader className="flex-row items-center justify-between pr-10">
          <SheetTitle>Activity</SheetTitle>
          <Button variant="ghost" size="icon-sm" aria-label="Refresh" onClick={load}>
            <RefreshCw />
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {error ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
          ) : events === null ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing has happened yet.
            </p>
          ) : (
            <div className="divide-y">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-2.5 py-2.5">
                  <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status]}`} />
                  <span className="min-w-0 flex-1 truncate text-sm">{humanize(event.eventType)}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(event.occurredAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
