"use client";

import * as React from "react";
import { use } from "react";
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface BookingDetails {
  id: string;
  manageToken: string;
  scheduledTime: string;
  status: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorId: string;
  specialty: string | null;
  clinicName: string;
  clinicId: string;
  clinicAddress: string | null;
  clinicPhone: string | null;
  updatedAt: string;
  rescheduleCount: number;
  canCancel: boolean;
  canReschedule: boolean;
  policyReason?: string;
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

export default function PatientSelfServicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [loading, setLoading] = React.useState(true);
  const [currentToken, setCurrentToken] = React.useState(token);
  const [booking, setBooking] = React.useState<BookingDetails | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Reschedule state
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [daysSlots, setDaysSlots] = React.useState<DaySlots[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [rescheduling, setRescheduling] = React.useState(false);

  // Cancel state
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);

  const fetchBooking = React.useCallback(async (tok: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/public/manage/${encodeURIComponent(tok)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Booking link invalid or expired.");
      }
      setBooking(data.booking);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load booking";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBooking(currentToken);
  }, [currentToken, fetchBooking]);

  const openRescheduleModal = async () => {
    if (!booking) return;
    setRescheduleOpen(true);
    setSlotsLoading(true);
    setSelectedSlot(null);

    try {
      const res = await fetch(`/api/public/slots?doctor_id=${booking.doctorId}&days=7`, { cache: "no-store" });
      const data = await res.json();
      setDaysSlots(data.days || []);
    } catch {
      setDaysSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!booking || !selectedSlot) return;

    setRescheduling(true);
    try {
      const res = await fetch(`/api/public/manage/${encodeURIComponent(currentToken)}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_scheduled_time: selectedSlot,
          expected_updated_at: booking.updatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reschedule appointment.");
      }

      toast.success("Appointment rescheduled successfully!");
      setRescheduleOpen(false);
      if (data.new_manage_token) {
        setCurrentToken(data.new_manage_token);
      } else {
        fetchBooking(currentToken);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reschedule failed";
      toast.error(msg);
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!booking) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/public/manage/${encodeURIComponent(currentToken)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || undefined,
          expected_updated_at: booking.updatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel appointment.");
      }

      toast.success("Appointment cancelled.");
      setCancelOpen(false);
      fetchBooking(currentToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading booking self-service portal...</p>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4 text-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md shadow-2xl backdrop-blur-xl">
          <Info className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-100 mb-2">Booking Link Inactive</h1>
          <p className="text-sm text-slate-400 mb-6">
            {errorMsg || "This self-service booking link is no longer valid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === "cancelled";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 sm:px-6">
      <Toaster position="top-center" theme="dark" />

      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">
              Patient Self-Service
            </span>
            <h1 className="text-2xl font-bold text-white mt-0.5">Manage Appointment</h1>
          </div>
          <span
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-full border",
              isCancelled
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
            )}
          >
            {isCancelled ? "Cancelled" : "Confirmed"}
          </span>
        </div>

        {/* Appointment Card Details */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-400">Patient Name</p>
            <p className="font-semibold text-slate-100">{booking.patientName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400">Doctor</p>
              <p className="font-medium text-slate-200">{booking.doctorName}</p>
              {booking.specialty && <p className="text-xs text-emerald-400">{booking.specialty}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-400">Clinic</p>
              <p className="font-medium text-slate-200">{booking.clinicName}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <p className="text-xs text-slate-400">Scheduled Visit Date & Time</p>
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-lg mt-0.5">
              <Calendar className="h-5 w-5" />
              <span>
                {formatDateLabel(booking.scheduledTime.split("T")[0])} at{" "}
                {formatTimeLabel(booking.scheduledTime)}
              </span>
            </div>
          </div>

          {booking.clinicAddress && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{booking.clinicAddress}</span>
            </p>
          )}
        </div>

        {/* Policy Warning Banner */}
        {booking.policyReason && !isCancelled && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <span>{booking.policyReason}</span>
          </div>
        )}

        {/* Self-Service Actions */}
        {!isCancelled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              disabled={!booking.canReschedule}
              onClick={openRescheduleModal}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reschedule Slot
            </Button>

            <Button
              type="button"
              disabled={!booking.canCancel}
              onClick={() => setCancelOpen(true)}
              variant="outline"
              className="py-3 border-red-800/60 text-red-400 hover:bg-red-950/40 font-semibold rounded-xl"
            >
              <XCircle className="h-4 w-4 mr-2 text-red-400" />
              Cancel Booking
            </Button>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-400" />
              <span>Reschedule Visit</span>
            </DialogTitle>
          </DialogHeader>

          {slotsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            </div>
          ) : daysSlots.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No available slots found for this doctor.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {daysSlots.map((day) => {
                if (day.slots.length === 0) return null;
                return (
                  <div key={day.date} className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {formatDateLabel(day.date)}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {day.slots.map((slotIso) => {
                        const isSelected = selectedSlot === slotIso;
                        return (
                          <button
                            key={slotIso}
                            type="button"
                            onClick={() => setSelectedSlot(slotIso)}
                            className={cn(
                              "py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all",
                              isSelected
                                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="ghost" className="text-slate-400 hover:bg-slate-800" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={rescheduling || !selectedSlot}
              onClick={handleRescheduleSubmit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {rescheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm New Slot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <span>Cancel Appointment</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-300">
              Are you sure you want to cancel your visit with <span className="font-semibold text-white">{booking.doctorName}</span>?
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Reason for Cancellation (Optional)</Label>
              <Input
                type="text"
                placeholder="e.g. Work conflict, feeling better"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" className="text-slate-400 hover:bg-slate-800" onClick={() => setCancelOpen(false)}>
              Keep Appointment
            </Button>
            <Button
              disabled={cancelling}
              onClick={handleCancelSubmit}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
