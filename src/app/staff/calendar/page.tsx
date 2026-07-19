"use client";

// PKG-4 Reception Calendar — reuses the existing ClinicCalendar (same schedule
// read-model + booking flow), presented for the front desk: every doctor's day
// side by side, free slots, quick booking. read-only for availability editing
// (owner/doctor-only "Block time" is hidden). No new scheduling capability.
import { ClinicCalendar } from "@/components/clinic/clinic-calendar";

export default function StaffCalendarPage() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b px-6 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Front desk</div>
        <h1 className="text-lg font-bold tracking-tight">Clinic calendar</h1>
        <p className="text-xs text-muted-foreground">
          Every doctor&apos;s day, side by side. Tap a free slot to book.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {/* All doctors (doctorId=null); reception view — no availability editing. */}
        <ClinicCalendar doctorId={null} readOnly />
      </div>
    </div>
  );
}
