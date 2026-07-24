"use client";

import * as React from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  IndianRupee,
  Info,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSidebar } from "@/components/admin/admin-nav";
import ServiceCatalogManager from "@/components/admin/service-catalog-manager";

interface OrgProfile {
  id: string;
  name: string;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
}

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export default function OrgSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"general" | "services" | "plan" | "permissions">("general");

  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<OrgProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");
  const [clinicPhoto, setClinicPhoto] = React.useState<string | null>(null);

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
    const cId = clinics[0].id;
    const id = clinics[0].organization_id;
    setClinicId(cId);
    setOrgId(id);
    const res = await fetch(`/api/organizations/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("org");
    applyProfile(await res.json());
  }, [applyProfile]);

  React.useEffect(() => {
    load().catch(() => setError("Could not load organization settings."));
  }, [load]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("aura_b2b_session");
      toast.success("Signed out successfully");
      router.replace("/login");
    } catch {
      toast.error("Could not sign out");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setClinicPhoto(url);
    toast.success("Clinic photo updated successfully!");
  };

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
            <h1 className="text-sm font-semibold">Practice Settings & Administration</h1>
            <p className="text-[11px] text-muted-foreground">
              Manage organization profile, branding, service catalog, active plan, and access control.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive border-destructive/30 hover:bg-destructive/10">
            <LogOut className="size-3.5 mr-1" /> Sign Out
          </Button>
        </header>

        {/* Navigation Tabs Header */}
        <div className="flex border-b bg-muted/20 px-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="size-3.5" /> Clinic Profile & Photos
          </button>

          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "services"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="size-3.5" /> Services & Pricing
          </button>

          <button
            onClick={() => setActiveTab("plan")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "plan"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="size-3.5" /> Plan & Subscription
          </button>

          <button
            onClick={() => setActiveTab("permissions")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
              activeTab === "permissions"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3.5" /> Role & Permissions Matrix
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={() => load()}>
                <RefreshCw className="size-3.5 mr-1" /> Try again
              </Button>
            </div>
          ) : (
            <>
              {/* TAB 1: GENERAL PROFILE & PHOTOS */}
              {activeTab === "general" && (
                <div className="max-w-3xl space-y-6">
                  {/* Clinic Photo & Branding */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Clinic Branding & Photo Gallery</CardTitle>
                      <CardDescription className="text-xs">
                        Upload your clinic logo and entrance picture to display on patient portals and printable receipts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-6">
                        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40">
                          {clinicPhoto ? (
                            <img src={clinicPhoto} alt="Clinic" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="size-8 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clinic-photo-upload" className="cursor-pointer inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
                            <Upload className="size-3.5" /> Upload New Picture
                          </Label>
                          <input
                            id="clinic-photo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            JPG, PNG or WEBP up to 5MB. Recommended resolution 800x600px.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* General Profile Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Organization Identity</CardTitle>
                      <CardDescription className="text-xs">
                        Update your practice address, email, phone, and timezone defaults.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={save} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="name">Organization Name</Label>
                          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="address">Clinic Address</Label>
                          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="email">Contact Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="phone">Contact Phone</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select value={timezone} onValueChange={(val) => val && setTimezone(val)}>
                            <SelectTrigger id="timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="pt-2">
                          <Button type="submit" size="sm" disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Save Changes
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 2: SERVICES & PRICING */}
              {activeTab === "services" && (
                <div>
                  {clinicId ? (
                    <ServiceCatalogManager clinicId={clinicId} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading clinic services...</p>
                  )}
                </div>
              )}

              {/* TAB 3: PLAN & SUBSCRIPTION */}
              {activeTab === "plan" && (
                <div className="max-w-3xl space-y-6">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
                          <Sparkles className="size-3" /> Current Active Plan
                        </span>
                        <CardTitle className="text-lg font-bold">Auriva Practice Operations — Professional Edition</CardTitle>
                        <CardDescription className="text-xs">
                          Full Practice Operations Excellence suite with multi-doctor queues and cashier checkout.
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-foreground">₹2,499<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                        <span className="text-[11px] text-emerald-600 font-medium">Active (Renews Aug 2026)</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-3 gap-4 rounded-xl border bg-card p-4 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">Staff Seats</div>
                          <div className="text-base font-bold">3 / 10 Used</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Branches</div>
                          <div className="text-base font-bold">2 Active</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Monthly Visits</div>
                          <div className="text-base font-bold">Unlimited</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Active Capabilities Included:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> 1-Click Patient Arrival Check-in
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> Emergency Priority Queue Bypass
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> Uninterrupted Consultation Charting
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> Structured Prescription PDF Generation
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> Cashier Checkout & Invoice Receipts
                          </div>
                          <div className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> Real-time Owner Operational Intelligence
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                          Need additional doctor seats or custom EHR integrations?
                        </p>
                        <Button size="sm" onClick={() => toast.info("Contacting Enterprise Support...")}>
                          Upgrade Plan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB 4: ROLES & PERMISSIONS MATRIX */}
              {activeTab === "permissions" && (
                <div className="max-w-4xl space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Role Access & Capabilities Matrix</CardTitle>
                      <CardDescription className="text-xs">
                        Overview of permissions granted to Practice Owners, Doctors, and Reception Staff.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b bg-muted/50 font-semibold">
                            <tr>
                              <th className="p-3">Platform Capability / Surface</th>
                              <th className="p-3">Practice Owner</th>
                              <th className="p-3">Attending Doctor</th>
                              <th className="p-3">Front-Desk Staff</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr>
                              <td className="p-3 font-medium">Owner Command Center & Revenue KPIs</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Allowed</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Queue Board & 1-Click Patient Check-in</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Allowed</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Allowed</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Primary Role</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Walk-in Registration & Emergency Bypass</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Allowed</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Allowed</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Primary Role</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Clinical Consultation Charting & Vitals</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Doctor Only</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Primary Role</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Structured Prescription Authoring & PDF</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Doctor Only</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Primary Role</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Cashier Checkout & Payment Receipts</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Allowed</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Primary Role</td>
                            </tr>
                            <tr>
                              <td className="p-3 font-medium">Service Catalog & Pricing Configuration</td>
                              <td className="p-3 text-emerald-600 font-semibold"><CheckCircle2 className="size-4 inline mr-1" /> Primary Role</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                              <td className="p-3 text-muted-foreground"><Lock className="size-3.5 inline mr-1" /> Restricted</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
