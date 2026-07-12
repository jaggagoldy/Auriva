"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
import { Doctor } from "@/shared/queue";

interface DoctorProfileEditDialogProps {
  doctor: Doctor;
  group: "personal" | "professional" | "practice";
  trigger: React.ReactElement<{ children?: React.ReactNode }>;
  onSaved: (doctor: Doctor) => void;
}

const GROUP_META = {
  personal: { title: "Personal details", description: "Shown on your public profile once verified." },
  professional: {
    title: "Professional details",
    description: "Registration and qualifications — reviewed as part of verification.",
  },
  practice: { title: "Practice details", description: "Fee for consultations at this clinic." },
};

export default function DoctorProfileEditDialog({
  doctor,
  group,
  trigger,
  onSaved,
}: DoctorProfileEditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [bio, setBio] = React.useState(doctor.bio ?? "");
  const [languages, setLanguages] = React.useState(doctor.languages ?? "");
  const [yearsExperience, setYearsExperience] = React.useState(
    doctor.years_experience?.toString() ?? ""
  );
  const [specialty, setSpecialty] = React.useState(doctor.specialty ?? "");
  const [qualifications, setQualifications] = React.useState(doctor.qualifications ?? "");
  const [registrationNumber, setRegistrationNumber] = React.useState(
    doctor.registration_number ?? ""
  );
  const [consultationFee, setConsultationFee] = React.useState(
    doctor.consultation_fee?.toString() ?? ""
  );
  const [saving, setSaving] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setBio(doctor.bio ?? "");
      setLanguages(doctor.languages ?? "");
      setYearsExperience(doctor.years_experience?.toString() ?? "");
      setSpecialty(doctor.specialty ?? "");
      setQualifications(doctor.qualifications ?? "");
      setRegistrationNumber(doctor.registration_number ?? "");
      setConsultationFee(doctor.consultation_fee?.toString() ?? "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> =
        group === "personal"
          ? { bio, languages, years_experience: yearsExperience ? Number(yearsExperience) : null }
          : group === "professional"
            ? { specialty, qualifications, registration_number: registrationNumber }
            : { consultation_fee: consultationFee ? Number(consultationFee) : null };

      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save");
      onSaved(data);
      toast.success("Profile updated");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const meta = GROUP_META[group];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{trigger.props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {group === "personal" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short professional summary patients will see"
                  className="min-h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="languages">Languages</Label>
                  <Input
                    id="languages"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="English, Hindi"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="years">Years of experience</Label>
                  <Input
                    id="years"
                    type="number"
                    min={0}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
          {group === "professional" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Cardiologist"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration">Medical registration number</Label>
                <Input
                  id="registration"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. MCI-123456"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea
                  id="qualifications"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. MBBS, MD (Internal Medicine)"
                  className="min-h-16 resize-none"
                />
              </div>
            </>
          )}
          {group === "practice" && (
            <div className="space-y-1.5">
              <Label htmlFor="fee">Consultation fee (₹)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
