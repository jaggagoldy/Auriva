"use client";

// Organization Setup / Activation (APS-030 Step 7-8, APS-031 Part 4/7):
// the real replacement for "signup produces a blank workspace." Every
// number here is a live query (src/services/onboarding-service.ts
// getActivationStatus) — never seeded or placeholder data.

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import InviteStaffDialog from "@/components/admin/invite-dialog";

interface ActivationStep {
  key: string;
  label: string;
  done: boolean;
}

interface Activation {
  steps: ActivationStep[];
  completed: number;
  total: number;
  nextStep: ActivationStep | null;
}

export default function SetupChecklist() {
  const [org, setOrg] = React.useState<{ id: string; name: string } | null>(null);
  const [clinics, setClinics] = React.useState<{ id: string; name: string }[]>([]);
  const [activation, setActivation] = React.useState<Activation | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/clinics", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const list = await res.json();
      if (!list.length) {
        setError("No organization is linked to this account.");
        return;
      }
      setOrg({ id: list[0].organization_id, name: list[0].name });
      setClinics(list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch {
      setError("Could not load your organization.");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!org) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/organizations/${org.id}/activation`, { cache: "no-store" });
      if (res.ok && !cancelled) setActivation(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [org]);

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar active="setup" />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold tracking-tight">
            {org ? `Get ${org.name} live` : <Skeleton className="h-6 w-48" />}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A few real things to do before your organization is fully activated. This checklist
            reflects what&apos;s actually true in your account — nothing here is pre-filled.
          </p>

          {!activation ? (
            <div className="mt-6 space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-4">
                <div className="relative flex size-11 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 40 40" className="size-11 -rotate-90">
                    <circle cx="20" cy="20" r="17" className="stroke-muted" strokeWidth="4" fill="none" />
                    <circle
                      cx="20"
                      cy="20"
                      r="17"
                      className="stroke-primary transition-all"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 17}
                      strokeDashoffset={2 * Math.PI * 17 * (1 - activation.completed / activation.total)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold tabular-nums">
                    {activation.completed}/{activation.total}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {activation.nextStep ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        What to do next
                      </p>
                      <p className="text-sm font-medium">{activation.nextStep.label}</p>
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                      <PartyPopper className="size-4" />
                      Organization fully activated
                    </p>
                  )}
                </div>
              </div>

              <ul className="mt-4 divide-y rounded-xl border bg-card">
                {activation.steps.map((step) => (
                  <li key={step.key} className="flex items-center gap-3 px-4 py-3">
                    {step.done ? (
                      <CheckCircle2 className="size-4.5 shrink-0 text-success" />
                    ) : (
                      <Circle className="size-4.5 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={step.done ? "text-sm" : "text-sm text-muted-foreground"}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between rounded-xl border bg-card p-4">
                <div>
                  <p className="text-sm font-medium">Invite your team</p>
                  <p className="text-xs text-muted-foreground">
                    Doctors and receptionists join by invitation only.
                  </p>
                </div>
                {org && clinics.length > 0 && (
                  <InviteStaffDialog
                    clinicName={clinics[0].name}
                    organizationId={org.id}
                    clinics={clinics}
                    defaultClinicId={clinics[0].id}
                    onInvited={() => load()}
                  />
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button nativeButton={false} render={<Link href="/admin/command-center" />}>
                  Go to Command Center
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
