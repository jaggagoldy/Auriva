"use client";

// PKG-4 Reception Calendar — every doctor's day side by side (doctors as
// columns, time-slot rows), free slots open the existing booking flow. Replaces
// the week-grid ClinicCalendar for the front desk. No new scheduling capability.
import ReceptionCalendar from "@/components/staff/reception-calendar";

export default function StaffCalendarPage() {
  return <ReceptionCalendar />;
}
