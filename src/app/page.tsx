'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Calendar, 
  ShieldCheck, 
  Users, 
  Activity, 
  ChevronRight, 
  ArrowRight,
  Database,
  Users2,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  } as const;

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  } as const;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-[#2563EB]/10 selection:text-[#2563EB]">
      
      {/* Sticky Glassmorphic Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-[#F8FAFC]/75 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 shadow-[0_0_15px_rgba(37,99,235,0.05)]">
            <Heart className="h-5 w-5 text-[#2563EB] fill-[#2563EB]/10" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1E293B] bg-gradient-to-r from-[#1E293B] to-[#2563EB]/80 bg-clip-text text-transparent">
            Auriva
          </span>
        </div>

        <Link href="/login" passHref legacyBehavior>
          <Button 
            variant="outline" 
            className="rounded-full px-5 border-slate-200 text-[#1E293B] hover:text-[#2563EB] hover:bg-[#2563EB]/5 font-medium transition-all"
          >
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-5xl mx-auto flex flex-col items-center text-center overflow-hidden">
        {/* Soft background mesh glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#2563EB]/5 via-[#14B8A6]/5 to-[#22C55E]/5 blur-3xl rounded-full pointer-events-none" />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-3xl relative z-10"
        >
          {/* Tagline Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/15 text-[#2563EB] text-xs font-semibold uppercase tracking-wider">
            <Activity className="h-3.5 w-3.5" />
            <span>Next-Gen Healthcare B2B2C</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants} 
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] md:leading-[1.08]"
          >
            Healthcare, <span className="bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#22C55E] bg-clip-text text-transparent">Simplified.</span>
          </motion.h1>

          <motion.p 
            variants={itemVariants} 
            className="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Find trusted doctors, book appointments, consult online, and manage your family's health—all in one place.
          </motion.p>

          <motion.div 
            variants={itemVariants} 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/login" passHref legacyBehavior>
              <Button className="w-full sm:w-auto px-8 py-6.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-2xl shadow-lg shadow-[#2563EB]/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-[15px]">
                <span>Get Started</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>

            <Link href="/login" passHref legacyBehavior>
              <Button variant="outline" className="w-full sm:w-auto px-8 py-6.5 bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-[#F8FAFC] font-semibold rounded-2xl active:scale-[0.98] transition-all text-[15px]">
                Book an Appointment
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="px-6 py-20 bg-slate-100/50 border-y border-slate-200/50">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Everything You Need for Better Healthcare
            </h2>
            <p className="text-sm md:text-md text-slate-500 max-w-lg mx-auto">
              Our B2B2C ecosystem links patients, clinical staff, and premium doctors seamlessly.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: Book Appointments */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="md:col-span-2 relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 flex flex-col justify-between min-h-[250px] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 w-fit">
                <Calendar className="h-6 w-6 text-[#2563EB]" />
              </div>
              <div className="space-y-2 mt-8">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                  Book Doctor Appointments
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                  Find experienced doctors near you and book in seconds. Select specialties, view available times, and secure your booking dynamically.
                </p>
              </div>
            </motion.div>

            {/* Feature 2: Digital Health Records */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 flex flex-col justify-between min-h-[250px] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 w-fit">
                <Database className="h-6 w-6 text-[#14B8A6]" />
              </div>
              <div className="space-y-2 mt-8">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#14B8A6] transition-colors">
                  Digital Health Records
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Keep prescriptions, reports, and history securely in one place. Easy access, encrypted storage.
                </p>
              </div>
            </motion.div>

            {/* Feature 3: Family Health */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 flex flex-col justify-between min-h-[250px] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 w-fit">
                <Users2 className="h-6 w-6 text-[#22C55E]" />
              </div>
              <div className="space-y-2 mt-8">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#22C55E] transition-colors">
                  Family Health
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Manage appointments and medical records for your entire family under a single unified dashboard.
                </p>
              </div>
            </motion.div>

            {/* Feature 4: Smart Clinic Management (B2B Highlight) */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="md:col-span-2 relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 flex flex-col justify-between min-h-[250px] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <Building className="h-32 w-32 text-[#2563EB]" />
              </div>
              <div className="p-3 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 w-fit">
                <Building className="h-6 w-6 text-[#2563EB]" />
              </div>
              <div className="space-y-2 mt-8 relative z-10">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                  Smart Clinic Management
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
                  (B2B SaaS Portal) Complete workspace control for clinical staff. Queue, billing, receptionist workflows, and prescription management for modern hospitals.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-slate-900 text-white py-10 px-6 border-b border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#2563EB] via-[#14B8A6] to-[#22C55E]" />
        
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
          <div className="w-full py-4 md:py-0 md:px-6">
            <h4 className="text-2xl md:text-3xl font-extrabold text-white">500+</h4>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Verified Doctors</p>
          </div>
          <div className="w-full py-4 md:py-0 md:px-6">
            <h4 className="text-2xl md:text-3xl font-extrabold text-[#14B8A6]">25+</h4>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Specialties</p>
          </div>
          <div className="w-full py-4 md:py-0 md:px-6">
            <h4 className="text-2xl md:text-3xl font-extrabold text-[#22C55E]">10,000+</h4>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Happy Patients</p>
          </div>
          <div className="w-full py-4 md:py-0 md:px-6">
            <h4 className="text-2xl md:text-3xl font-extrabold text-[#2563EB] flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-6 w-6 text-[#2563EB]" />
              <span>99.9%</span>
            </h4>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Secure Platform</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white px-6 py-16">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-[#2563EB]/20 border border-[#2563EB]/30">
                <Heart className="h-4 w-4 text-[#2563EB] fill-[#2563EB]/10" />
              </div>
              <span className="text-md font-bold text-white">Auriva</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              At Auriva, we believe quality healthcare should be simple, accessible, and trusted.
            </p>
          </div>

          <div className="text-left md:text-right md:self-end">
            <p className="text-indigo-200/50 italic text-[11px]">
              "Because every healthy life begins with the right care."
            </p>
            <p className="text-slate-600 text-[10px] mt-4">
              &copy; {new Date().getFullYear()} Auriva Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
