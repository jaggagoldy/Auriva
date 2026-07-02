'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  ShieldAlert, 
  Activity, 
  CheckCircle,
  Loader2,
  Stethoscope,
  Heart,
  Droplet,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface PatientDashboardProps {
  patientProfile: {
    id: string;
    full_name: string;
    blood_group: string;
    user_id: string;
  };
  user: {
    id: string;
    phone_number: string;
    email: string | null;
  };
  onLogout: () => void;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  scheduled_time: string;
  status: 'scheduled' | 'checked_in' | 'waiting' | 'doctor_ready' | 'in_consultation' | 'completed' | 'no_show' | 'cancelled';
  doctor: {
    id: string;
    full_name: string;
    specialty: string | null;
  };
  clinic: {
    id: string;
    name: string;
    address: string;
  };
}

interface Doctor {
  id: string;
  full_name: string;
  specialty: string | null;
  clinic_id: string;
  clinic: {
    id: string;
    name: string;
    address: string;
  };
}

export default function PatientDashboard({ patientProfile, user, onLogout }: PatientDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Booking State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [bookingTime, setBookingTime] = useState('');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fetch Appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments?patient_id=${patientProfile.id}`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      setAppointments(data);
    } catch (err: any) {
      toast.error('Could not load appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Doctors for Search
  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      if (!res.ok) throw new Error('Failed to fetch doctors');
      const data = await res.json();
      setDoctors(data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [patientProfile.id]);

  // Filter Doctors based on Search Query
  const filteredDoctors = doctors.filter(doc => 
    doc.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.specialty && doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
    doc.clinic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create Appointment (Booking)
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !bookingTime) {
      toast.error('Please select a doctor and appointment time');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientProfile.id,
          doctor_id: selectedDoctor.id,
          clinic_id: selectedDoctor.clinic_id,
          scheduled_time: new Date(bookingTime).toISOString(),
          status: 'scheduled'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to book appointment');
      }

      toast.success('Appointment booked successfully!', {
        description: `With ${selectedDoctor.full_name} on ${new Date(bookingTime).toLocaleDateString()}`
      });

      setIsBookingOpen(false);
      setSelectedDoctor(null);
      setBookingTime('');
      setSearchQuery('');
      
      // Refresh Appointments
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper formatting for status tags
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">Scheduled</Badge>;
      case 'waiting':
        return <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">In Waiting</Badge>;
      case 'in_consultation':
        return <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold animate-pulse">In Consultation</Badge>;
      case 'completed':
        return <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">Completed</Badge>;
      case 'checked_in':
        return <Badge className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">Checked In</Badge>;
      case 'doctor_ready':
        return <Badge className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">Doctor Ready</Badge>;
      case 'no_show':
        return <Badge className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">No Show</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">Cancelled</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border-none px-3 py-1 rounded-full text-xs font-semibold">{status}</Badge>;
    }
  };

  // Helper formatting for dates
  const formatAppointmentDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { day, time };
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 text-white font-sans">
      {/* Premium Dashboard Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <Heart className="h-5 w-5 text-indigo-400 fill-indigo-400/20" />
          </div>
          <span className="text-md font-bold bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
            AURA
          </span>
        </div>

        {/* Profile and Logout Actions */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-300">{patientProfile.full_name}</p>
            <p className="text-[10px] text-slate-500">{user.phone_number}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onLogout}
            className="rounded-full bg-slate-800/40 border border-slate-700/30 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 h-9 w-9 transition-all"
            title="Log Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-6">
        
        {/* Welcome & Stats Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/70 to-slate-900 p-6 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Activity className="h-28 w-28 text-indigo-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Patient Dashboard</p>
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight pt-0.5">
                Hello, {patientProfile.full_name.split(' ')[0]}!
              </h2>
              <p className="text-xs text-slate-400 mt-1">Keep track of your appointments and health history.</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/40 border border-slate-800/50 p-3 rounded-2xl flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Droplet className="h-5 w-5 text-rose-400 fill-rose-400/10" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Blood Group</p>
                  <p className="text-sm font-semibold text-slate-200">{patientProfile.blood_group}</p>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/50 p-3 rounded-2xl flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Appointments</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {appointments.filter(a => a.status === 'scheduled' || a.status === 'waiting' || a.status === 'in_consultation').length} Active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Book Doctor Action Button (Mobile-First Primary Call-to-action) */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogTrigger
            render={
              <Button className="w-full py-6.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-md">
                <Plus className="h-5 w-5" />
                <span>Book New Appointment</span>
              </Button>
            }
          />
          
          <DialogContent className="sm:max-w-md border border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl text-slate-100 rounded-3xl p-6 shadow-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-100 flex items-center space-x-2">
                <Stethoscope className="h-5 w-5 text-indigo-400" />
                <span>Search & Book Doctor</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Search available doctors in Aura Health clinics, choose your time, and schedule your appointment instantly.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleBookAppointment} className="space-y-4 py-3">
              {/* Doctor Search & Select */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Select Doctor & Clinic
                </Label>
                
                {!selectedDoctor ? (
                  <div className="space-y-2.5">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        type="text"
                        placeholder="Search doctor, specialty, or clinic..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs py-5 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                      />
                    </div>
                    
                    {/* Doctors List */}
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {filteredDoctors.length > 0 ? (
                        filteredDoctors.map(doc => (
                          <div 
                            key={doc.id}
                            onClick={() => setSelectedDoctor(doc)}
                            className="p-3 bg-slate-900/50 hover:bg-indigo-500/10 border border-slate-800/60 hover:border-indigo-500/30 rounded-xl cursor-pointer transition-all flex items-start justify-between"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-200">{doc.full_name}</p>
                              <p className="text-[10px] text-indigo-400">{doc.specialty || 'General Practitioner'}</p>
                              <p className="text-[9px] text-slate-500 flex items-center mt-1">
                                <MapPin className="h-2.5 w-2.5 mr-0.5 text-slate-600" />
                                {doc.clinic.name}
                              </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-600 self-center" />
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-xs text-slate-600 py-4">No doctors found matching search.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Selected Doctor Card */
                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-200">{selectedDoctor.full_name}</p>
                      <p className="text-[10px] text-indigo-400">{selectedDoctor.specialty || 'General Practitioner'}</p>
                      <p className="text-[9px] text-slate-400 flex items-center mt-1.5">
                        <MapPin className="h-2.5 w-2.5 mr-0.5 text-indigo-500" />
                        {selectedDoctor.clinic.name}
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setSelectedDoctor(null)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 px-2.5 py-1.5 h-auto rounded-lg"
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>

              {/* Date & Time Select */}
              <div className="space-y-2">
                <Label htmlFor="datetime" className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Select Date & Time
                </Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 py-6 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  type="submit" 
                  disabled={bookingLoading || !selectedDoctor || !bookingTime}
                  className="w-full py-5.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                  {bookingLoading ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <>
                      <span>Confirm Booking</span>
                      <CheckCircle className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Appointments List Header */}
        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Upcoming Appointments
          </h3>
          <span className="text-xs text-slate-500">
            {appointments.length} Total
          </span>
        </div>

        {/* Appointments Cards */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-slate-500">Loading appointments...</p>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-3">
            {appointments.map(appt => {
              const { day, time } = formatAppointmentDate(appt.scheduled_time);
              return (
                <div 
                  key={appt.id} 
                  className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-3 relative hover:border-slate-700/80 transition-all shadow-md"
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(appt.status)}
                  </div>

                  {/* Doctor Info */}
                  <div className="flex items-start space-x-3 pr-20">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mt-0.5">
                      <Stethoscope className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">{appt.doctor.full_name}</p>
                      <p className="text-xs text-indigo-400 font-medium">{appt.doctor.specialty || 'General Practitioner'}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-slate-800/60 w-full" />

                  {/* Date, Time, and Location Detail */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{day}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{time}</span>
                    </div>
                    <div className="col-span-2 flex items-start space-x-2 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight text-[11px]">
                        <strong>{appt.clinic.name}</strong> — {appt.clinic.address}
                      </span>
                    </div>
                  </div>

                  {/* Micro Actions (Cancel/Reschedule - Mocked) */}
                  <div className="flex items-center justify-end pt-1 space-x-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        toast.info("Rescheduling feature is handled by the Clinic Portal AI system.", {
                          description: "Clinic staff must approve time changes."
                        });
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-1.5 h-auto rounded-lg"
                    >
                      Reschedule
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        // Mock local list removal as a visual confirmation
                        setAppointments(prev => prev.filter(a => a.id !== appt.id));
                        toast.success("Appointment request cancelled", {
                          description: "Notifications sent to clinic reception."
                        });
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 h-auto rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-slate-900 border-dashed rounded-3xl py-12 px-6 text-center space-y-4">
            <ShieldAlert className="h-10 w-10 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-300">No appointments found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                You do not have any scheduled or past appointments yet. Book one to get started.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Floating emergency disclaimer */}
      <footer className="w-full text-center py-6 px-4 border-t border-slate-900 text-[10px] text-slate-600 bg-slate-950/20">
        <p className="max-w-xs mx-auto">
          In case of emergency, please dial your local emergency services directly. AURA does not handle urgent triage.
        </p>
      </footer>
    </div>
  );
}
