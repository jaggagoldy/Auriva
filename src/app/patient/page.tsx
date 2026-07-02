'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PatientDashboard from '@/components/patient/dashboard';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

export default function PatientPage() {
  const router = useRouter();
  const [session, setSession] = useState<{
    patientProfile: any;
    user: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('aura_patient_session');
      if (cached) {
        setSession(JSON.parse(cached));
      } else {
        // No session found, redirect to login gate
        router.push('/login');
      }
    } catch (e) {
      console.error('Failed to parse cached session', e);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('aura_patient_session');
    router.push('/login');
  };

  if (loading || (!session && typeof window !== 'undefined')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0f172a', // Slate 900
            border: '1px solid #1e293b', // Slate 800
            color: '#f8fafc', // Slate 50
          },
        }}
      />
      {session && (
        <PatientDashboard 
          patientProfile={session.patientProfile} 
          user={session.user} 
          onLogout={handleLogout} 
        />
      )}
    </>
  );
}
