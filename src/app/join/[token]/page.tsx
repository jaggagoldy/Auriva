"use client";

// APS-044 / WF-23-24: invitation acceptance. The invitee sets a password;
// their account + staff profile + membership are created and they land in
// their role's workspace. Public route (token-gated).

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { defaultWorkspacePathForRole } from "@/domain/authorization";

interface InvitationView {
  email: string | null;
  phone: string | null;
  full_name: string;
  role: string;
  specialty: string | null;
  status: string;
  organization: { id: string; name: string; address: string };
}

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const [invitation, setInvitation] = React.useState<InvitationView | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/invitations/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(data.message ?? "This invitation link is invalid.");
        return;
      }
      if (data.status !== "pending") {
        setLoadError("This invitation has already been used or revoked.");
        return;
      }
      setInvitation(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not accept invitation");
      toast.success(`Welcome to ${invitation?.organization.name}`);
      router.push(defaultWorkspacePathForRole(data.user.role) ?? "/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invitation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Toaster position="bottom-right" />
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Auriva</div>
            <div className="text-[11px] text-muted-foreground">Accept your invitation</div>
          </div>
        </div>

        {loadError ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium">{loadError}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask your organization owner to send a fresh invite.
            </p>
          </div>
        ) : !invitation ? (
          <div className="space-y-3 py-6">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-primary" />
                {invitation.organization.name}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {invitation.full_name} · joining as{" "}
                <span className="font-medium capitalize">{invitation.role}</span>
                {invitation.specialty ? ` · ${invitation.specialty}` : ""}
              </p>
              {invitation.phone || invitation.email ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {invitation.phone ?? invitation.email}
                </p>
              ) : null}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="join-password">Set a password</Label>
                  <span className="text-[11px] text-muted-foreground">At least 8 characters</span>
                </div>
                <Input
                  id="join-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving || password.length < 8}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Join {invitation.organization.name}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
