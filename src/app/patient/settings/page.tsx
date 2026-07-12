"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Globe, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePatientSession } from "@/components/patient/patient-session";

const STILL_COMING_SOON = [
  { icon: Bell, title: "Notifications", body: "Appointment reminders, report alerts and refill reminders." },
  { icon: Globe, title: "Language & region", body: "Choose the language Auriva speaks to you in." },
];

interface SessionRow {
  id: string;
  created_at: string;
  expires_at: string;
  isCurrent: boolean;
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatSignedInSince(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return relativeTime.format(-hours, "hour");
  return relativeTime.format(-Math.round(hours / 24), "day");
}

export default function PatientSettingsPage() {
  const router = useRouter();
  const { patientProfile, user } = usePatientSession();
  const [sessions, setSessions] = React.useState<SessionRow[] | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/patients/sessions", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/patients/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to sign out that session");
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== sessionId) : prev));
      toast.success("Signed out of that session");
    } catch (err: any) {
      toast.error(err.message || "Could not sign out that session");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-7 py-7">
      <h1 className="mb-1 text-lg font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Signed in as {patientProfile.full_name} · {user.phone_number}
      </p>

      <div className="flex flex-col gap-2.5">
        <Card className="rounded-xl">
          <CardContent>
            <div className="flex items-center gap-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Shield className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">Sign-in & security</p>
                <p className="text-[11.5px] text-muted-foreground">Where your account is currently signed in.</p>
              </div>
            </div>

            <div className="mt-3.5 divide-y border-t">
              {sessions === null ? (
                <div className="space-y-2 py-3">
                  <div className="h-9 animate-pulse rounded-lg bg-muted/60" />
                  <div className="h-9 animate-pulse rounded-lg bg-muted/60" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="py-3 text-[12px] text-muted-foreground">No active sessions found.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium">
                        {s.isCurrent ? "This device" : "Another device"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Signed in {formatSignedInSince(s.created_at)}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revokingId === s.id}
                        onClick={() => handleRevoke(s.id)}
                      >
                        {revokingId === s.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Sign out
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {STILL_COMING_SOON.map((s) => (
          <Card key={s.title} className="rounded-xl">
            <CardContent className="flex items-center gap-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <s.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{s.title}</p>
                <p className="text-[11.5px] text-muted-foreground">{s.body}</p>
              </div>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Coming soon
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div>
          <p className="text-[13px] font-medium">Log out</p>
          <p className="text-[11.5px] text-muted-foreground">End your session on this device.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
          <LogOut />
          Log out
        </Button>
      </div>
    </main>
  );
}
