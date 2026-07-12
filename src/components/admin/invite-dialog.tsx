"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PendingInvite, ROLE_META } from "@/shared/workspace";

type InviteRole = PendingInvite["role"];

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function InviteStaffDialog({
  clinicName,
  organizationId,
  clinics,
  defaultClinicId,
  onInvited,
}: {
  clinicName: string;
  organizationId: string;
  /** Sprint 3: which branch within the org this invite assigns the staff member to — a picker only appears when there's more than one. */
  clinics: { id: string; name: string }[];
  defaultClinicId: string;
  onInvited: (joinUrl: string, fullName: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<InviteRole | null>(null);
  const [specialty, setSpecialty] = React.useState("");
  const [clinicId, setClinicId] = React.useState(defaultClinicId);
  const [saving, setSaving] = React.useState(false);

  const valid =
    fullName.trim().length > 1 && EMAIL_PATTERN.test(email) && role !== null && clinicId !== "";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFullName("");
      setEmail("");
      setRole(null);
      setSpecialty("");
      setClinicId(defaultClinicId);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || !role) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          specialty: role === "doctor" && specialty.trim() ? specialty.trim() : null,
          clinic_id: clinicId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not send invitation");
      const joinUrl = `${window.location.origin}/join/${data.token}`;
      onInvited(joinUrl, fullName.trim());
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invitation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlus />
        Invite New Staff
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite new staff</DialogTitle>
          <DialogDescription>
            Send an invitation to join <strong>{clinicName}</strong>. They’ll
            get access matching the role you assign.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Priya Nair"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@clinic.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as InviteRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {role ? (
                    ROLE_META[role].label
                  ) : (
                    <span className="text-muted-foreground">Select a role</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "doctor" && (
            <div className="space-y-1.5">
              <Label htmlFor="invite-specialty">Specialty</Label>
              <Input
                id="invite-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Cardiologist"
              />
            </div>
          )}

          {clinics.length > 1 && (
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={clinicId} onValueChange={(value) => setClinicId(value as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {clinics.find((c) => c.id === clinicId)?.name ?? <span className="text-muted-foreground">Select a branch</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={!valid || saving}>
              <UserPlus />
              {saving ? "Sending…" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
