"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import GlobalSearch from "@/components/staff/global-search";
import { CheckCircle2, Loader2, MapPin, Stethoscope, ArrowRight, CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Doctor, formatDay, formatTime, getInitials } from "@/shared/queue";

interface DaySlots {
  date: string; // "YYYY-MM-DD"
  slots: string[]; // ISO datetimes
}

// "YYYY-MM-DD" has no timezone marker, so `new Date(dateKey)` parses it as
// UTC midnight — reading it back with local getters (getDate(), etc.) can
// land on the wrong calendar day in a non-UTC timezone. The 3-arg
// constructor is always local time, so parse the parts explicitly instead.
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface BookAppointmentDialogProps {
  patientId: string;
  /** A fully-formed <Button>…</Button> element — its children become the trigger's visible content. */
  trigger: React.ReactElement<{ children?: React.ReactNode }>;
  onBooked?: () => void;
  /** Pre-select a doctor (e.g. arriving from a doctor's profile) instead of starting on search. */
  initialDoctor?: Doctor | null;
  /**
   * Reschedule mode: moves an existing appointment's time instead of booking
   * a new one. The doctor is fixed (initialDoctor is required alongside
   * this) — only the date/time can change, mirroring what
   * rescheduleAppointment() actually allows server-side.
   */
  rescheduleAppointmentId?: string;
}

