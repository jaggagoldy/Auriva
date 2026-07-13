"use client";

// BRD-043 Sprint 2 (US-201/202/203) — the solo clinic's Team section inside
// Settings. Phone-first invite flow with live duplicate-phone validation and
// a WhatsApp/copy-link share screen (ADR-003: no email/SMS is ever sent —
// the owner shares the link themselves). Faithful to the approved prototype
// design/mockups/brd-043-team-management.html (Invite step 1 → step 3).
//
// Sprint 4 (US-401) will grow this into the full member-card Team screen with
// suspend/archive; Sprint 2 delivers the invite loop + the pending list.

import * as React from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Loader2,
  MessageCircle,
  Stethoscope,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type InviteRole = "doctor" | "receptionist";
type PhoneState = "idle" | "checking" | "available" | "invited" | "active";
type Step = "list" | "form" | "ready";

interface PendingInvite {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  token: string;
}

function digits(v: string) {
  return v.replace(/\D/g, "");
}

export function TeamPanel({
  organizationId,
  clinicId,
  clinicName,
}: {
  organizationId: string;
  clinicId: string;
  clinicName: string;
}) {
  const [step, setStep] = React.useState<Step>("list");
  const [invites, setInvites] = React.useState<PendingInvite[] | null>(null);

  // form state
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<InviteRole>("doctor");
  const [specialty, setSpecialty] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [phoneState, setPhoneState] = React.useState<PhoneState>("idle");
  const [submitting, setSubmitting] = React.useState(false);

  // link-ready state
  const [joinUrl, setJoinUrl] = React.useState("");

  const loadInvites = React.useCallback(() => {
    fetch(`/api/organizations/${organizationId}/invitations`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setInvites(Array.isArray(data) ? data : []))
      .catch(() => setInvites([]));
  }, [organizationId]);

  React.useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  // US-202: live, debounced duplicate-phone check while typing. Every state
  // update happens inside the async debounce callback (not synchronously in
  // the effect body) so a keystroke schedules one check ~350ms after typing
  // stops, rather than one request per character.
  React.useEffect(() => {
    const handle = setTimeout(async () => {
      if (digits(phone).length < 7) {
        setPhoneState("idle");
        return;
      }
      setPhoneState("checking");
      try {
        const res = await fetch(
          `/api/organizations/${organizationId}/invitations/check?phone=${encodeURIComponent(phone.trim())}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setPhoneState(res.ok ? (data.status as PhoneState) : "available");
      } catch {
        setPhoneState("available");
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [phone, organizationId]);

  const resetForm = () => {
    setName("");
    setRole("doctor");
    setSpecialty("");
    setPhone("");
    setPhoneState("idle");
    setJoinUrl("");
  };

  const canSubmit =
    name.trim().length > 1 &&
    digits(phone).length >= 7 &&
    (phoneState === "available" || phoneState === "idle") &&
    !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinicId,
          full_name: name.trim(),
          role,
          phone: phone.trim(),
          specialty: role === "doctor" && specialty.trim() ? specialty.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not create the invite.");
      setJoinUrl(`${window.location.origin}/join/${data.token}`);
      setStep("ready");
      loadInvites();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the invite.");
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappHref = React.useMemo(() => {
    const msg = `You're invited to join ${clinicName} on Auriva as a ${role}. Set up your account here: ${joinUrl} (link valid for 72 hours).`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }, [clinicName, role, joinUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — select and copy the link manually.");
    }
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/invitations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Invitation revoked");
      loadInvites();
    } catch {
      toast.error("Could not revoke the invitation.");
    }
  };

  // ---- link-ready screen (US-203) ----
  if (step === "ready") {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Check className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold">Invite ready</div>
            <div className="text-xs text-muted-foreground">Link expires in 72 hours</div>
          </div>
        </div>

        <div className="break-all rounded-lg bg-muted px-3 py-2.5 font-mono text-xs text-foreground">
          {joinUrl}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonClass, "flex-1 bg-primary text-primary-foreground hover:bg-primary/80")}
          >
            <MessageCircle className="size-4" /> Share on WhatsApp
          </a>
          <button type="button" onClick={copyLink} className={cn(buttonClass, "flex-1 border")}>
            <Copy className="size-4" /> Copy link
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          No email or SMS is sent automatically — you share the link yourself, like Google Meet or
          Calendly.
        </p>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            resetForm();
            setStep("list");
          }}
        >
          <ArrowLeft className="size-4" /> Back to team
        </Button>
      </Card>
    );
  }

  // ---- invite form (US-201/202) ----
  if (step === "form") {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Invite a team member</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetForm();
              setStep("list");
            }}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Full name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Meera Iyer"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { key: "doctor", nm: "Doctor", mt: "Clinical care" },
                  { key: "receptionist", nm: "Receptionist", mt: "Front desk" },
                ] as const
              ).map((r) => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    role === r.key
                      ? "border-primary bg-primary/[0.04] ring-1 ring-primary/30"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="text-sm font-medium">{r.nm}</div>
                  <div className="text-xs text-muted-foreground">{r.mt}</div>
                </button>
              ))}
            </div>
          </div>

          {role === "doctor" && (
            <div className="space-y-1.5">
              <Label htmlFor="team-specialty">
                Specialty <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="team-specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Dermatologist"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="team-phone">Mobile number</Label>
            <Input
              id="team-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98450 12210"
              inputMode="tel"
            />
            <PhoneNote state={phoneState} />
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Generate invite link
          </Button>
        </form>
      </Card>
    );
  }

  // ---- list (default) ----
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Team</h2>
          <p className="text-xs text-muted-foreground">
            Invite a doctor or receptionist — your plan already includes room for both.
          </p>
        </div>
        <Button size="sm" onClick={() => setStep("form")}>
          <UserPlus className="size-4" /> Invite member
        </Button>
      </div>

      {invites === null ? (
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      ) : invites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Stethoscope className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No pending invites</p>
          <p className="text-xs text-muted-foreground">
            When you invite someone, their pending invite shows here until they join.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{inv.full_name}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600">
                    <Clock className="size-3" /> Pending
                  </span>
                  <span className="capitalize">{inv.role}</span>
                  {inv.phone ? <span>· {inv.phone}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/join/${inv.token}`);
                      toast.success("Link copied");
                    } catch {
                      toast.error("Could not copy the link.");
                    }
                  }}
                >
                  <Copy className="size-4" /> Link
                </Button>
                <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}>
                  <X className="size-4" /> Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

function PhoneNote({ state }: { state: PhoneState }) {
  if (state === "idle") return null;
  if (state === "checking") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Checking…
      </p>
    );
  }
  if (state === "active") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
        <X className="size-3.5" /> Already active — this person is already on your team
      </p>
    );
  }
  if (state === "invited") {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
        <Clock className="size-3.5" /> Already invited — a pending invite exists for this number
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
      <Check className="size-3.5" /> Available
    </p>
  );
}
