"use client";

import * as React from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoctorOption } from "@/components/staff/doctor-filter";

const PHONE_PATTERN = /^\+?[0-9\s-]{7,}$/;

interface WalkInModalProps {
  clinicId: string;
  doctors: DoctorOption[];
  onRegistered: () => void;
  defaultOpen?: boolean;
}

export default function WalkInModal({
  clinicId,
  doctors,
  onRegistered,
  defaultOpen = false,
}: WalkInModalProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [phone, setPhone] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [bloodGroup, setBloodGroup] = React.useState("");
  const [doctorId, setDoctorId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const valid = PHONE_PATTERN.test(phone.trim()) && doctorId !== "";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setPhone("");
      setFullName("");
      setBloodGroup("");
      setDoctorId("");
      setNotes("");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || !doctorId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reception/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone.trim(),
          full_name: fullName.trim() || undefined,
          blood_group: bloodGroup.trim() || undefined,
          doctor_id: doctorId,
          clinic_id: clinicId,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not register walk-in.");

      toast.success(`${data.patient.full_name} added to the queue`, {
        description: data.is_new_patient
          ? `New patient registered · Queue #${data.queue_number}`
          : `Existing patient found · Queue #${data.queue_number}`,
      });
      setOpen(false);
      onRegistered();
    } catch (err: any) {
      toast.error(err.message || "Could not register walk-in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlus />
        New Walk-In
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register a walk-in patient</DialogTitle>
          <DialogDescription>
            Search by phone number — if the patient already exists, their
            profile is reused instead of creating a duplicate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="walkin-phone">Phone number</Label>
            <Input
              id="walkin-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555-019-9999"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-name">Full name</Label>
              <Input
                id="walkin-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="If new patient"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-blood">Blood group</Label>
              <Input
                id="walkin-blood"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Doctor</Label>
            <Select value={doctorId} onValueChange={(v) => setDoctorId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {doctorId ? (
                    doctors.find((d) => d.id === doctorId)?.full_name
                  ) : (
                    <span className="text-muted-foreground">Select a doctor</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                    {doctor.specialty ? ` · ${doctor.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-notes">Notes</Label>
            <Textarea
              id="walkin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for visit, optional"
              className="min-h-16 resize-none"
            />
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={!valid || submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Add to Queue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
