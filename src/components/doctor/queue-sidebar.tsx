"use client";

import { Inbox, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Appointment,
  AppointmentStatus,
  QUEUE_ORDER,
  STATUS_META,
  formatRelative,
  formatTime,
} from "@/lib/queue";

export type QueueScope = "today" | "all";

interface QueueSidebarProps {
  appointments: Appointment[] | null;
  selectedId: string | null;
  scope: QueueScope;
  search: string;
  onSelect: (id: string) => void;
  onScopeChange: (scope: QueueScope) => void;
  onSearchChange: (value: string) => void;
}

export default function QueueSidebar({
  appointments,
  selectedId,
  scope,
  search,
  onSelect,
  onScopeChange,
  onSearchChange,
}: QueueSidebarProps) {
  const grouped = new Map<AppointmentStatus, Appointment[]>();
  for (const status of QUEUE_ORDER) grouped.set(status, []);
  for (const appointment of appointments ?? []) {
    grouped.get(appointment.status)?.push(appointment);
  }

  const count = (status: AppointmentStatus) => grouped.get(status)?.length ?? 0;

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-r bg-sidebar">
      <div className="space-y-3 border-b px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Patient Queue
            {appointments && (
              <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                {appointments.length}
              </span>
            )}
          </h2>
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            {(["today", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onScopeChange(value)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
                  scope === value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["waiting", "in_consultation", "completed"] as const).map(
            (status) => (
              <div
                key={status}
                className="rounded-lg border bg-background px-2.5 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      STATUS_META[status].dot
                    )}
                  />
                  <span className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {status === "in_consultation"
                      ? "In consult"
                      : STATUS_META[status].label}
                  </span>
                </div>
                <div className="mt-0.5 text-lg leading-none font-semibold tabular-nums">
                  {appointments ? count(status) : "–"}
                </div>
              </div>
            )
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search patients…"
            className="h-8 bg-background pl-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {appointments === null ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-1 py-1.5">
                <Skeleton className="h-8 w-12" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No appointments</p>
            <p className="text-xs text-muted-foreground">
              {scope === "today"
                ? "The queue for today is clear. Switch to “All” to see upcoming visits."
                : "Nothing matches the current filters."}
            </p>
          </div>
        ) : (
          <div className="pb-4">
            {QUEUE_ORDER.map((status) => {
              const items = grouped.get(status)!;
              if (items.length === 0) return null;
              const meta = STATUS_META[status];
              return (
                <section key={status}>
                  <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                      {items.length}
                    </span>
                  </div>
                  {items.map((appointment) => {
                    const selected = appointment.id === selectedId;
                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => onSelect(appointment.id)}
                        className={cn(
                          "flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors",
                          selected
                            ? "border-l-primary bg-background"
                            : "border-l-transparent hover:bg-muted/60"
                        )}
                      >
                        <div className="w-14 shrink-0 text-right">
                          <div className="text-xs font-medium tabular-nums">
                            {formatTime(appointment.scheduled_time)}
                          </div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRelative(appointment.scheduled_time)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-sm",
                              selected ? "font-semibold" : "font-medium"
                            )}
                          >
                            {appointment.patient.full_name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            Blood {appointment.patient.blood_group} ·{" "}
                            {appointment.clinic.name}
                          </div>
                        </div>
                        <span
                          className={cn("size-2 shrink-0 rounded-full", meta.dot)}
                        />
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
