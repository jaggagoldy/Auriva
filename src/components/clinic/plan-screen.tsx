"use client";

// BRD-043 Sprint 5 (US-502/504) — the Plan screen. Three-card roadmap
// (Solo / Professional / Enterprise) faithful to the approved prototype.
//
// ADR-004, frozen and load-bearing here:
//   - The plan is READ-ONLY from the clinic. "Request upgrade" records a
//     request; it does NOT change the plan (the server enforces that too).
//   - The Enterprise card is genuinely INERT — roadmap communication only.
//     Its button has NO click handler at all (not a disabled handler
//     underneath), no API, no partial implementation.

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanData {
  plan: string;
  plan_label: string;
  seats_used: number;
  seats_max: number | null;
}

export function PlanScreen() {
  const [data, setData] = React.useState<PlanData | null>(null);
  const [requesting, setRequesting] = React.useState(false);
  const [requested, setRequested] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/clinic/plan", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  async function requestUpgrade() {
    setRequesting(true);
    try {
      const res = await fetch("/api/clinic/plan/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_plan: "professional" }),
      });
      if (!res.ok) throw new Error("Could not send your request");
      setRequested(true);
      toast.success("Upgrade requested");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your request");
    } finally {
      setRequesting(false);
    }
  }

  const isSolo = data?.plan === "solo";
  const isPro = data?.plan === "professional";

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Settings · Plan</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Your plan</h1>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Solo */}
        <PlanCard
          name="Solo"
          tagline={isSolo ? "Current plan" : "Independent practice"}
          current={isSolo}
          features={["1 Owner (may also be the Doctor)", "1 additional Doctor", "1 Receptionist", "Free forever"]}
        />
        {/* Professional */}
        <PlanCard
          name="Professional"
          tagline={isPro ? "Current plan" : "Grow your team"}
          current={isPro}
          features={["Up to 5 Doctors", "Up to 15 total team members", "Same clinic, same data — no migration"]}
          action={
            isPro ? null : requested ? (
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                <Check className="size-4" /> Requested
              </div>
            ) : (
              <Button className="mt-4 w-full" onClick={requestUpgrade} disabled={requesting}>
                {requesting ? <Loader2 className="size-4 animate-spin" /> : null} Request upgrade
              </Button>
            )
          }
        />
        {/* Enterprise — genuinely inert (no handler, no API) */}
        <PlanCard
          name="Enterprise"
          tagline="Coming soon"
          disabled
          features={["Multi-clinic", "Branches", "Advanced roles"]}
          action={
            <button
              type="button"
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground opacity-60"
            >
              Not available yet
            </button>
          }
        />
      </div>

      <p className="max-w-2xl text-[11px] text-muted-foreground">
        Plan changes are applied by Auriva after your request — this isn&apos;t self-service payment yet.
        Enterprise is roadmap communication only, with no functionality behind it.
      </p>

      {requested && (
        <Card className="flex items-center gap-3 p-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Check className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold">Upgrade requested</div>
            <div className="text-xs text-muted-foreground">
              Auriva will confirm within 1 business day. Your team and data stay exactly as they are.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function PlanCard({
  name,
  tagline,
  features,
  current,
  disabled,
  action,
}: {
  name: string;
  tagline: string;
  features: string[];
  current?: boolean;
  disabled?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col p-4",
        current && "border-primary/40 ring-1 ring-primary/20",
        disabled && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-base font-extrabold">{name}</div>
          <div className="text-xs text-muted-foreground">{tagline}</div>
        </div>
        {current && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Active</span>
        )}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto">{action}</div>
    </Card>
  );
}
