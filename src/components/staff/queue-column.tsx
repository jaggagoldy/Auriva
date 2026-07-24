"use client";

import * as React from "react";
import { Reorder } from "framer-motion";

import { cn } from "@/lib/utils";
import { Appointment } from "@/shared/queue";
import type { Lane } from "@/components/staff/queue-board";
import type { DoctorOption } from "@/components/staff/doctor-filter";
import QueueCard from "@/components/staff/queue-card";

interface QueueColumnProps {
  lane: Lane;
  appointments: Appointment[];
  clinicId: string;
  doctors: DoctorOption[];
  onOpenDetails: (id: string) => void;
  onChanged: () => void;
  onReorder: (orderedIds: string[]) => void;
}

// PKG-4 lane header tone: Waiting reads honey (the warm "who's here" lane),
// In consultation reads pine/primary, Done · to collect reads success.
const TONE: Record<Lane["tone"], { dot: string; text: string }> = {
  waiting: { dot: "bg-honey", text: "text-honey-deep" },
  active: { dot: "bg-primary", text: "text-primary" },
  done: { dot: "bg-success", text: "text-success" },
};

export default function QueueColumn({
  lane,
  appointments,
  clinicId,
  doctors,
  onOpenDetails,
  onChanged,
  onReorder,
}: QueueColumnProps) {
  const tone = TONE[lane.tone];
  // Reordering by priority only makes sense in the Waiting lane.
  const reorderable = lane.tone === "waiting";
  // A drag gesture still fires a native click on release; suppress the
  // details-drawer open that would otherwise follow a reorder drag.
  const draggingRef = React.useRef(false);

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className={cn("size-1.5 rounded-full", tone.dot)} />
        <h3 className={cn("text-xs font-semibold tracking-wide uppercase", tone.text)}>{lane.label}</h3>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {appointments.length}
        </span>
      </div>

      <div className="min-h-24 flex-1 overflow-y-auto p-2">
        {appointments.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {lane.tone === "waiting"
              ? "No one waiting"
              : lane.tone === "active"
                ? "No one with a doctor"
                : "Nothing to collect"}
          </p>
        ) : reorderable ? (
          <Reorder.Group
            axis="y"
            values={appointments.map((appointment) => appointment.id)}
            onReorder={(ids) => onReorder(ids as string[])}
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
                  laneTone={lane.tone}
                  doctors={doctors}
                  onOpenDetails={(id) => {
                    if (draggingRef.current) return;
                    onOpenDetails(id);
                  }}
                  onChanged={onChanged}
                />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <QueueCard
                key={appointment.id}
                appointment={appointment}
                clinicId={clinicId}
                laneTone={lane.tone}
                doctors={doctors}
                onOpenDetails={onOpenDetails}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
