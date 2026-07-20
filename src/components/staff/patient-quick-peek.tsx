"use client";

// Milestone 2 · 4.1 — Patient Quick Peek. A glanceable popover that answers the
// receptionist's most common questions WITHOUT a drawer, tabs, or scrolling:
// Returning? · Allergy? · Outstanding? · Last visit? · Phone? · Assigned doctor?
// · Health ID? — plus one button to open the full record. Reads only the
// server-enriched queue payload (no extra fetch).
//
// Reusable: pass any enriched `Appointment` + an `onOpenRecord` handler.

import * as React from "react";
import { AlertTriangle, Eye, IndianRupee, Phone, Stethoscope, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Appointment, formatDay, formatINR } from "@/shared/queue";

interface PatientQuickPeekProps {
  appointment: Appointment;
  /** Opens the full record/drawer for this patient. */
  onOpenRecord: () => void;
  className?: string;
}

const PEEK_WIDTH = 288; // w-72

export default function PatientQuickPeek({ appointment, onOpenRecord, className }: PatientQuickPeekProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const p = appointment.patient;
  const allergies = (p.allergies ?? "").trim();
  const outstanding = appointment.patient_outstanding_balance ?? 0;
  const phone = p.user?.phone_number ?? "—";

  // Measure the trigger and place the panel with FIXED positioning so it escapes
  // the queue column's overflow (which would otherwise clip it). Clamped to the
  // viewport so it's never cut off on either edge.
  const openPeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(8, Math.min(rect.right - PEEK_WIDTH, window.innerWidth - PEEK_WIDTH - 8));
      setPos({ top: rect.bottom + 6, left });
    }
    setOpen(true);
  };

  return (
    <div ref={triggerRef} className={cn("inline-flex", className)}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Quick peek — ${p.full_name}`}
        onClick={openPeek}
      >
        <Eye />
      </Button>

      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-hidden />
          <div
            className="fixed z-50 w-72 rounded-xl border bg-popover p-3 text-left shadow-lg"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: name + Health ID */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.full_name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">{p.health_id ?? "No Health ID"}</p>
              </div>
              <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>

            {/* Flags row */}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {appointment.is_returning ? "Returning" : "New"}
              </span>
              {allergies ? (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  <AlertTriangle className="size-2.5" />
                  {allergies}
                </span>
              ) : (
                <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">No known allergies</span>
              )}
            </div>

            {/* Facts grid — everything at a glance */}
            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <Fact icon={IndianRupee} label="Outstanding" value={outstanding > 0 ? formatINR(outstanding) : "None"} tone={outstanding > 0 ? "honey" : undefined} />
              <Fact label="Last visit" value={appointment.last_visit_at ? formatDay(appointment.last_visit_at) : "First visit"} />
              <Fact icon={Phone} label="Phone" value={phone} />
              <Fact icon={Stethoscope} label="Doctor" value={appointment.doctor.full_name} />
            </dl>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                setOpen(false);
                onOpenRecord();
              }}
            >
              Open full record
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "honey";
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="size-2.5" />}
        {label}
      </dt>
      <dd className={cn("truncate font-medium", tone === "honey" && "text-honey-deep")}>{value}</dd>
    </div>
  );
}
