"use client";

// Developer Event Hub (Epic C: Shared Event Platform). A live view into
// Event_Logs / Event_Handler_Logs: what was published, what each subscriber
// did with it, and tools to replay an event or retry/simulate a failure
// without waiting for the backoff schedule.

import * as React from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  FlaskConical,
  RefreshCw,
  RotateCcw,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDay } from "@/shared/queue";
import { AdminSidebar } from "@/components/admin/admin-nav";

type HandlerStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";
type EventStatus = "completed" | "pending" | "dead_letter" | "no_subscribers";

interface EventHandlerView {
  id: string;
  handlerName: string;
  status: HandlerStatus;
  retryCount: number;
  lastError: string | null;
  lastAttemptAt: string | null;
}

interface EventView {
  id: string;
  eventType: string;
  occurredAt: string;
  actorId: string | null;
  entityId: string;
  correlationId: string;
  payload: unknown;
  status: EventStatus;
  handlers: EventHandlerView[];
}

const POLL_MS = 5000;
const ALL = "__all__";

const STATUS_META: Record<EventStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-success/10 text-success dark:text-success" },
  pending: { label: "In progress", className: "bg-warning/10 text-warning dark:text-warning" },
  dead_letter: { label: "Dead letter", className: "bg-destructive/10 text-destructive dark:text-destructive" },
  no_subscribers: { label: "No subscribers", className: "bg-muted text-muted-foreground" },
};

const HANDLER_STATUS_META: Record<HandlerStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  PROCESSING: "bg-info/10 text-info dark:text-info",
  COMPLETED: "bg-success/10 text-success dark:text-success",
  FAILED: "bg-warning/10 text-warning dark:text-warning",
  DEAD_LETTER: "bg-destructive/10 text-destructive dark:text-destructive",
};

function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return `${h}h ago`;
}

export default function EventHub() {
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<EventView[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState(ALL);
  const [statusFilter, setStatusFilter] = React.useState(ALL);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [simulating, setSimulating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clinics", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const clinics = await res.json();
        if (cancelled) return;
        if (!clinics.length) {
          setError("No organization is linked to this account.");
          return;
        }
        setOrgId(clinics[0].organization_id);
      } catch {
        if (!cancelled) setError("Could not load your organization.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = React.useCallback(async () => {
    if (!orgId) return;
    const params = new URLSearchParams();
    if (typeFilter !== ALL) params.set("event_type", typeFilter);
    if (statusFilter !== ALL) params.set("status", statusFilter);
    const res = await fetch(`/api/organizations/${orgId}/events?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    setEvents(await res.json());
    setError(null);
  }, [orgId, typeFilter, statusFilter]);

  React.useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setError("Could not load events.");
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orgId, load]);

  const eventTypes = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of events ?? []) set.add(e.eventType);
    return [...set].sort();
  }, [events]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function replay(eventId: string) {
    if (!orgId) return;
    setBusy((prev) => new Set(prev).add(eventId));
    try {
      const res = await fetch(`/api/organizations/${orgId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_log_id: eventId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Event replayed to its current subscribers");
      await load();
    } catch {
      toast.error("Could not replay event");
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  }

  async function retry(eventId: string, handlerName: string) {
    if (!orgId) return;
    const key = `${eventId}:${handlerName}`;
    setBusy((prev) => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/organizations/${orgId}/events/${eventId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handler_name: handlerName }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Retrying ${handlerName}`);
      await load();
    } catch {
      toast.error("Could not retry handler");
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function simulateFailure() {
    if (!orgId) return;
    setSimulating(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/events/simulate-failure`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success("Simulated failure published — watch it retry and dead-letter below");
      await load();
    } catch {
      toast.error("Could not simulate a failure");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar active="events" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">Event Platform</h1>
            <p className="text-[11px] text-muted-foreground">
              Every published event, its subscribers, and their outcomes
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{formatDay(new Date())}</span>
            </div>
            <Button variant="outline" size="sm" disabled={!orgId || simulating} onClick={simulateFailure}>
              <FlaskConical />
              {simulating ? "Simulating…" : "Simulate failure"}
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Refresh" disabled={!orgId} onClick={() => load().catch(() => {})}>
              <RefreshCw />
            </Button>
          </div>
        </header>

        {error && events === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => load().catch(() => setError("Could not load events."))}>
              <RefreshCw />
              Try again
            </Button>
          </div>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All event types</SelectItem>
                  {eventTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">In progress</SelectItem>
                  <SelectItem value="dead_letter">Dead letter</SelectItem>
                  <SelectItem value="no_subscribers">No subscribers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              {events === null ? (
                <div className="space-y-2 p-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/50">
                    <Webhook className="size-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No events yet</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Booking, cancelling or completing a visit will publish events here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {events.map((event) => {
                    const isOpen = expanded.has(event.id);
                    const meta = STATUS_META[event.status];
                    return (
                      <div key={event.id}>
                        <button
                          type="button"
                          onClick={() => toggle(event.id)}
                          className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/40"
                        >
                          <ChevronDown
                            className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")}
                          />
                          <span className="w-56 shrink-0 truncate font-mono text-[12.5px]">{event.eventType}</span>
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            {event.handlers.length} subscriber{event.handlers.length === 1 ? "" : "s"}
                            {event.correlationId !== event.id && ` · corr ${event.correlationId.slice(0, 8)}`}
                          </span>
                          <Badge className={cn("shrink-0 font-normal", meta.className)}>{meta.label}</Badge>
                          <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                            {timeAgo(event.occurredAt)}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="space-y-3 border-t bg-muted/20 px-5 py-4">
                            <div className="overflow-x-auto rounded-lg border bg-card">
                              <pre className="p-3 text-[11.5px] leading-relaxed">
                                {JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </div>

                            {event.handlers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No handler was registered for this event type when it was published.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {event.handlers.map((h) => {
                                  const key = `${event.id}:${h.handlerName}`;
                                  const canRetry = h.status === "FAILED" || h.status === "DEAD_LETTER";
                                  return (
                                    <div
                                      key={h.id}
                                      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                                    >
                                      <span className="w-40 shrink-0 truncate text-[12.5px] font-medium">
                                        {h.handlerName}
                                      </span>
                                      <Badge className={cn("shrink-0 font-normal", HANDLER_STATUS_META[h.status])}>
                                        {h.status}
                                      </Badge>
                                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                        {h.retryCount} {h.retryCount === 1 ? "retry" : "retries"}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                                        {h.lastError && (
                                          <span className="inline-flex items-center gap-1 text-destructive dark:text-destructive">
                                            <AlertTriangle className="size-3 shrink-0" />
                                            {h.lastError}
                                          </span>
                                        )}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!canRetry || busy.has(key)}
                                        onClick={() => retry(event.id, h.handlerName)}
                                      >
                                        <RotateCcw />
                                        Retry
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy.has(event.id)}
                                onClick={() => replay(event.id)}
                              >
                                <RefreshCw />
                                Replay event
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
