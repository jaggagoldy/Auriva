"use client";

// APS-044 / WF-25: self-serve organization creation. Creates the org + owner
// account, opens an owner session, and lands them in the admin workspace.
//
// Sprint 3 (OPS-001) follow-up: a real "what kind of organization are you?"
// step now precedes the org-detail form. The choice only ever seeds sensible
// starting defaults for the first clinic (hours, slot length, walk-in policy)
// — it is a config-path selector, never a fork; every setting stays editable
// afterward in Clinic Settings, and every module stays activatable for any
// archetype (presets are starting points, not tiers).

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  FlaskConical,
  Hospital,
  HeartPulse,
  Loader2,
  Pill,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ORG_ARCHETYPES, type OrgArchetype } from "@/domain/organization";

const ARCHETYPE_ICONS: Record<OrgArchetype, React.ComponentType<{ className?: string }>> = {
  independent_clinic: Stethoscope,
  multi_specialty: Building2,
  hospital: Hospital,
  diagnostic_center: FlaskConical,
  pharmacy_chain: Pill,
  day_care: HeartPulse,
};

// Solo Practice Edition (frozen MVP scope — see docs/founder-mvp-audit.md §4):
// independent clinics ship now; every other organization type is "Coming
// Soon" — the architecture already supports them ("zero forks"), they are
// deliberately not exposed as active choices until their edition ships, so a
// self-serve visitor is never funnelled into an onboarding path that isn't
// ready. Widen this set as each edition launches; nothing else changes.
const AVAILABLE_ARCHETYPES: readonly OrgArchetype[] = ["independent_clinic"];

export default function RegisterOrganizationPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"archetype" | "details">("archetype");
  const [archetype, setArchetype] = React.useState<OrgArchetype | null>(null);

  const [orgName, setOrgName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const valid =
    orgName.trim() && address.trim() && ownerName.trim() && email.trim() && password.length >= 8;

  const selectedMeta = archetype ? ORG_ARCHETYPES.find((a) => a.id === archetype) : null;

  const chooseArchetype = (id: OrgArchetype) => {
    // Independent Clinic IS the Solo Practice edition — route straight into
    // the mobile-first Quick Setup (/start → phone OTP → live clinic in
    // ~2 min, landing in the /clinic solo workspace), not the enterprise
    // org-creation form below. The other archetypes are Coming Soon and
    // never reach here (see AVAILABLE_ARCHETYPES). The details-form flow
    // below is retained, unexposed, for when the multi-org editions ship.
    if (id === "independent_clinic") {
      router.push("/start");
      return;
    }
    setArchetype(id);
    setStep("details");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Fill every field; password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: orgName,
          address,
          owner_name: ownerName,
          owner_email: email,
          password,
          archetype,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not create organization");
      toast.success(`${data.organization.name} is live`);
      // APS-031 Part 4/7 — land in the real Setup/Activation checklist
      // instead of a blank workspace (APS-030 §1.6/§7).
      router.push("/admin/setup");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4 py-10">
      <Toaster position="bottom-right" />
      <div className={cn("w-full rounded-2xl border bg-card p-8 shadow-sm", step === "archetype" ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Auriva</div>
            <div className="text-[11px] text-muted-foreground">Create your organization</div>
          </div>
        </div>

        {step === "archetype" ? (
          <>
            <h1 className="text-lg font-semibold tracking-tight">What kind of organization are you?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Auriva is starting with independent clinics — more organization types are coming soon.
              You can change every setting later.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ORG_ARCHETYPES.map((a) => {
                const Icon = ARCHETYPE_ICONS[a.id];
                const available = AVAILABLE_ARCHETYPES.includes(a.id);

                if (!available) {
                  return (
                    <div
                      key={a.id}
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-start gap-3 rounded-xl border bg-muted/30 p-4 text-left opacity-60"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{a.label}</span>
                          <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Coming soon
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => chooseArchetype(a.id)}
                    className="flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep("archetype")}
              className="mb-3 -ml-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Change organization type
            </button>

            {selectedMeta && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {React.createElement(ARCHETYPE_ICONS[selectedMeta.id], { className: "size-4" })}
                </div>
                <div className="text-sm font-medium">{selectedMeta.label}</div>
              </div>
            )}

            <h1 className="text-lg font-semibold tracking-tight">Set up your organization</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll be the owner. Invite your doctors and reception team once you&apos;re in.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Organization name" htmlFor="org-name">
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Sunrise Family Clinic"
                  autoFocus
                />
              </Field>
              <Field label="Address" htmlFor="org-address">
                <Input
                  id="org-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="HSR Layout, Bengaluru"
                />
              </Field>
              <Field label="Your name" htmlFor="owner-name">
                <Input
                  id="owner-name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Dr. Meera Nair"
                />
              </Field>
              <Field label="Email" htmlFor="owner-email">
                <Input
                  id="owner-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                />
              </Field>
              <Field label="Password" htmlFor="owner-password" hint="At least 8 characters">
                <Input
                  id="owner-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>

              <Button type="submit" className="w-full" disabled={loading || !valid}>
                {loading ? <Loader2 className="animate-spin" /> : <Building2 />}
                Create organization
                {!loading && <ArrowRight />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
