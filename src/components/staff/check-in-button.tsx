"use client";

import * as React from "react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CheckInButtonProps {
  appointmentId: string;
  clinicId: string;
  patientName: string;
  onSuccess: () => void;
}

export default function CheckInButton({
  appointmentId,
  clinicId,
  patientName,
  onSuccess,
}: CheckInButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/reception/checkin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointmentId, clinic_id: clinicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Check-in failed.");
      toast.success(`${patientName} checked in`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Check-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" className="w-full" disabled={loading} onClick={handleClick}>
      {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
      Check In
    </Button>
  );
}
