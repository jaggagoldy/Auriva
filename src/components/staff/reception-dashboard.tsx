"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDay } from "@/shared/queue";
import GlobalSearch from "@/components/staff/global-search";
import SummaryCards from "@/components/staff/summary-cards";
import DoctorAvailabilityPanel, { DoctorLoad } from "@/components/staff/doctor-availability-panel";
import WalkInModal from "@/components/staff/walkin-modal";
import BookAppointmentDialog from "@/components/staff/book-appointment-dialog";
import { DoctorOption } from "@/components/staff/doctor-filter";

interface DashboardSummary {
  clinic_id: string;
  total_today: number;
  counts: Record<string, number>;
  doctors: DoctorLoad[];
}

const POLL_INTERVAL_MS = 15_000;

export default function ReceptionDashboard() {
  const router = useRouter();
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reception/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: DashboardSummary = await res.json();
      setSummary(data);
      setError(null);
    } catch {
      setError("Could not load the dashboard.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (search.trim()) {
      router.push(`/staff/queue?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const doctorOptions: DoctorOption[] =
    summary?.doctors.map((d) => ({ id: d.id, full_name: d.full_name, specialty: d.specialty })) ?? [];

  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center gap-3 border-b px-6">
        <h1 className="text-sm font-semibold">Reception Dashboard</h1>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>{formatDay(new Date())}</span>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh dashboard"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              load();
            }}
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
          </Button>
        </div>
      </header>

      {error && summary === null ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw />
            Try again
          </Button>
        </div>
      ) : summary === null ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <main className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="max-w-md flex-1">
              <GlobalSearch
                value={search}
                onChange={setSearch}
                placeholder="Search patients by name or phone… (press Enter)"
              />
            </form>
            <BookAppointmentDialog clinicId={summary.clinic_id} doctors={doctorOptions} onBooked={load} />
            <WalkInModal clinicId={summary.clinic_id} doctors={doctorOptions} onRegistered={load} />
          </div>

          <SummaryCards totalToday={summary.total_today} counts={summary.counts} />

          <section className="rounded-xl border bg-card">
            <header className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Doctor Availability</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Today&apos;s caseload per doctor
              </p>
            </header>
            <div className="px-5">
              <DoctorAvailabilityPanel doctors={summary.doctors} />
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
