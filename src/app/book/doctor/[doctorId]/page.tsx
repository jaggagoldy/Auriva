"use client";

import * as React from "react";
import { use } from "react";
import { Activity, CalendarCheck, Clock, Loader2, MapPin, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// Batch 3 (Booking Foundation): the PUBLIC booking page behind a shareable
// link — no login, no phone call. Reads /api/public/doctors/[id] for the
// doctor + bookable slots and posts to /api/public/bookings. This is the solo
// practitioner's "book me from my Instagram bio" surface.

interface DaySlots {
  date: string;
  slots: string[];
}
interface PublicClinic {
  name: string;
  address: string | null;
  phone: string | null;
  opens_at: string | null;
  closes_at: string | null;
  working_days: string | null;
  latitude: number | null;
  longitude: number | null;
}
interface PublicDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
  clinic: PublicClinic;
}

function formatDay(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const DAY_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};
/** "mon,tue,wed,thu,fri" + "09:00"–"18:00" → "Mon–Fri · 9:00 AM – 6:00 PM". */
function formatHours(clinic: PublicClinic): string | null {
  const days = (clinic.working_days ?? "")
    .split(",")
    .map((d) => DAY_LABELS[d.trim().toLowerCase()])
    .filter(Boolean);
  const time = (t: string) =>
    new Date(`2000-01-01T${t}:00`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const daysLabel = days.length ? days.join(", ") : null;
  const hoursLabel =
    clinic.opens_at && clinic.closes_at ? `${time(clinic.opens_at)} – ${time(clinic.closes_at)}` : null;
  if (daysLabel && hoursLabel) return `${daysLabel} · ${hoursLabel}`;
  return daysLabel ?? hoursLabel;
}
function directionsUrl(clinic: PublicClinic): string | null {
  if (clinic.latitude != null && clinic.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}`;
  }
  if (clinic.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`;
  }
  return null;
}

export default function PublicBookingPage({ params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = use(params);

  const [loading, setLoading] = React.useState(true);
  const [doctor, setDoctor] = React.useState<PublicDoctor | null>(null);
  const [accepting, setAccepting] = React.useState(true);
  const [days, setDays] = React.useState<DaySlots[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<{
    time: string;
    healthId: string;
    isNew: boolean;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/doctors/${doctorId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((data) => {
        if (cancelled) return;
        setDoctor(data.doctor);
        setAccepting(data.accepting_bookings !== false);
        setDays((data.slots as DaySlots[]).filter((d) => d.slots.length > 0));
      })
      .catch(() => !cancelled && setDoctor(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: doctorId,
          scheduled_time: selected,
          patient_name: name,
          patient_phone: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not complete booking. Please try another time.");
        return;
      }
      setConfirmation({
        time: data.appointment.scheduled_time,
        healthId: data.patient.health_id,
        isNew: data.is_new_patient,
      });
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-center" />
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-3">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <span className="text-sm font-semibold">Auriva</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !doctor ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              This booking link is no longer available.
            </p>
          </Card>
        ) : confirmation ? (
          <Card className="space-y-3 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarCheck className="size-6" />
            </div>
            <h1 className="text-lg font-semibold">Appointment requested</h1>
            <p className="text-sm text-muted-foreground">
              {formatDay(confirmation.time.slice(0, 10))} at {formatTime(confirmation.time)} with{" "}
              {doctor.full_name}.
            </p>
            <p className="text-xs text-muted-foreground">
              Your Auriva Health ID is <span className="font-mono font-medium">{confirmation.healthId}</span>.
              {confirmation.isNew
                ? " Log in with this phone number any time to manage your visit."
                : " We matched this to your existing records."}
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card className="p-5">
              <h1 className="text-lg font-semibold">{doctor.full_name}</h1>
              {doctor.specialty && (
                <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
              )}
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {doctor.clinic.name}
                    {doctor.clinic.address ? ` · ${doctor.clinic.address}` : ""}
                  </span>
                </div>
                {formatHours(doctor.clinic) && (
                  <div className="flex items-start gap-1.5">
                    <Clock className="mt-0.5 size-3.5 shrink-0" />
                    <span>{formatHours(doctor.clinic)}</span>
                  </div>
                )}
                {doctor.clinic.phone && (
                  <div className="flex items-start gap-1.5">
                    <Phone className="mt-0.5 size-3.5 shrink-0" />
                    <a href={`tel:${doctor.clinic.phone}`} className="text-primary hover:underline">
                      {doctor.clinic.phone}
                    </a>
                  </div>
                )}
                {directionsUrl(doctor.clinic) && (
                  <div className="flex items-start gap-1.5">
                    <Navigation className="mt-0.5 size-3.5 shrink-0" />
                    <a
                      href={directionsUrl(doctor.clinic)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Get directions
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {!accepting ? (
              <Card className="space-y-3 p-6 text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Phone className="size-5" />
                </div>
                <h2 className="text-base font-semibold">Not accepting online bookings right now</h2>
                <p className="text-sm text-muted-foreground">
                  Please call the clinic to book an appointment.
                </p>
                {doctor.clinic.phone ? (
                  <a href={`tel:${doctor.clinic.phone}`} className={cn(buttonVariants(), "w-full")}>
                    <Phone className="size-4" /> Call {doctor.clinic.phone}
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Contact details are shown above.
                  </p>
                )}
              </Card>
            ) : (
              <>
            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="size-4" /> Choose a time
              </div>
              {days.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open slots in the next 7 days. Please check back soon.
                </p>
              ) : (
                <div className="space-y-4">
                  {days.map((day) => (
                    <div key={day.date}>
                      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                        {formatDay(day.date)}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {day.slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelected(slot)}
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-xs transition-colors",
                              selected === slot
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:border-primary/50 hover:bg-muted"
                            )}
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-4 p-5">
              <div className="text-sm font-medium">Your details</div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  inputMode="tel"
                />
              </div>
              <Button
                className="w-full"
                disabled={!selected || name.trim().length < 2 || phone.replace(/\D/g, "").length < 7 || submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {selected ? `Book ${formatTime(selected)}` : "Select a time"}
              </Button>
            </Card>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
