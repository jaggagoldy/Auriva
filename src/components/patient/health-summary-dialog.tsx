"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePatientSession } from "@/components/patient/patient-session";

interface HealthSummaryDialogProps {
  trigger: React.ReactElement<{ children?: React.ReactNode }>;
}

/** Edits the three Health Summary fields that need a real backend column — allergies, chronic conditions, emergency contact (APS-010). */
export default function HealthSummaryDialog({ trigger }: HealthSummaryDialogProps) {
  const { patientProfile, updateProfile } = usePatientSession();
  const [open, setOpen] = React.useState(false);
  const [allergies, setAllergies] = React.useState(patientProfile.allergies ?? "");
  const [chronicConditions, setChronicConditions] = React.useState(patientProfile.chronic_conditions ?? "");
  const [contactName, setContactName] = React.useState(patientProfile.emergency_contact_name ?? "");
  const [contactPhone, setContactPhone] = React.useState(patientProfile.emergency_contact_phone ?? "");
  const [saving, setSaving] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setAllergies(patientProfile.allergies ?? "");
      setChronicConditions(patientProfile.chronic_conditions ?? "");
      setContactName(patientProfile.emergency_contact_name ?? "");
      setContactPhone(patientProfile.emergency_contact_phone ?? "");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergies,
          chronic_conditions: chronicConditions,
          emergency_contact_name: contactName,
          emergency_contact_phone: contactPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save");

      updateProfile({
        allergies: data.allergies,
        chronic_conditions: data.chronic_conditions,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
      });
      toast.success("Health details updated");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{trigger.props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Health details</DialogTitle>
          <DialogDescription>
            Shown on your Health Summary and visible to doctors you see — helps them treat you safely and faster.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, peanuts"
              className="min-h-16 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conditions">Chronic conditions</Label>
            <Textarea
              id="conditions"
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
              placeholder="e.g. Type 2 diabetes, hypertension"
              className="min-h-16 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Emergency contact</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">&nbsp;</Label>
              <Input
                id="contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone"
              />
            </div>
          </div>
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
