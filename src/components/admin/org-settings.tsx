"use client";

// Organization Settings (Sprint 3 / OPS-001 §1, §9). Edits the organization's
// own profile — name, address, contact info, timezone — backed by
// GET/PATCH /api/organizations/[id]. Replaces the disabled "Settings · Soon"
// placeholder that had no backing route at all before this sprint.

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSidebar } from "@/components/admin/admin-nav";

interface OrgProfile {
  id: string;
  name: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
}

// The IANA zones relevant to Auriva's launch markets. Kept short and honest
// rather than shipping a 400-entry picker for an India-first product.
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export default function OrgSettings() {
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<OrgProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");

  const applyProfile = React.useCallback((p: OrgProfile) => {
    setProfile(p);
    setName(p.name ?? "");
    setAddress(p.address ?? "");
    setEmail(p.contactEmail ?? "");
    setPhone(p.contactPhone ?? "");
    setTimezone(p.timezone ?? "Asia/Kolkata");
  }, []);

  const load = React.useCallback(async () => {
    setError(null);
    const clinicsRes = await fetch("/api/clinics", { cache: "no-store" });
    if (!clinicsRes.ok) throw new Error("clinics");
    const clinics = await clinicsRes.json();
    if (!clinics.length) {
      setError("No organization is linked to this account.");
      return;
    }
    const id = clinics[0].organization_id;
    setOrgId(id);
    const res = await fetch(`/api/organizations/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("org");
    applyProfile(await res.json());
  }, [applyProfile]);

  React.useEffect(() => {
    load().catch(() => setError("Could not load organization settings."));
  }, [load]);

  const dirty =
    profile !== null &&
    (name.trim() !== (profile.name ?? "") ||
      address.trim() !== (profile.address ?? "") ||
      email.trim() !== (profile.contactEmail ?? "") ||
      phone.trim() !== (profile.contactPhone ?? "") ||
      timezone !== profile.timezone);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId) return;
    if (!name.trim()) {
      toast.error("Organization name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          contact_email: email.trim() || null,
          contact_phone: phone.trim() || null,
          timezone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Could not save settings");
      applyProfile(data);
      toast.success("Organization settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar active="settings" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">Organization Settings</h1>
            <p className="text-[11px] text-muted-foreground">
              Profile, contact details and default time zone
            </p>
          </div>
        </header>

        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load().catch(() => setError("Could not load organization settings."))}
            >
              <RefreshCw />
              Try again
            </Button>
          </div>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <form onSubmit={save} className="mx-auto max-w-2xl space-y-6">
              <section className="rounded-xl border bg-card">
                <header className="border-b px-5 py-4">
                  <h2 className="text-sm font-semibold">Organization profile</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Shown on invoices, prescriptions and staff invitations
                  </p>
                </header>
                <div className="space-y-4 p-5">
                  {profile === null ? (
                    <>
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-2/3" />
                    </>
                  ) : (
                    <>
                      <Field id="org-name" label="Organization name" required>
                        <Input
                          id="org-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </Field>
                      <Field id="org-address" label="Address">
                        <Input
                          id="org-address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="org-email" label="Contact email">
                          <Input
                            id="org-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </Field>
                        <Field id="org-phone" label="Contact phone">
                          <Input
                            id="org-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </Field>
                      </div>
                      <Field id="org-timezone" label="Time zone">
                        <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
                          <SelectTrigger id="org-timezone" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                {tz}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  )}
                </div>
              </section>

              <div className="flex items-center justify-end gap-3">
                {dirty && (
                  <span className="text-[11px] text-muted-foreground">Unsaved changes</span>
                )}
                <Button type="submit" disabled={!dirty || saving || profile === null}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </main>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
