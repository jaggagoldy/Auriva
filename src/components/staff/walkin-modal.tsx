"use client";

import * as React from "react";
import { Loader2, UserPlus, Search, ArrowLeft, ShieldAlert, Check } from "lucide-react";
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

interface WalkInModalProps {
  clinicId: string;
  doctors: DoctorOption[];
  onRegistered: () => void;
  defaultOpen?: boolean;
}

interface SearchResultProfile {
  id: string;
  health_id: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string;
  guardian_name: string | null;
  guardian_relation: string | null;
  verification_level: string;
  has_account: boolean;
  phones: string[];
}

type Step = "search" | "results" | "create" | "book";

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

const EMPTY_STATE = {
  searchPhone: "",
  searchName: "",
  searchDob: "",
  selectedProfileId: null as string | null,
  selectedProfileName: "",
  createFullName: "",
  createGender: "",
  createDob: "",
  createGuardianName: "",
  createGuardianRelation: "",
  createBloodGroup: "",
  createPhone: "",
  isEmergency: false,
  doctorId: "",
  notes: "",
};

export default function WalkInModal({
  clinicId,
  doctors,
  onRegistered,
  defaultOpen = false,
}: WalkInModalProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [step, setStep] = React.useState<Step>("search");
  const [searching, setSearching] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [resultKind, setResultKind] = React.useState<"exact" | "suggestions" | "none">("none");
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
      if (form.searchDob.trim()) params.set("dob", form.searchDob.trim());
      const res = await fetch(`/api/patients?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Search failed.");
      setResultKind(data.kind);
      setResults(data.profiles ?? []);
      setStep("results");
    } catch (err) {
      toast.error((err instanceof Error ? err.message : undefined) || "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const selectExisting = (profile: SearchResultProfile) => {
    patch({ selectedProfileId: profile.id, selectedProfileName: profile.full_name });
    setStep("book");
  };

  const startCreateNew = (emergency: boolean) => {
    patch({
      selectedProfileId: null,
      isEmergency: emergency,
      createFullName: emergency ? "" : form.searchName,
      createPhone: emergency ? "" : form.searchPhone,
    });
    setStep("create");
  };

  const confirmCreate = () => {
    if (!form.isEmergency && !form.createFullName.trim() && !form.createPhone.trim()) {
      toast.error("Enter at least a name or a phone number (or mark this as an emergency registration).");
      return;
    }
    setStep("book");
  };

  const canSubmit = form.doctorId !== "" && (form.selectedProfileId || form.isEmergency || form.createFullName.trim() || form.createPhone.trim());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reception/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthcare_profile_id: form.selectedProfileId ?? undefined,
          phone_number: form.selectedProfileId ? undefined : form.createPhone.trim() || undefined,
          full_name: form.selectedProfileId ? undefined : form.createFullName.trim() || undefined,
          gender: form.selectedProfileId ? undefined : form.createGender || undefined,
          date_of_birth: form.selectedProfileId ? undefined : form.createDob || undefined,
          guardian_name: form.selectedProfileId ? undefined : form.createGuardianName.trim() || undefined,
          guardian_relation: form.selectedProfileId ? undefined : form.createGuardianRelation || undefined,
          blood_group: form.selectedProfileId ? undefined : form.createBloodGroup || undefined,
          is_emergency: form.selectedProfileId ? false : form.isEmergency,
          doctor_id: form.doctorId,
          clinic_id: clinicId,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not register patient.");

      toast.success(`Added to queue · Queue #${data.queue_number}`, {
        description: data.is_new_patient
          ? `New Healthcare Profile created · ${data.patient_health_id}`
          : "Existing Healthcare Profile found",
      });
      setOpen(false);
      onRegistered();
    } catch (err) {
      toast.error((err instanceof Error ? err.message : undefined) || "Could not register patient.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    search: "Find or register a patient",
    results: "Identity search results",
    create: form.isEmergency ? "Emergency registration" : "Create Healthcare Profile",
    book: "Assign doctor & queue",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlus />
        New Patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <DialogDescription>
            {step === "search" && "Search by phone, Auriva Health ID, or name — reception is never blocked if nothing matches."}
            {step === "results" && resultKind === "suggestions" && "Possible matches only — review carefully before selecting; when in doubt, register a new profile."}
            {step === "results" && resultKind === "exact" && "Select the right person, or register a new profile if none of these are a match."}
            {step === "create" && form.isEmergency && "Treatment must never wait on identity. Only a doctor is required — everything else can be completed later."}
            {step === "create" && !form.isEmergency && "Every field except name is optional."}
            {step === "book" && "Choose the doctor to queue this patient with."}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Search */}
        {step === "search" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="search-phone">Phone number</Label>
                <Input
                  id="search-phone"
                  value={form.searchPhone}
                  onChange={(e) => patch({ searchPhone: e.target.value })}
                  placeholder="+1 555-019-9999"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="search-name">Full name</Label>
                <Input
                  id="search-name"
                  value={form.searchName}
                  onChange={(e) => patch({ searchName: e.target.value })}
                  placeholder="e.g. Priya Rivera"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-dob">Date of birth (optional, narrows a name search)</Label>
              <Input id="search-dob" type="date" value={form.searchDob} onChange={(e) => patch({ searchDob: e.target.value })} />
            </div>

            <DialogFooter showCloseButton className="!justify-between">
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => startCreateNew(true)}>
                <ShieldAlert />
                Emergency — skip search
              </Button>
              <Button type="button" onClick={runSearch} disabled={searching}>
                {searching ? <Loader2 className="animate-spin" /> : <Search />}
                Search
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Results */}
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
                        {profile.guardian_relation ? ` · ${profile.guardian_relation}'s dependent` : ""}
                        {!profile.has_account ? " · No Auriva Account" : ""}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{profile.health_id}</span>
                  </button>
                );
              })}
            </div>

            <Button type="button" variant="secondary" className="w-full" onClick={() => startCreateNew(false)}>
              <UserPlus />
              None of these — create new Healthcare Profile
            </Button>
          </div>
        )}

        {/* Step: Create (covers ordinary + emergency registration) */}
        {step === "create" && (
          <div className="space-y-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(results.length ? "results" : "search")}>
              <ArrowLeft />
              Back
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">
                  Full name {form.isEmergency && <span className="text-muted-foreground font-normal">(optional — defaults to &ldquo;Unknown Patient&rdquo;)</span>}
                </Label>
                <Input id="create-name" value={form.createFullName} onChange={(e) => patch({ createFullName: e.target.value })} placeholder="If known" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-phone">Phone {form.isEmergency && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
                <Input id="create-phone" value={form.createPhone} onChange={(e) => patch({ createPhone: e.target.value })} placeholder="Optional" disabled={form.isEmergency} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-gender">Gender</Label>
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
                <Label htmlFor="create-dob">Date of birth</Label>
                <Input id="create-dob" type="date" value={form.createDob} onChange={(e) => patch({ createDob: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-guardian-name">Guardian / Father / Husband name</Label>
                <Input id="create-guardian-name" value={form.createGuardianName} onChange={(e) => patch({ createGuardianName: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-guardian-relation">Relation</Label>
                <Select value={form.createGuardianRelation} onValueChange={(v) => patch({ createGuardianRelation: v as string })}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{form.createGuardianRelation || <span className="text-muted-foreground">Optional</span>}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {["Father", "Mother", "Husband", "Guardian"].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-blood">Blood group</Label>
              <Input id="create-blood" value={form.createBloodGroup} onChange={(e) => patch({ createBloodGroup: e.target.value })} placeholder="e.g. O+ · optional" />
            </div>

            <Button type="button" className="w-full" onClick={confirmCreate}>
              <Check />
              Continue
            </Button>
          </div>
        )}

        {/* Step: Book (assign doctor + queue) */}
        {step === "book" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(form.selectedProfileId ? "results" : "create")}
            >
              <ArrowLeft />
              Back
            </Button>

            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {form.selectedProfileId ? (
                <span className="font-medium">{form.selectedProfileName}</span>
              ) : form.isEmergency ? (
                <span className="font-medium text-destructive">Emergency registration — {form.createFullName.trim() || "Unknown Patient"}</span>
              ) : (
                <span className="font-medium">{form.createFullName.trim() || form.createPhone.trim()}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={form.doctorId} onValueChange={(v) => patch({ doctorId: v as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {form.doctorId ? (
                      doctors.find((d) => d.id === form.doctorId)?.full_name
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
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Reason for visit, optional"
                className="min-h-16 resize-none"
              />
            </div>

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Add to Queue
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
