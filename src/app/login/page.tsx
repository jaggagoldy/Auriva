'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShieldAlert, 
  Stethoscope, 
  ClipboardList, 
  Phone, 
  Lock, 
  Mail, 
  ArrowLeft, 
  ArrowRight,
  Heart,
  Loader2,
  Sparkles
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Role = 'patient' | 'super_admin' | 'doctor' | 'receptionist';

interface RoleOption {
  id: Role;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  hoverColor: string;
  borderColor: string;
}

export default function UnifiedLoginGateway() {
  const router = useRouter();
  
  // Navigation & Step states
  const [step, setStep] = useState<'role' | 'auth' | 'otp'>('role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Form states
  const [phoneNumber, setPhoneNumber] = useState('+15550199999');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // seed mock password
  
  const [loading, setLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState<string | null>(null);

  const roles: RoleOption[] = [
    {
      id: 'patient',
      title: 'Patient',
      description: 'Manage your health & family',
      icon: User,
      color: 'bg-[#2563EB]/10 text-[#2563EB]',
      hoverColor: 'hover:bg-[#2563EB]/15',
      borderColor: 'border-[#2563EB]/25'
    },
    {
      id: 'super_admin',
      title: 'Superadmin',
      description: 'Manage hospital workspace',
      icon: ShieldAlert,
      color: 'bg-[#14B8A6]/10 text-[#14B8A6]',
      hoverColor: 'hover:bg-[#14B8A6]/15',
      borderColor: 'border-[#14B8A6]/25'
    },
    {
      id: 'doctor',
      title: 'Doctor',
      description: 'Clinical portal & prescriptions',
      icon: Stethoscope,
      color: 'bg-[#22C55E]/10 text-[#22C55E]',
      hoverColor: 'hover:bg-[#22C55E]/15',
      borderColor: 'border-[#22C55E]/25'
    },
    {
      id: 'receptionist',
      title: 'Staff',
      description: 'Billing, queue, & scheduling',
      icon: ClipboardList,
      color: 'bg-indigo-500/10 text-indigo-500',
      hoverColor: 'hover:bg-indigo-500/15',
      borderColor: 'border-indigo-500/25'
    }
  ];

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setStep('auth');
    if (role !== 'patient') {
      // Prefill default email for testing convenience
      if (role === 'super_admin') setEmail('admin@aegiscare.com');
      else if (role === 'doctor') setEmail('dr.smith@aegiscare.com');
      else if (role === 'receptionist') setEmail('staff@aegiscare.com');
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
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, code: otpCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid code');

      // Successful Patient Login
      toast.success(`Welcome, ${data.patientProfile.full_name}!`);
      localStorage.setItem('aura_patient_session', JSON.stringify({
        patientProfile: data.patientProfile,
        user: data.user
      }));

      // Redirect to Patient Dashboard
      router.push('/patient');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Try 123456.');
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
        body: JSON.stringify({ email, role: selectedRole })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      toast.success(`Authenticated successfully as ${selectedRole}`);
      localStorage.setItem('aura_b2b_session', JSON.stringify({
        user: data.user,
        profile: data.staffProfile
      }));

      // Redirect based on role
      if (selectedRole === 'super_admin') {
        router.push('/admin');
      } else if (selectedRole === 'doctor') {
        router.push('/doctor');
      } else if (selectedRole === 'receptionist') {
        router.push('/staff/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const activeRoleOption = roles.find(r => r.id === selectedRole);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 text-white font-sans">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0f172a',
            border: '1px solid #1e293b',
            color: '#f8fafc',
          },
        }}
      />
      
      {/* Brand Icon */}
      <div className="flex items-center space-x-2.5 mb-8">
        <div className="p-2.5 rounded-2xl bg-[#2563EB]/25 border border-[#2563EB]/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
          <Heart className="h-7 w-7 text-[#2563EB] fill-[#2563EB]/10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Auriva</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Unified Workspace Gateway</p>
        </div>
      </div>

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          
          {/* Step 1: Role Selector */}
          {step === 'role' && (
            <motion.div
              key="role-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#22C55E]" />
                
                <CardHeader className="pt-8 pb-4 text-center">
                  <CardTitle className="text-2xl font-semibold tracking-tight text-slate-100">Select Your Workspace</CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-1">
                    Choose your role in the Auriva platform to access the portal dashboard.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <motion.div
                        key={role.id}
                        whileHover={{ y: -3 }}
                        onClick={() => handleRoleSelect(role.id)}
                        className={`p-4.5 bg-slate-950/40 border border-slate-800 hover:${role.borderColor} rounded-2xl cursor-pointer transition-all flex flex-col justify-between min-h-[135px] group`}
                      >
                        <div className={`p-2.5 rounded-xl ${role.color} w-fit`}>
                          <Icon className="h-5.5 w-5.5" />
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{role.title}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{role.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Auth Entry Form */}
          {step === 'auth' && activeRoleOption && (
            <motion.div
              key="auth-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#22C55E]" />

                <CardHeader className="pt-8 pb-4 px-6 flex flex-row items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setStep('role')}
                    className="h-8 w-8 rounded-full border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="space-y-0.5">
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
                      <span className={`p-1.5 rounded-lg ${activeRoleOption.color} mr-1 text-xs`}>
                        <activeRoleOption.icon className="h-4 w-4" />
                      </span>
                      <span>{activeRoleOption.title} Portal Sign In</span>
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Access your secured Auriva profile environment.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="px-6 py-4">
                  {selectedRole === 'patient' ? (
                    /* Patient Login Route (Twilio OTP send) */
                    <form onSubmit={handlePatientSendOtp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                          Mobile Number
                        </Label>
                        <div className="relative group">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <Phone className="h-4 w-4 text-slate-500 group-focus-within:text-[#2563EB]" />
                          </span>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 555-019-9999"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-10 py-5 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                            required
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-medium rounded-xl shadow-lg flex items-center justify-center space-x-2 text-xs"
                      >
                        {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Send OTP via Twilio</span>}
                      </Button>
                    </form>
                  ) : (
                    /* Clinical/Staff login route (Email / Password) */
                    <form onSubmit={handleB2BLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                          Work Email
                        </Label>
                        <div className="relative group">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <Mail className="h-4 w-4 text-slate-500" />
                          </span>
                          <Input
                            id="email"
                            type="email"
                            placeholder="username@domain.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 py-5 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="pass" className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                            Secure Password
                          </Label>
                        </div>
                        <div className="relative group">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <Lock className="h-4 w-4 text-slate-500" />
                          </span>
                          <Input
                            id="pass"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 py-5 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-xl focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                            required
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-medium rounded-xl shadow-lg flex items-center justify-center space-x-2 text-xs"
                      >
                        {loading ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <>
                            <span>Secure Sign In</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>

                <div className="px-6 pb-6 pt-2 text-center">
                  <p className="text-[10px] text-slate-500">
                    {selectedRole === 'patient' 
                      ? 'Note: Use +15550199999 for Alex Rivera (Patient).' 
                      : `Use standard email ${email} for seeded B2B demo profile.`
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#22C55E]" />

                <CardHeader className="pt-8 pb-4 px-6 flex flex-row items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setStep('auth')}
                    className="h-8 w-8 rounded-full border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-100">Verify OTP Code</CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Enter the security verification code sent to your phone.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="px-6 py-4 space-y-4">
                  <form onSubmit={handlePatientVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        6-Digit Security Code
                      </Label>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-500" />
                        </span>
                        <Input
                          id="otp"
                          type="text"
                          pattern="\d*"
                          maxLength={6}
                          placeholder="Enter 6-digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                          className="pl-10 py-6 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 tracking-[0.3em] text-center font-bold text-lg rounded-xl focus-visible:ring-1 focus-visible:ring-[#2563EB]"
                          required
                        />
                      </div>
                    </div>

                    {/* Mock SMS Panel */}
                    {mockOtp && (
                      <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-2xl flex items-center justify-between text-xs text-indigo-300">
                        <div className="flex items-center space-x-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Simulated Twilio SMS:</span>
                        </div>
                        <span className="font-mono font-bold bg-[#2563EB]/20 px-2.5 py-0.5 rounded text-indigo-200">
                          {mockOtp}
                        </span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-medium rounded-xl shadow-lg flex items-center justify-center space-x-2 text-xs"
                    >
                      {loading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Verify and Authenticate</span>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer copyright */}
      <p className="text-xs text-slate-600 mt-12">
        &copy; {new Date().getFullYear()} Auriva Healthcare platform. Secure local SSL encryption verified.
      </p>
    </div>
  );
}
