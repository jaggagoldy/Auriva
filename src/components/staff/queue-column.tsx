"use client";

import * as React from "react";
import { Reorder } from "framer-motion";

import { cn } from "@/lib/utils";
import { Appointment, AppointmentStatus, STATUS_META } from "@/lib/queue";
import QueueCard from "@/components/staff/queue-card";

interface QueueColumnProps {
  status: AppointmentStatus;
  appointments: Appointment[];
  clinicId: string;
  onOpenDetails: (id: string) => void;
  onChanged: () => void;
  onReorder: (status: AppointmentStatus, orderedIds: string[]) => void;
}

export default function QueueColumn({
  status,
  appointments,
  clinicId,
  onOpenDetails,
  onChanged,
  onReorder,
}: QueueColumnProps) {
  const meta = STATUS_META[status];
  // A drag gesture still fires a native click on release; suppress the
  // details-drawer open that would otherwise follow a reorder drag.
  const draggingRef = React.useRef(false);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span className={cn("size-1.5 rounded-full", meta.dot)} />
        <h3 className="text-xs font-semibold tracking-wide uppercase">{meta.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {appointments.length}
        </span>
      </div>

      <div className="min-h-24 flex-1 overflow-y-auto p-2">
        {appointments.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No patients here
          </p>
        ) : (
          <Reorder.Group
            axis="y"
            values={appointments.map((appointment) => appointment.id)}
            onReorder={(ids) => onReorder(status, ids as string[])}
            className="space-y-2"
          >
            {appointments.map((appointment) => (
              <Reorder.Item
                key={appointment.id}
                value={appointment.id}
                onDragStart={() => {
                  draggingRef.current = true;
                }}
                onDragEnd={() => {
                  // Deferred so the click that follows mouseup still sees it as true.
                  setTimeout(() => {
                    draggingRef.current = false;
                  }, 0);
                }}
              >
                <QueueCard
                  appointment={appointment}
                  clinicId={clinicId}
                  onOpenDetails={(id) => {
                    if (draggingRef.current) return;
                    onOpenDetails(id);
                  }}
                  onChanged={onChanged}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}
