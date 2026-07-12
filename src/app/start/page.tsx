"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Clock,
  Copy,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// Milestone 1 Batch 3: Quick Setup — the solo owner's first two minutes.
// Mobile-first, four steps, one primary action per screen, optimized for First
// Value Time. Backs onto POST/PATCH /api/onboarding/quick-setup and the real
// OTP send endpoint. Everything optional is deferred to the in-product guided
// checklist (Batch 4) — this screen only asks what booking a patient requires.

type Step = "account" | "verify" | "clinic" | "hours" | "celebrate";
const FLOW: Step[] = ["account", "verify", "clinic", "hours"];

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];
const OPEN_TIMES = ["07:00", "08:00", "09:00", "10:00", "11:00"];
const CLOSE_TIMES = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const SPECIALTIES = [
  "Physiotherapy",
  "General Practice",
  "Dentistry",
  "Dermatology",
  "Nutrition & Diet",
  "Pediatrics",
  "Other",
];

function fmtTime(t: string) {
  return new Date(`2000-01-01T${t}:00`).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function QuickSetupPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("account");
  const [busy, setBusy] = React.useState(false);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);

  // form
  const [ownerName, setOwnerName] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [clinicName, setClinicName] = React.useState("");
  const [specialty, setSpecialty] = React.useState("");
  const [days, setDays] = React.useState<Record<string, boolean>>({
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false,
  });
  const [opensAt, setOpensAt] = React.useState("09:00");
  const [closesAt, setClosesAt] = React.useState("18:00");

  // result
  const [bookingPath, setBookingPath] = React.useState<string | null>(null);
  const bookingUrl = bookingPath
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${bookingPath}`
    : "";

  const stepIndex = FLOW.indexOf(step);

  // ---- account-step validation (visible inline, not just toasts) ----
  const phoneDigits = mobile.replace(/\D/g, "");
  const nameErr = ownerName.trim().length < 2 ? "Please enter your name." : "";
  const phoneErr =
    phoneDigits.length < 10 || phoneDigits.length > 13
      ? "Enter a valid mobile number (10 digits)."
      : "";
  const pwErr = password.length < 8 ? "Use at least 8 characters." : "";
  const pwStrength =
    password.length === 0
      ? null
      : password.length >= 10 && /\d/.test(password) && /[A-Za-z]/.test(password)
        ? { label: "Strong", cls: "text-success", w: "100%" }
        : password.length >= 8
          ? { label: "OK", cls: "text-warning", w: "66%" }
          : { label: "Too short", cls: "text-destructive", w: "33%" };

  async function sendOtp(): Promise<boolean> {
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: mobile }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message ?? "Could not send the code. Check the number and try again.");
      return false;
    }
    // Non-production echoes the code (no SMS provider) — prefill it so a
    // pilot/demo never has to hunt for it.
    if (typeof data.otp === "string") {
      setCode(data.otp);
      toast.message(`Verification code: ${data.otp}`, { description: "Dev mode — autofilled for you." });
    } else {
      toast.success("We sent a 6-digit code to your mobile.");
    }
    return true;
  }

  async function handleAccount() {
    setSubmitAttempted(true);
    if (nameErr || phoneErr || pwErr) return; // errors render inline under each field
    setBusy(true);
    try {
      if (await sendOtp()) setStep("verify");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (code.replace(/\D/g, "").length !== 6) return toast.error("Enter the 6-digit code.");
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/quick-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_name: ownerName, mobile, password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "That code didn't work. Request a new one.");
        return;
      }
      setStep("clinic");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (clinicName.trim().length < 2) return toast.error("Please name your clinic.");
    const workingDays = Object.keys(days).filter((d) => days[d]);
    if (workingDays.length === 0) return toast.error("Choose at least one working day.");
    if (opensAt >= closesAt) return toast.error("Opening time must be before closing time.");
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/quick-setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_name: clinicName,
          specialty: specialty || null,
          working_days: workingDays,
          opens_at: opensAt,
          closes_at: closesAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Could not finish setup. Please try again.");
        return;
      }
      setBookingPath(data.booking_path);
      setStep("celebrate");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(bookingUrl).then(
      () => toast.success("Booking link copied"),
      () => toast.error("Couldn't copy — select and copy manually.")
    );
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <OnboardingBrand />
      <div className="flex items-start justify-center bg-background px-4 py-10 md:items-center">
      <Toaster position="top-center" />
      <div className="w-full max-w-lg">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <span className="text-sm font-semibold">Auriva</span>
          {step !== "celebrate" && (
            <div className="ml-auto flex w-40 gap-1">
              {FLOW.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i <= stepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {step === "account" && (
          <Card className="space-y-4 p-6">
            <div>
              <div className="mb-1 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                ⚡ Set up in under 2 minutes
              </div>
              <h1 className="text-xl font-semibold">Let&apos;s get your clinic ready</h1>
              <p className="text-sm text-muted-foreground">
                Your mobile number is your username — no email needed.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner">Your name</Label>
              <Input
                id="owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Dr. Anaya Rao"
                autoComplete="name"
                aria-invalid={submitAttempted && !!nameErr}
              />
              {submitAttempted && nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 18))}
                placeholder="+91 98450 12345"
                inputMode="tel"
                type="tel"
                autoComplete="tel"
                aria-invalid={submitAttempted && !!phoneErr}
              />
              {submitAttempted && phoneErr ? (
                <p className="text-xs text-destructive">{phoneErr}</p>
              ) : (
                <p className="text-xs text-muted-foreground">This becomes your login — no email needed.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Create password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={submitAttempted && !!pwErr}
              />
              {pwStrength && (
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${pwStrength.label === "Strong" ? "bg-success" : pwStrength.label === "OK" ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: pwStrength.w }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${pwStrength.cls}`}>{pwStrength.label}</span>
                </div>
              )}
              {submitAttempted && pwErr && <p className="text-xs text-destructive">{pwErr}</p>}
            </div>
            <Button className="w-full" disabled={busy} onClick={handleAccount}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </Card>
        )}

        {step === "verify" && (
          <Card className="space-y-4 p-6">
            <div>
              <h1 className="text-xl font-semibold">Verify your mobile</h1>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent to {mobile}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="text-center text-lg tracking-[0.4em]"
              />
            </div>
            <Button className="w-full" disabled={busy} onClick={handleVerify}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Verify &amp; continue
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button className="hover:text-foreground" onClick={sendOtp} disabled={busy}>
                Resend code
              </button>
              <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setStep("account")}>
                <ArrowLeft className="size-3" /> Change number
              </button>
            </div>
          </Card>
        )}

        {step === "clinic" && (
          <Card className="space-y-4 p-6">
            <div>
              <h1 className="text-xl font-semibold">Name your clinic</h1>
              <p className="text-sm text-muted-foreground">
                This is all patients need to find and book you. Everything else can wait.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clinic">Clinic name</Label>
              <Input id="clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Rao Physiotherapy & Rehab" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spec">What do you do? (optional)</Label>
              <select
                id="spec"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Your public booking page is created automatically.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep("verify")}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button className="flex-1" onClick={() => (clinicName.trim().length < 2 ? toast.error("Please name your clinic.") : setStep("hours"))}>
                Continue <ArrowRight className="size-4" />
              </Button>
            </div>
          </Card>
        )}

        {step === "hours" && (
          <Card className="space-y-4 p-6">
            <div>
              <h1 className="text-xl font-semibold">When are you open?</h1>
              <p className="text-sm text-muted-foreground">
                Patients can only book during these hours. Fine-tune it any time.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDays((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                    className={cn(
                      "h-9 w-11 rounded-lg border text-xs font-semibold transition-colors",
                      days[d.key]
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="opens">Opens at</Label>
                <select
                  id="opens"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {OPEN_TIMES.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closes">Closes at</Label>
                <select
                  id="closes"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {CLOSE_TIMES.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep("clinic")}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button className="flex-1" disabled={busy} onClick={handleCreate}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Create my clinic
              </Button>
            </div>
          </Card>
        )}

        {step === "celebrate" && (
          <Card className="space-y-4 p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PartyPopper className="size-7" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Congratulations — {clinicName} is ready</h1>
              <p className="text-sm text-muted-foreground">
                Your booking page is live. Patients can find and book you right now.
              </p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Next step</div>
              <div className="mt-0.5 text-sm font-medium">Book your first patient</div>
              <div className="text-xs text-muted-foreground">Estimated time: less than 2 minutes</div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2.5">
              <span className="flex-1 truncate text-left text-xs font-medium text-primary">{bookingUrl}</span>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => bookingPath && window.open(bookingPath, "_blank")}>
                <CalendarCheck className="size-4" /> Book first patient
              </Button>
              <Button variant="outline" onClick={() => router.push("/clinic")}>
                Continue setup <ArrowRight className="size-4" />
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> Add treatments, your logo and profile any time from My Clinic.
            </p>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}

function OnboardingBrand() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0B4A41] p-12 text-white md:flex md:flex-col md:justify-between">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 size-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(232,162,76,.18), transparent 62%)" }}
      />
      <div className="relative flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-white/15">
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="#fff"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 12h3l2-6 4 12 2-6h4" />
          </svg>
        </span>
        <span className="font-heading text-lg font-bold">Auriva</span>
      </div>

      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "#E8A24C" }}>
          Set up your practice
        </p>
        <h2 className="mt-4 font-heading text-3xl font-bold leading-tight">
          Your first <span style={{ color: "#E8A24C" }}>successful day.</span>
        </h2>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#DCEAE5]">
          Four quick steps and you&apos;re taking bookings. It&apos;s just you — no staff to add, no
          roles to manage. You can refine everything later.
        </p>
        <div className="mt-8 flex max-w-sm items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl"
            style={{ background: "#E8A24C", color: "#3B2708" }}
          >
            <Check className="size-5" />
          </span>
          <div>
            <div className="font-heading text-sm font-bold">Live in under 5 minutes</div>
            <div className="text-xs text-[#C7DBD4]">No IT team required</div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2 text-xs font-medium text-[#C7DBD4]">
        <Check className="size-4" style={{ color: "#E8A24C" }} /> Free forever · change anything later
      </div>
    </aside>
  );
}
