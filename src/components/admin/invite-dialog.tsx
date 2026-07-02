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
import { PendingInvite, ROLE_META } from "@/lib/workspace";

type InviteRole = PendingInvite["role"];

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function InviteStaffDialog({
  clinicName,
  onInvite,
}: {
  clinicName: string;
  onInvite: (invite: PendingInvite) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<InviteRole | null>(null);
  const [specialty, setSpecialty] = React.useState("");

  const valid =
    fullName.trim().length > 1 && EMAIL_PATTERN.test(email) && role !== null;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFullName("");
      setEmail("");
      setRole(null);
      setSpecialty("");
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || !role) return;
    onInvite({
      id: crypto.randomUUID(),
      full_name: fullName.trim(),
      email: email.trim(),
      role,
      specialty: role === "doctor" && specialty.trim() ? specialty.trim() : null,
      invited_at: new Date().toISOString(),
    });
    toast.success(`Invitation sent to ${fullName.trim()}`, {
      description:
        "Stored locally — it will sync once the staff invite API is live.",
    });
    setOpen(false);
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

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={!valid}>
              <UserPlus />
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
