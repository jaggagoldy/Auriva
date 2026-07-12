"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    <div>
      <div className="sticky top-0 z-20 bg-background/90 px-5 pt-5 pb-3 backdrop-blur">
        <h1 className="font-heading text-[21px] font-bold">Family health</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Manage appointments and records for the people you care for.</p>
      </div>

      <div className="px-5 pt-1 pb-6">
        <div className="space-y-2.5">
          {linkedProfiles.map((profile) => {
            const isActive = profile.id === patientProfile.id;
            const age = ageFromDob(profile.date_of_birth);
            const rel = profile.guardian_relation
              ? `${profile.guardian_relation}${age !== null ? ` · ${age}` : ""}`
              : age !== null
                ? `${age} · ${profile.gender ?? ""}`.replace(/ · $/, "")
                : profile.blood_group;
            return (
              <div key={profile.id} className="flex items-center gap-3 rounded-[15px] border bg-card p-3.5">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-[13px] font-heading text-[15px] font-bold",
                    isActive ? "bg-honey-soft text-honey-deep" : "bg-accent text-accent-foreground"
                  )}
                >
                  {getInitials(profile.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-heading text-[15px] font-bold">
                    {profile.full_name}
                    {isActive && (
                      <span className="rounded-full bg-honey-soft px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-honey-deep uppercase">
                        You
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12.5px] text-muted-foreground">{rel}</p>
                </div>
                {isActive ? (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-honey-deep">
                    <Check className="size-4" /> Viewing
                  </span>
                ) : (
                  <button
                    onClick={() => handleSwitch(profile.id)}
                    disabled={switchingId === profile.id}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border bg-card px-3.5 text-[13px] font-semibold transition hover:bg-muted disabled:opacity-60"
                  >
                    {switchingId === profile.id && <Loader2 className="size-3.5 animate-spin" />}
                    Manage
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <AddFamilyMemberDialog
          trigger={
            <button className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] border bg-card font-heading text-[15px] font-semibold transition hover:bg-muted">
              <Plus className="size-4" /> Add a family member
            </button>
          }
        />

        <div className="mt-4 flex items-start gap-2.5 rounded-[12px] border border-honey-soft bg-honey-tint px-3.5 py-3 text-[12px] text-honey-deep">
          <Users className="mt-0.5 size-4 shrink-0" />
          <span>Each person&apos;s records are private. You manage them, they stay theirs.</span>
        </div>
      </div>
    </div>
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add family member");
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
