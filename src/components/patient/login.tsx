'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Lock, Heart, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: (patientProfile: any, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [phoneNumber, setPhoneNumber] = useState('+15550199999'); // default mock user
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [mockOtpSent, setMockOtpSent] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send OTP');
      }

      setMockOtpSent(data.otp);
      setStep('otp');
      toast.success('Security code sent via Twilio (Simulated)', {
        description: `Check the helper badge on your screen for the verification code.`,
      });
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, code: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid verification code');
      }

      toast.success('Successfully Authenticated', {
        description: `Welcome back, ${data.patientProfile.full_name}!`,
      });

      // Pass success details up
      onLoginSuccess(data.patientProfile, data.user);
    } catch (error: any) {
      toast.error(error.message || 'Invalid code. Enter 123456 to test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Platform Branding */}
      <div className="flex items-center space-x-2 mb-8 animate-fade-in">
        <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Heart className="h-7 w-7 text-indigo-400 fill-indigo-400/20" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            AURA Health
          </h1>
          <p className="text-[10px] text-indigo-300/60 uppercase tracking-widest font-semibold">
            B2B2C Patient Hub
          </p>
        </div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        
        <CardHeader className="pt-8 pb-4 px-6 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-100">
            {step === 'phone' ? 'Welcome Back' : 'Verify Your Identity'}
          </CardTitle>
          <CardDescription className="text-sm text-slate-400 pt-1">
            {step === 'phone'
              ? 'Enter your mobile number to sign in or register instantly.'
              : `We sent a security code to your phone number ${phoneNumber}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 py-4">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mobile Number
                </Label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Phone className="h-4.5 w-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 555-019-9999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10.5 py-6 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 rounded-2xl focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all font-mono"
                    required
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  6-Digit OTP Code
                </Label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </span>
                  <Input
                    id="otp"
                    type="text"
                    pattern="\d*"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-10.5 py-6 bg-slate-950/50 border-slate-800 text-slate-100 placeholder:text-slate-600 tracking-[0.3em] text-center font-bold text-lg rounded-2xl focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Mock OTP Helper Badge */}
              {mockOtpSent && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between text-xs text-indigo-300">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                    <span>Mock Twilio SMS Output:</span>
                  </div>
                  <span className="font-mono font-bold bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-200">
                    {mockOtpSent}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>Verify & Continue</span>}
              </Button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-center text-xs text-slate-500 hover:text-indigo-400 transition-colors pt-2"
              >
                Back to Mobile Number
              </button>
            </form>
          )}
        </CardContent>

        <CardFooter className="px-6 pb-8 pt-2 flex flex-col text-center space-y-1">
          <p className="text-[10px] text-slate-600">
            For testing locally, use phone number <span className="text-slate-500 font-mono">+15550199999</span> (Alex Rivera) or enter any phone number to create a new profile. The OTP code is always <span className="text-slate-500 font-mono">123456</span>.
          </p>
        </CardFooter>
      </Card>

      {/* Footer copyright */}
      <p className="text-xs text-slate-600 mt-8">
        &copy; {new Date().getFullYear()} AURA Platform. All rights reserved.
      </p>
    </div>
  );
}
