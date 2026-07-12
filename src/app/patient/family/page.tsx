"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePatientSession } from "@/components/patient/patient-session";
import { getInitials } from "@/shared/queue";

const RELATIONS = ["Father", "Mother", "Husband", "Wife", "Son", "Daughter", "Guardian", "Other"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const BLOOD_GROUPS = ["O-Positive", "O-Negative", "A-Positive", "A-Negative", "B-Positive", "B-Negative", "AB-Positive", "AB-Negative"];

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function PatientFamilyPage() {
  const { patientProfile, linkedProfiles, switchProfile } = usePatientSession();
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);

  const handleSwitch = async (profileId: string) => {
    if (profileId === patientProfile.id) return;
    setSwitchingId(profileId);
    try {
      await switchProfile(profileId);
    } catch {
      toast.error("Could not switch profile. Try again.");
      setSwitchingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1240px] px-7 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Family members</h1>
        <AddFamilyMemberDialog trigger={<Button size="sm"><Plus className="size-3.5" />Add member</Button>} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {linkedProfiles.map((profile) => {
          const isActive = profile.id === patientProfile.id;
          const age = ageFromDob(profile.date_of_birth);
          return (
            <Card key={profile.id} className={isActive ? "rounded-xl border-primary/30" : "rounded-xl"}>
              <CardContent className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <Avatar className="size-10">
                    <AvatarFallback className="text-sm font-semibold">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {isActive ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                      <Check className="size-3" />
                      Viewing
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={switchingId === profile.id}
                      onClick={() => handleSwitch(profile.id)}
                    >
                      {switchingId === profile.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      Switch
                    </Button>
                  )}
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold">{profile.full_name}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {age !== null ? `${age} yrs` : "Age not set"} · {profile.blood_group} · {profile.health_id}
                  </p>
                </div>
                <span
                  className={
                    profile.guardian_relation
                      ? "inline-flex w-fit items-center gap-1 rounded-md border border-info/30 bg-info/10 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-info uppercase"
                      : "inline-flex w-fit items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-success uppercase dark:border-success/30 dark:bg-success/10"
                  }
                >
                  {profile.guardian_relation ? `${profile.guardian_relation}'s dependent` : "Owner"}
                </span>
              </CardContent>
            </Card>
          );
        })}

        <Card className="flex items-center justify-center rounded-xl border-dashed py-8 text-center sm:col-span-1">
          <CardContent className="flex flex-col items-center gap-2">
            <Users className="size-7 text-muted-foreground/50" />
            <p className="text-[12.5px] font-medium">Add someone you care for</p>
            <p className="max-w-[200px] text-[11px] text-muted-foreground">
              Manage appointments and records for family members from one account.
            </p>
            <AddFamilyMemberDialog trigger={<Button size="sm" variant="secondary"><Plus className="size-3.5" />Add member</Button>} />
          </CardContent>
        </Card>
      </div>

      <p className="mt-5 text-[11.5px] text-muted-foreground">
        Every Healthcare Profile linked to your account shows here — click <span className="font-medium">Switch</span> to
        view that person&apos;s appointments and records.
      </p>
    </main>
  );
}

function AddFamilyMemberDialog({ trigger }: { trigger: React.ReactElement<{ children?: React.ReactNode }> }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [relation, setRelation] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [bloodGroup, setBloodGroup] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const reset = () => {
    setFullName("");
    setRelation("");
    setGender("");
    setDob("");
    setBloodGroup("");
    setPhone("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !relation) {
      toast.error("Full name and relation are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/patients/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          guardian_relation: relation,
          gender: gender || undefined,
          date_of_birth: dob || undefined,
          blood_group: bloodGroup || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Could not add family member");

      toast.success(`${fullName.trim()} added to your family`, {
        description: "Switch to their profile any time from this page.",
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not add family member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{trigger.props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a family member</DialogTitle>
          <DialogDescription>
            Creates a Healthcare Profile for them and links it to your account so you can manage their care.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fm-name">Full name</Label>
            <Input id="fm-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Kabir Sharma" required />
          </div>

          <div className="space-y-1.5">
            <Label>Relation to you</Label>
            <Select value={relation} onValueChange={(v) => setRelation(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>{relation || <span className="text-muted-foreground">Select</span>}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RELATIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="fm-dob">Date of birth</Label>
              <Input id="fm-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{gender || <span className="text-muted-foreground">Select</span>}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Blood group <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue>{bloodGroup || <span className="text-muted-foreground">Select if known</span>}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fm-phone">
              Mobile number <span className="font-normal text-muted-foreground">(optional — leave blank for a dependent with no phone of their own)</span>
            </Label>
            <Input id="fm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 98450 12210" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin" /> : "Add family member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
