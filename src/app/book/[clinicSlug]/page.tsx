"use client";

import * as React from "react";
import { use } from "react";
import {
  Activity,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface PublicDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
  bio: string | null;
  years_experience: number | null;
  languages: string | null;
  qualifications: string | null;
  photo_url: string | null;
  consultation_fee: number | null;
}

interface PublicService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string;
}

interface PublicClinic {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  opens_at: string | null;
  closes_at: string | null;
  working_days: string | null;
  accepting_bookings: boolean;
  latitude: number | null;
  longitude: number | null;
  doctors: PublicDoctor[];
  services: PublicService[];
}

interface DaySlots {
  date: string;
  slots: string[];
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function generateGoogleCalendarUrl(title: string, startTimeIso: string, location?: string): string {
  const start = new Date(startTimeIso);
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration default

  const formatIso = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatIso(start)}/${formatIso(end)}`,
    details: `Appointment confirmed via Auriva Digital Booking. Please arrive 10 minutes early.`,
    location: location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function PublicClinicBookingPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = use(params);

  const [loading, setLoading] = React.useState(true);
  const [clinic, setClinic] = React.useState<PublicClinic | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = React.useState<string | null>(null);

  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [daysSlots, setDaysSlots] = React.useState<DaySlots[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);

  const [patientName, setPatientName] = React.useState("");
  const [patientPhone, setPatientPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<{
    appointmentId: string;
    scheduledTime: string;
    manageToken: string;
    doctorName: string;
    clinicName: string;
    patientName: string;
  } | null>(null);

  // Fetch clinic details on mount
  React.useEffect(() => {
    let unmounted = false;
    setLoading(true);
    setErrorMsg(null);

    fetch(`/api/public/clinics/${encodeURIComponent(clinicSlug)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Clinic not found"))))
      .then((data) => {
        if (unmounted) return;
        setClinic(data.clinic);
        if (data.clinic.doctors && data.clinic.doctors.length > 0) {
          setSelectedDoctorId(data.clinic.doctors[0].id);
        }
      })
      .catch((err) => {
        if (!unmounted) setErrorMsg(err.message || "Failed to load clinic");
      })
      .finally(() => {
        if (!unmounted) setLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [clinicSlug]);

  // Fetch bookable slots when selected doctor changes
  React.useEffect(() => {
    if (!selectedDoctorId) return;

    let unmounted = false;
    setSlotsLoading(true);
    setSelectedSlot(null);

    fetch(`/api/public/slots?doctor_id=${selectedDoctorId}&days=7`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load slots"))))
      .then((data) => {
        if (!unmounted) setDaysSlots(data.days || []);
      })
      .catch(() => {
        if (!unmounted) setDaysSlots([]);
      })
      .finally(() => {
        if (!unmounted) setSlotsLoading(false);
      });

    return () => {
      unmounted = true;
    };
  }, [selectedDoctorId]);

  const selectedDoctor = React.useMemo(
    () => clinic?.doctors.find((d) => d.id === selectedDoctorId),
    [clinic, selectedDoctorId]
  );

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) {
      toast.error("Please select a doctor and an available slot.");
      return;
    }
    if (!patientName.trim() || patientName.trim().length < 2) {
      toast.error("Please enter a valid patient full name.");
      return;
    }
    if (!patientPhone.replace(/\D/g, "") || patientPhone.replace(/\D/g, "").length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          scheduled_time: selectedSlot,
          patient_name: patientName,
          patient_phone: patientPhone,
          notes: notes || undefined,
          booking_channel: "DIRECT",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to confirm booking.");
      }

      setConfirmation({
        appointmentId: data.appointment.id,
        scheduledTime: data.appointment.scheduled_time,
        manageToken: data.manage_token,
        doctorName: data.doctor_name || selectedDoctor?.full_name || "Doctor",
        clinicName: data.clinic_name || clinic?.name || "Clinic",
        patientName: patientName,
      });

      toast.success("Appointment confirmed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading clinic schedule...</p>
      </div>
    );
  }

  if (errorMsg || !clinic) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4 text-center">
        <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-8 max-w-md">
          <Info className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-100 mb-2">Clinic Not Found</h1>
          <p className="text-sm text-slate-400 mb-6">
            The requested booking link is invalid or no longer accepting online reservations.
          </p>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Confirmation Ticket View
  if (confirmation) {
    const googleCalUrl = generateGoogleCalendarUrl(
      `Doctor Appointment: ${confirmation.doctorName}`,
      confirmation.scheduledTime,
      clinic.address || clinic.name
    );

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <Toaster position="top-center" theme="dark" />
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">
                Booking Confirmed
              </span>
              <h1 className="text-2xl font-bold text-white">Your Visit Ticket</h1>
            </div>
          </div>

          <div className="space-y-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <p className="text-xs text-slate-400">Patient</p>
                <p className="font-semibold text-slate-100">{confirmation.patientName}</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Pay at Desk
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Doctor</p>
                <p className="font-medium text-slate-200">{confirmation.doctorName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Clinic</p>
                <p className="font-medium text-slate-200">{confirmation.clinicName}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-xs text-slate-400">Scheduled Date & Time</p>
              <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-lg mt-0.5">
                <Calendar className="h-5 w-5" />
                <span>
                  {formatDateLabel(confirmation.scheduledTime.split("T")[0])} at{" "}
                  {formatTimeLabel(confirmation.scheduledTime)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20"
            >
              <CalendarCheck className="h-5 w-5" />
              <span>Add to Google Calendar</span>
            </a>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400 mb-2">
                Need to modify or cancel your booking later?
              </p>
              <span className="text-xs text-emerald-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 select-all inline-block">
                Token: {confirmation.manageToken.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 sm:px-6">
      <Toaster position="top-center" theme="dark" />

      {/* Header Banner */}
      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl mb-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Medical Practice
              </span>
              {clinic.accepting_bookings ? (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-300">
                  ● 24/7 Booking Open
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-300">
                  ● Online Booking Paused
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{clinic.name}</h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{clinic.address || "Address available upon booking"}</span>
            </p>
          </div>

          {clinic.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="inline-flex items-center space-x-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Phone className="h-4 w-4 text-emerald-400" />
              <span>{clinic.phone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Booking Container */}
      <div className="w-full max-w-3xl space-y-6">
        {/* Step 1: Select Doctor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Stethoscope className="h-5 w-5 text-emerald-400" />
            <span>1. Choose a Doctor</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clinic.doctors.map((doc) => {
              const isSelected = doc.id === selectedDoctorId;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={cn(
                    "flex items-start space-x-3 p-4 rounded-2xl border text-left transition-all",
                    isSelected
                      ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300"
                  )}
                >
                  <div className="h-11 w-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-emerald-400 text-base">
                    {doc.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{doc.full_name}</p>
                    <p className="text-xs text-emerald-400 font-medium">{doc.specialty || "General Physician"}</p>
                    {doc.consultation_fee && (
                      <p className="text-xs text-slate-400 mt-1">Fee: ₹{doc.consultation_fee}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Service (Optional) */}
        {clinic.services.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span>2. Select Medical Service</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clinic.services.map((svc) => {
                const isSelected = svc.id === selectedServiceId;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setSelectedServiceId(isSelected ? null : svc.id)}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all flex justify-between items-center",
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500/60 text-slate-100"
                        : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">{svc.name}</p>
                      <p className="text-xs text-slate-400">{svc.duration_minutes} mins</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">₹{svc.price}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Date & Time Slot Picker */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <span>3. Select Date & Available Slot</span>
          </h2>

          {slotsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          ) : daysSlots.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No available slots found for this doctor.</p>
          ) : (
            <div className="space-y-4">
              {daysSlots.map((day) => {
                if (day.slots.length === 0) return null;
                return (
                  <div key={day.date} className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {formatDateLabel(day.date)}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {day.slots.map((slotIso) => {
                        const isSelected = selectedSlot === slotIso;
                        return (
                          <button
                            key={slotIso}
                            type="button"
                            onClick={() => setSelectedSlot(slotIso)}
                            className={cn(
                              "py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all",
                              isSelected
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                                : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                            )}
                          >
                            {formatTimeLabel(slotIso)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 4: Patient Details Form */}
        <form onSubmit={handleBookingSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <span>4. Patient Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Full Name *</Label>
              <Input
                type="text"
                placeholder="e.g. Jane Doe"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Mobile Phone Number *</Label>
              <Input
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Reason for Visit / Symptoms (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. Fever for 2 days, routine health checkup"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !selectedSlot || !clinic.accepting_bookings}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-base"
          >
            {submitting ? (
              <span className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Confirming Booking...</span>
              </span>
            ) : (
              "Confirm & Reserve Appointment"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
