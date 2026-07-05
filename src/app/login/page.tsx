'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Stethoscope,
  HeartPulse,
  Phone,
  Lock,
  Mail,
  ArrowLeft,
  ArrowRight,
  Heart,
  Loader2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { defaultWorkspacePathForRole } from '@/domain/authorization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

// APS-031 Part 3 — the four-role picker (Patient/Superadmin/Doctor/Staff) is
// replaced by the approved three-path Entry Experience. The role a staff
// member picked here was always UI-only (the server derives role from the
// account, see handleB2BLogin below) — collapsing three staff role cards
// into one "Healthcare Professional" path changes no real behavior.
type EntryPath = 'professional' | 'personal';

export default function UnifiedLoginGateway() {
  const router = useRouter();

  // Navigation & Step states
  const [step, setStep] = useState<'role' | 'auth' | 'otp' | 'profile-select' | 'onboarding'>('role');
  const [entryPath, setEntryPath] = useState<EntryPath | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('+15550199999');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // seed mock password

  // AUTH-004 onboarding — held until the profile is completed, then persisted.
  const [pendingSession, setPendingSession] = useState<{ patientProfile: any; user: any } | null>(null);
  const [onboardName, setOnboardName] = useState('');
  const [onboardDob, setOnboardDob] = useState('');
  const [onboardGender, setOnboardGender] = useState('');
  const [onboardBloodGroup, setOnboardBloodGroup] = useState('');

  // APS-029/010 Sprint 1 — a phone number may resolve to more than one
  // Healthcare Profile (family sharing a number). The picker below is the
  // Rajesh/Priya/Aarav screen from the brief.
  const [profileChoices, setProfileChoices] = useState<
    Array<{ id: string; health_id: string; full_name: string; gender: string | null; date_of_birth: string | null; guardian_relation: string | null }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState<string | null>(null);

  const handleEntrySelect = (path: EntryPath) => {
    setEntryPath(path);
    setShowForgotHelp(false);
    setStep('auth');
    if (path === 'professional') {
      // Prefill a seeded demo email for testing convenience — the server
      // derives the actual role from the account, not from this path choice.
      setEmail('admin@aegiscare.com');
    }
  };

  const handlePatientSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP delivery failed');

      setMockOtp(data.otp);
      setStep('otp');
      toast.success('Security code sent (Simulated)', {
        description: 'See the verification panel for your code.'
      });
    } catch (err) {
      toast.error(errorMessage(err) ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const submitOtpVerify = async (healthcareProfileId?: string) => {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: phoneNumber,
        code: otpCode,
        healthcare_profile_id: healthcareProfileId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid code');
    return data;
  };

  const finishLogin = (data: { patientProfile: { onboarding_completed: boolean; full_name: string }; user: unknown }) => {
    if (!data.patientProfile.onboarding_completed) {
      // First-ever sign-in: collect the real profile (AUTH-004) before
      // landing in the app — no more silent "Test Patient" placeholder.
      setPendingSession({ patientProfile: data.patientProfile, user: data.user });
      setStep('onboarding');
      return;
    }
    toast.success(`Welcome back, ${data.patientProfile.full_name}!`);
    // The session cookie is already set server-side by /api/auth/otp/verify
    // — no client-side storage of identity anymore (APS-029/010 Sprint 1).
    router.push('/patient');
  };

  const handlePatientVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const data = await submitOtpVerify();

      if (data.requires_profile_selection) {
        // This phone number is shared by more than one Healthcare Profile —
        // never auto-pick between people (APS-029 Part I A1/A9).
        setProfileChoices(data.profiles);
        setStep('profile-select');
        return;
      }

      finishLogin(data);
    } catch (err) {
      toast.error(errorMessage(err) ?? 'Verification failed. Try 123456.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (profileId: string) => {
    setLoading(true);
    try {
      const data = await submitOtpVerify(profileId);
      finishLogin(data);
    } catch (err) {
      toast.error(errorMessage(err) ?? 'Could not sign in as that profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSession) return;
    if (!onboardName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${pendingSession.patientProfile.id}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: onboardName,
          blood_group: onboardBloodGroup || undefined,
          date_of_birth: onboardDob || undefined,
          gender: onboardGender || undefined,
        })
      });

      const updatedProfile = await res.json();
      if (!res.ok) throw new Error(updatedProfile.message || 'Could not save your profile');

      toast.success(`Welcome to Auriva, ${updatedProfile.full_name}!`);
      router.push('/patient');
    } catch (err) {
      toast.error(errorMessage(err) ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleB2BLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // APS-040: credentialed login — the server derives the role from the
        // account; the role picked on the previous step is UI-only.
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      toast.success(`Authenticated successfully as ${data.user.role}`);
      localStorage.setItem('aura_b2b_session', JSON.stringify({
        user: data.user,
        profile: data.staffProfile
      }));

      // Redirect based on the server-confirmed role (map centralized in
      // src/domain/authorization)
      const workspacePath = defaultWorkspacePathForRole(data.user.role);
      if (workspacePath) {
        router.push(workspacePath);
      }
    } catch (err) {
      toast.error(errorMessage(err) ?? 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const ENTRY_META: Record<EntryPath, { title: string; icon: React.ComponentType<any>; badge: string }> = {
    professional: {
      title: 'Healthcare Professional',
      icon: Stethoscope,
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
    personal: {
      title: 'Personal Health',
      icon: HeartPulse,
      badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    },
  };
  const activeEntry = entryPath ? ENTRY_META[entryPath] : null;

  // L5 Authentication shell (design/aps-007-workspace-layouts.html): 45/55
  // split — brand/trust panel left, single-column form right, OTP-first.
  return (
    <div className="flex min-h-screen text-foreground">
      <Toaster position="top-right" />

      {/* Brand / trust panel — hidden below lg, per the split-shell's responsive collapse. */}
      <div className="relative hidden w-[45%] shrink-0 flex-col justify-between overflow-hidden bg-[#134E4A] p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E]/40 via-transparent to-transparent" />

        <div className="relative flex items-center space-x-2.5">
          <div className="rounded-xl border border-white/20 bg-white/10 p-2.5">
            <Heart className="h-6 w-6 fill-white/10 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Auriva</h1>
            <p className="text-[10px] font-semibold tracking-widest text-teal-200 uppercase">
              Unified Workspace Gateway
            </p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="max-w-sm text-3xl leading-tight font-bold tracking-tight">
            Healthcare, Simplified.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-teal-100/80">
            One platform connecting patients, doctors and clinics — booking, queueing and
            consultation in a single, calm workflow.
          </p>
          {/* Honest, verifiable facts about the platform itself — not
              fabricated usage numbers (APS-030 Principle 18). */}
          <div className="grid max-w-sm grid-cols-2 gap-4 pt-2">
            <TrustStat value="1" label="Platform, zero forks" />
            <TrustStat value="6" label="Organization archetypes" />
            <TrustStat value="9" label="Operational primitives" />
            <TrustStat value="AA" label="WCAG 2.2 accessible" />
          </div>
        </div>

        <p className="relative text-xs text-teal-200/60">
          &copy; {new Date().getFullYear()} Auriva Healthcare Platform.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-4">
        {/* Compact brand mark shown only when the trust panel is collapsed. */}
        <div className="mb-8 flex items-center space-x-2.5 lg:hidden">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
            <Heart className="h-6 w-6 fill-primary/10 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Auriva</h1>
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Unified Workspace Gateway
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">

          {/* Step 1: Entry Experience — replaces the old four-role picker.
              APS-030 §1.1/§6: no role dropdown, no generic "Login" — three
              paths, matching design/aps-031-entry-experience.html. */}
          {step === 'role' && (
            <motion.div
              key="entry-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="overflow-hidden rounded-2xl shadow-sm">
                <CardHeader className="px-6 pt-6 pb-2 text-center">
                  <CardTitle className="text-xl">Choose your path</CardTitle>
                  <CardDescription>Pick the door that&apos;s actually yours.</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 px-6 pt-2 pb-6">
                  {/* Healthcare Organization — pure navigation, no in-page auth step */}
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl" aria-hidden="true">🏥</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Healthcare Organization</p>
                        <p className="text-xs leading-tight text-muted-foreground">
                          Stand up your clinic, hospital, or chain on Auriva.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          <Link href="/register-org" className="text-xs font-medium text-primary hover:underline">
                            Create Organization &rarr;
                          </Link>
                          <Link href="/book-demo" className="text-xs font-medium text-primary hover:underline">
                            Book a demo first &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Healthcare Professional — invite-only, credentialed sign-in */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => handleEntrySelect('professional')}
                    className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <span className="text-xl" aria-hidden="true">👩‍⚕️</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Healthcare Professional</p>
                      <p className="text-xs leading-tight text-muted-foreground">
                        Joining a team that already runs on Auriva. Sign in &rarr;
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                        Have an invitation link? Open it directly from your email instead.
                      </p>
                    </div>
                  </motion.button>

                  {/* Personal Health — phone + OTP, account-last (no signup gate) */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => handleEntrySelect('personal')}
                    className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40"
                  >
                    <span className="text-xl" aria-hidden="true">❤️</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Personal Health</p>
                      <p className="text-xs leading-tight text-muted-foreground">
                        Book an appointment or sign in to manage your family&apos;s care.
                      </p>
                    </div>
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Auth Entry Form */}
          {step === 'auth' && activeEntry && (
            <motion.div
              key="auth-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="overflow-hidden rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 px-6 pt-6 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Back to entry"
                    onClick={() => setStep('role')}
                  >
                    <ArrowLeft />
                  </Button>
                  <div className="space-y-0.5">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className={`rounded-md p-1.5 ${activeEntry.badge}`}>
                        <activeEntry.icon className="h-4 w-4" />
                      </span>
                      <span>{activeEntry.title} sign in</span>
                    </CardTitle>
                    <CardDescription>
                      Access your secured Auriva profile environment.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="px-6 py-4">
                  {entryPath === 'personal' ? (
                    /* Patient Login Route (Twilio OTP send) */
                    <form onSubmit={handlePatientSendOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 555-019-9999"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="animate-spin" /> : <span>Send OTP via Twilio</span>}
                      </Button>
                    </form>
                  ) : (
                    /* Clinical/Staff login route (Email / Password) */
                    <form onSubmit={handleB2BLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Work Email</Label>
                        <div className="relative">
                          <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="username@domain.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pass">Secure Password</Label>
                        <div className="relative">
                          <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="pass"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <>
                            <span>Secure Sign In</span>
                            <ArrowRight />
                          </>
                        )}
                      </Button>

                      {/* Forgot Password / Magic Link — no reset or magic-link
                          backend exists yet (only OTP and email+password are
                          real integrations), so these are honest, non-fake
                          affordances rather than buttons wired to nothing. */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setShowForgotHelp((v) => !v)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          Email me a sign-in link
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                            Coming soon
                          </span>
                        </span>
                      </div>
                      {showForgotHelp && (
                        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                          Password resets aren&apos;t self-service yet — ask your organization owner to
                          reset it for you from People &rarr; Staff.
                        </p>
                      )}
                    </form>
                  )}
                </CardContent>

                <div className="px-6 pt-1 pb-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    {entryPath === 'personal'
                      ? 'Use +15550199999 for Alex Rivera (Patient), or any other number to create a new profile.'
                      : `Use the seeded demo email above — no password check yet.`
                    }
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Patient OTP Code Input */}
          {step === 'otp' && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="overflow-hidden rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 px-6 pt-6 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Back to sign in"
                    onClick={() => setStep('auth')}
                  >
                    <ArrowLeft />
                  </Button>
                  <div>
                    <CardTitle className="text-lg">Verify OTP code</CardTitle>
                    <CardDescription>
                      Enter the security verification code sent to your phone.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 px-6 py-4">
                  <form onSubmit={handlePatientVerifyOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="otp">6-Digit Security Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        pattern="\d*"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="py-5 text-center text-lg font-bold tracking-[0.3em]"
                        required
                      />
                    </div>

                    {/* Mock SMS Panel */}
                    {mockOtp && (
                      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Simulated Twilio SMS:</span>
                        </div>
                        <span className="rounded bg-background px-2 py-0.5 font-mono font-bold ring-1 ring-foreground/10">
                          {mockOtp}
                        </span>
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? <Loader2 className="animate-spin" /> : <span>Verify and Authenticate</span>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3b: Family Profile Selector — this phone number is linked to more than one Healthcare Profile */}
          {step === 'profile-select' && (
            <motion.div
              key="profile-select-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="overflow-hidden rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 px-6 pt-6 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Back to verification"
                    onClick={() => setStep('otp')}
                  >
                    <ArrowLeft />
                  </Button>
                  <div>
                    <CardTitle className="text-lg">Who&apos;s signing in?</CardTitle>
                    <CardDescription>
                      This phone number is linked to more than one Healthcare Profile.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 px-6 py-4">
                  {profileChoices.map((profile) => {
                    const age = ageFromDob(profile.date_of_birth);
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        disabled={loading}
                        onClick={() => handleSelectProfile(profile.id)}
                        className="flex w-full items-center justify-between rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
                      >
                        <div>
                          <p className="text-sm font-semibold">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile.gender ?? 'Gender not set'}
                            {age !== null ? ` · ${age}` : ''}
                            {profile.guardian_relation ? ` · ${profile.guardian_relation}'s dependent` : ''}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{profile.health_id}</span>
                      </button>
                    );
                  })}
                  {loading && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: AUTH-004 Patient Onboarding — new sign-ups only */}
          {step === 'onboarding' && pendingSession && (
            <motion.div
              key="onboarding-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="overflow-hidden rounded-2xl shadow-sm">
                <CardHeader className="px-6 pt-6 pb-2">
                  <div className="mb-3 flex gap-1.5">
                    <div className="h-1 flex-1 rounded-full bg-primary" />
                    <div className="h-1 flex-1 rounded-full bg-muted" />
                  </div>
                  <CardTitle className="text-xl">Tell us about you</CardTitle>
                  <CardDescription>This is what your doctors and clinics will see.</CardDescription>
                </CardHeader>

                <CardContent className="px-6 py-4">
                  <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="onboard-name">Full name</Label>
                      <Input
                        id="onboard-name"
                        placeholder="e.g. Ananya Sharma"
                        value={onboardName}
                        onChange={(e) => setOnboardName(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="onboard-dob">Date of birth</Label>
                        <Input
                          id="onboard-dob"
                          type="date"
                          value={onboardDob}
                          onChange={(e) => setOnboardDob(e.target.value)}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="onboard-gender">Gender</Label>
                        <select
                          id="onboard-gender"
                          value={onboardGender}
                          onChange={(e) => setOnboardGender(e.target.value)}
                          className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <option value="">Select</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="onboard-blood">
                        Blood group <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <select
                        id="onboard-blood"
                        value={onboardBloodGroup}
                        onChange={(e) => setOnboardBloodGroup(e.target.value)}
                        className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Select if known</option>
                        {['O-Positive', 'O-Negative', 'A-Positive', 'A-Negative', 'B-Positive', 'B-Negative', 'AB-Positive', 'AB-Negative'].map((bg) => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? <Loader2 className="animate-spin" /> : <span>Go to my dashboard</span>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
        </div>

        {/* Footer copyright — the trust panel already carries this above lg. */}
        <p className="mt-10 text-xs text-muted-foreground lg:hidden">
          &copy; {new Date().getFullYear()} Auriva Healthcare Platform.
        </p>
      </div>
    </div>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-teal-200/70">{label}</p>
    </div>
  );
}
