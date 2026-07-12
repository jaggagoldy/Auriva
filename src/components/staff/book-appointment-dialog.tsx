"use client";

import * as React from "react";
import { Loader2, CalendarPlus, ArrowLeft, UserPlus, CheckCircle } from "lucide-react";
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

interface SearchResultProfile {
  id: string;
  health_id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string;
}

type Step = "search" | "results" | "create" | "schedule";

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

interface BookAppointmentDialogProps {
  clinicId: string;
  doctors: DoctorOption[];
  onBooked: () => void;
}

const EMPTY_STATE = {
  searchPhone: "",
  searchName: "",
  selectedProfileId: null as string | null,
  selectedProfileName: "",
  createFullName: "",
  createGender: "",
  createDob: "",
  createPhone: "",
  doctorId: "",
  scheduledTime: "",
  notes: "",
};

export default function BookAppointmentDialog({ clinicId, doctors, onBooked }: BookAppointmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("search");
  const [searching, setSearching] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<SearchResultProfile[]>([]);
  const [form, setForm] = React.useState(EMPTY_STATE);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setStep("search");
      setResults([]);
      setForm(EMPTY_STATE);
    }
  };

  const patch = (fields: Partial<typeof EMPTY_STATE>) => setForm((f) => ({ ...f, ...fields }));

  const runSearch = async () => {
    if (!form.searchPhone.trim() && !form.searchName.trim()) {
      toast.error("Enter a phone number or a name to search.");
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (form.searchPhone.trim()) params.set("phone", form.searchPhone.trim());
      if (form.searchName.trim()) params.set("name", form.searchName.trim());
      const res = await fetch(`/api/patients?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Search failed.");
      setResults(data.profiles ?? []);
      setStep("results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const selectExisting = (profile: SearchResultProfile) => {
    patch({ selectedProfileId: profile.id, selectedProfileName: profile.full_name });
    setStep("schedule");
  };

  const startCreateNew = () => {
    patch({
      selectedProfileId: null,
      createFullName: form.searchName,
      createPhone: form.searchPhone,
    });
    setStep("create");
  };

  const confirmCreate = async () => {
    if (!form.createFullName.trim() && !form.createPhone.trim()) {
      toast.error("Enter at least a name or a phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.createFullName.trim() || undefined,
          gender: form.createGender || undefined,
          date_of_birth: form.createDob || undefined,
          phone_number: form.createPhone.trim() || undefined,
        }),
      });
      const profile = await res.json();
      if (!res.ok) throw new Error(profile.message || "Could not register patient.");
      patch({ selectedProfileId: profile.id, selectedProfileName: profile.full_name });
      setStep("schedule");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register patient.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(form.selectedProfileId) && form.doctorId !== "" && form.scheduledTime !== "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: form.selectedProfileId,
          doctor_id: form.doctorId,
          clinic_id: clinicId,
          scheduled_time: new Date(form.scheduledTime).toISOString(),
          status: "scheduled",
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not book the appointment.");

      toast.success(`Appointment booked for ${form.selectedProfileName}`, {
        description: doctors.find((d) => d.id === form.doctorId)?.full_name,
      });
      setOpen(false);
      onBooked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not book the appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    search: "Book an appointment",
    results: "Select patient",
    create: "New Healthcare Profile",
    schedule: "Choose doctor & time",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <CalendarPlus />
        Book Appointment
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <DialogDescription>
            {step === "search" && "Search for the patient this future visit is for."}
            {step === "results" && "Pick the right person, or register a new profile if none match."}
            {step === "create" && "Only a name or phone is required — the rest can be filled in later."}
            {step === "schedule" && "Pick a doctor and a slot — a conflicting booking is never allowed."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-search-phone">Phone number</Label>
                <Input
                  id="book-search-phone"
                  value={form.searchPhone}
                  onChange={(e) => patch({ searchPhone: e.target.value })}
                  placeholder="+1 555-019-9999"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-search-name">Full name</Label>
                <Input
                  id="book-search-name"
                  value={form.searchName}
                  onChange={(e) => patch({ searchName: e.target.value })}
                  placeholder="e.g. Priya Rivera"
                />
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="button" onClick={runSearch} disabled={searching}>
                {searching ? <Loader2 className="animate-spin" /> : null}
                Search
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "results" && (
          <div className="space-y-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("search")}>
              <ArrowLeft />
              Back to search
            </Button>

            {results.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No matches found. Register a new Healthcare Profile below.
              </p>
            )}

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {results.map((profile) => {
                const age = ageFromDob(profile.date_of_birth);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => selectExisting(profile)}
                    className="flex w-full items-center justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <div>
                      <p className="text-sm font-semibold">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.gender ?? "Gender not set"}
                        {age !== null ? ` · ${age}` : ""} · {profile.blood_group}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{profile.health_id}</span>
                  </button>
                );
              })}
            </div>

            <Button type="button" variant="secondary" className="w-full" onClick={startCreateNew}>
              <UserPlus />
              None of these — create new Healthcare Profile
            </Button>
          </div>
        )}

        {step === "create" && (
          <div className="space-y-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(results.length ? "results" : "search")}>
              <ArrowLeft />
              Back
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-create-name">Full name</Label>
                <Input id="book-create-name" value={form.createFullName} onChange={(e) => patch({ createFullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-create-phone">Phone</Label>
                <Input id="book-create-phone" value={form.createPhone} onChange={(e) => patch({ createPhone: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-create-gender">Gender</Label>
                <Select value={form.createGender} onValueChange={(v) => patch({ createGender: v as string })}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{form.createGender || <span className="text-muted-foreground">Optional</span>}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-create-dob">Date of birth</Label>
                <Input id="book-create-dob" type="date" value={form.createDob} onChange={(e) => patch({ createDob: e.target.value })} />
              </div>
            </div>
            <Button type="button" className="w-full" disabled={submitting} onClick={confirmCreate}>
              {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
              Continue
            </Button>
          </div>
        )}

        {step === "schedule" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(form.selectedProfileId ? "results" : "search")}>
              <ArrowLeft />
              Back
            </Button>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm font-medium">{form.selectedProfileName}</div>

            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={form.doctorId} onValueChange={(v) => patch({ doctorId: v as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {form.doctorId ? doctors.find((d) => d.id === form.doctorId)?.full_name : <span className="text-muted-foreground">Select a doctor</span>}
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
              <Label htmlFor="book-datetime">Date &amp; time</Label>
              <Input
                id="book-datetime"
                type="datetime-local"
                value={form.scheduledTime}
                onChange={(e) => patch({ scheduledTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-notes">Visit reason</Label>
              <Textarea
                id="book-notes"
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Optional"
                className="min-h-16 resize-none"
              />
            </div>

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
                Book Appointment
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