export default function BookAppointmentDialog({
  patientId,
  trigger,
  onBooked,
  initialDoctor = null,
  rescheduleAppointmentId,
}: BookAppointmentDialogProps) {
  const router = useRouter();
  const isReschedule = Boolean(rescheduleAppointmentId);

  const [open, setOpen] = React.useState(false);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(initialDoctor);

  const [daySlots, setDaySlots] = React.useState<DaySlots[] | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [fallbackTime, setFallbackTime] = React.useState("");
  const [reason, setReason] = React.useState("");

  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);

  const resetBookingState = React.useCallback(() => {
    setDaySlots(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setFallbackTime("");
    setReason("");
    setConfirmed(false);
  }, []);

  const fetchDoctors = React.useCallback(async () => {
    try {
      const res = await fetch("/api/doctors", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      setDoctors(await res.json());
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      fetchDoctors();
      setSelectedDoctor(initialDoctor);
      setSearchQuery("");
      resetBookingState();
    }
  };

  // Load real bookable slots whenever the selected doctor changes.
  React.useEffect(() => {
    if (!open || !selectedDoctor) return;
    setDaySlots(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    fetch(`/api/doctors/${selectedDoctor.id}/slots`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DaySlots[]) => {
        setDaySlots(data);
        const firstWithSlots = data.find((d) => d.slots.length > 0);
        setSelectedDate(firstWithSlots?.date ?? data[0]?.date ?? null);
      })
      .catch(() => setDaySlots([]));
  }, [open, selectedDoctor]);

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.clinic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasAnyRealSlots = (daySlots ?? []).some((d) => d.slots.length > 0);
  const activeDay = (daySlots ?? []).find((d) => d.date === selectedDate) ?? null;
  const chosenIso = daySlots !== null ? selectedSlot : fallbackTime ? new Date(fallbackTime).toISOString() : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !chosenIso) {
      toast.error("Please select a doctor and a time.");
      return;
    }

    setBookingLoading(true);
    try {
      if (isReschedule && rescheduleAppointmentId) {
        const res = await fetch(`/api/appointments/${rescheduleAppointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_time: chosenIso }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to reschedule appointment");
      } else {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
            doctor_id: selectedDoctor.id,
            clinic_id: selectedDoctor.clinic_id,
            scheduled_time: chosenIso,
            status: "scheduled",
            notes: reason.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to book appointment");
      }

      setConfirmed(true);
      onBooked?.();
    } catch (err: any) {
      toast.error(err.message || (isReschedule ? "Failed to reschedule appointment" : "Failed to book appointment"));
    } finally {
      setBookingLoading(false);
    }
  };

  const chosenLabel = chosenIso ? `${formatDay(chosenIso)}, ${formatTime(chosenIso)}` : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{trigger.props.children}</DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        {confirmed ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-7 text-success" />
            </div>
            <div>
              <p className="text-[17px] font-semibold">
                {isReschedule ? "Appointment rescheduled" : "Appointment confirmed"}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {isReschedule ? "Your new time is" : "You're booked with"} {selectedDoctor?.full_name}
              </p>
            </div>
            <div className="w-full rounded-xl border bg-muted/40 p-3.5 text-left">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-xs font-semibold">
                    {selectedDoctor ? getInitials(selectedDoctor.full_name) : ""}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{selectedDoctor?.full_name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {chosenLabel} · {selectedDoctor?.clinic.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  router.push("/patient/care");
                }}
              >
                View appointment
              </Button>
              {!isReschedule && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSelectedDoctor(initialDoctor);
                    setSearchQuery("");
                    resetBookingState();
                  }}
                >
                  Book another
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isReschedule ? <CalendarCheck2 className="h-4.5 w-4.5 text-muted-foreground" /> : <Stethoscope className="h-4.5 w-4.5 text-muted-foreground" />}
                <span>{isReschedule ? "Reschedule appointment" : "Search & book a doctor"}</span>
              </DialogTitle>
              <DialogDescription>
                {isReschedule
                  ? "Pick a new date and time — your doctor and clinic stay the same."
                  : "Search doctors across Auriva clinics, choose your time, and confirm your booking instantly."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isReschedule && (
                <div className="space-y-1.5">
                  <Label>Select doctor &amp; clinic</Label>

                  {!selectedDoctor ? (
                    <div className="space-y-2">
                      <GlobalSearch
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search doctor, specialty, or clinic…"
                      />

                      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                        {doctors.length === 0 ? (
                          <div className="space-y-1.5">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
                            ))}
                          </div>
                        ) : filteredDoctors.length > 0 ? (
                          filteredDoctors.map((doc) => (
                            <button
                              type="button"
                              key={doc.id}
                              onClick={() => setSelectedDoctor(doc)}
                              className="flex w-full items-start justify-between gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40"
                            >
                              <div className="flex min-w-0 items-start gap-2.5">
                                <Avatar className="size-8 shrink-0">
                                  <AvatarFallback className="text-[11px] font-semibold">
                                    {getInitials(doc.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{doc.full_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.specialty || "General Practitioner"}
                                  </p>
                                  <p className="mt-0.5 flex items-center text-[11px] text-muted-foreground">
                                    <MapPin className="mr-0.5 h-3 w-3 shrink-0" />
                                    <span className="truncate">{doc.clinic.name}</span>
                                  </p>
                                </div>
                              </div>
                              <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </button>
                          ))
                        ) : (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            No doctors found matching &quot;{searchQuery}&quot;.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="text-xs font-semibold">
                            {getInitials(selectedDoctor.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{selectedDoctor.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedDoctor.specialty || "General Practitioner"}
                          </p>
                          <p className="mt-0.5 flex items-center text-[11px] text-muted-foreground">
                            <MapPin className="mr-0.5 h-3 w-3 shrink-0" />
                            <span className="truncate">{selectedDoctor.clinic.name}</span>
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)}>
                        Change
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {selectedDoctor && (
                <>
                  {daySlots === null ? (
                    <div className="h-24 animate-pulse rounded-lg bg-muted/60" />
                  ) : hasAnyRealSlots ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="mb-1.5 block">Select date</Label>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {daySlots.map((day) => (
                            <button
                              type="button"
                              key={day.date}
                              disabled={day.slots.length === 0}
                              onClick={() => {
                                setSelectedDate(day.date);
                                setSelectedSlot(null);
                              }}
                              className={cn(
                                "flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-center transition-colors",
                                day.date === selectedDate
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : day.slots.length === 0
                                    ? "cursor-not-allowed border-border/60 text-muted-foreground/40"
                                    : "border-border hover:border-primary/40"
                              )}
                            >
                              <span className="text-[9.5px] font-medium uppercase opacity-80">
                                {formatDay(parseDateKey(day.date)).split(",")[0]}
                              </span>
                              <span className="text-[13px] font-semibold">{parseDateKey(day.date).getDate()}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 block">Available times</Label>
                        {!activeDay || activeDay.slots.length === 0 ? (
                          <p className="py-3 text-center text-xs text-muted-foreground">No open slots this day.</p>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {activeDay.slots.map((iso) => (
                              <button
                                type="button"
                                key={iso}
                                onClick={() => setSelectedSlot(iso)}
                                className={cn(
                                  "rounded-lg border px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                                  selectedSlot === iso
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/40"
                                )}
                              >
                                {formatTime(iso)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="datetime">Select date &amp; time</Label>
                      <Input
                        id="datetime"
                        type="datetime-local"
                        required
                        value={fallbackTime}
                        onChange={(e) => setFallbackTime(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        This doctor hasn&apos;t set up bookable hours yet — pick any time and the clinic will confirm.
                      </p>
                    </div>
                  )}

                  {!isReschedule && (
                    <div className="space-y-1.5">
                      <Label htmlFor="reason">
                        Reason for visit <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder="e.g. Follow-up on blood pressure medication"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-16"
                      />
                    </div>
                  )}

                  {chosenLabel && (
                    <div className="rounded-lg border bg-muted/40 p-3 text-[12.5px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date &amp; time</span>
                        <span className="font-semibold text-primary">{chosenLabel}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span className="text-muted-foreground">Clinic</span>
                        <span>{selectedDoctor.clinic.name}</span>
                      </div>
                      {selectedDoctor.consultation_fee != null && (
                        <div className="mt-1 flex justify-between">
                          <span className="text-muted-foreground">Consultation fee</span>
                          <span className="font-semibold">₹{selectedDoctor.consultation_fee.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <DialogFooter>
                <Button type="submit" disabled={bookingLoading || !selectedDoctor || !chosenIso} className="w-full">
                  {bookingLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <span>{isReschedule ? "Confirm new time" : "Confirm Booking"}</span>
                      <CheckCircle2 />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
