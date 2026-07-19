"use client";

// PKG-3 Today — a calm landing: daybar → Quick Actions → the waiting list.
// The consult itself lives on the Workbench tab; selecting a patient here opens
// it. (Previously Today showed the full 3-column consult inline.)

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Appointment, isToday, getInitials } from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";
import MissionControlBar from "@/components/doctor/mission-control-bar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Inbox } from "lucide-react";

const POLL_INTERVAL_MS = 8_000;

export default function DoctorToday() {
  const doctor = useDoctorSession();
  const router = useRouter();
  const [appointments, setAppointments] = React.useState<Appointment[] | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);

  const loadQueue = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments?doctor_id=${doctor.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setAppointments(await res.json());
      setLastSyncedAt(new Date());
    } catch {
      /* keep last-known queue visible */
    } finally {
      setRefreshing(false);
    }
  }, [doctor.id]);

  React.useEffect(() => {
    loadQueue();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadQueue();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const todayAppointments = React.useMemo(
    () => (appointments ?? []).filter((a) => isToday(a.scheduled_time)),
    [appointments]
  );

  const waiting = React.useMemo(
    () =>
      todayAppointments
        .filter((a) => a.status === "waiting" || a.status === "doctor_ready" || a.status === "in_consultation")
        .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()),
    [todayAppointments]
  );

  const nextUp = React.useMemo(
    () =>
      todayAppointments.find((a) => a.status === "doctor_ready") ??
      todayAppointments.filter((a) => a.status === "waiting").sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ??
      null,
    [todayAppointments]
  );

  const openWorkbench = (id?: string) =>
    router.push(id ? `/doctor/workbench?appointment=${id}` : "/doctor/workbench");

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MissionControlBar
        doctorName={doctor.full_name}
        clinicName={doctor.clinic.name}
        todayAppointments={todayAppointments}
        nextUp={nextUp}
        refreshing={refreshing}
        lastSyncedAt={lastSyncedAt}
        onRefresh={() => {
          setRefreshing(true);
          loadQueue();
        }}
        onCallIn={(a) => openWorkbench(a.id)}
        updating={false}
      />

      {/* PKG-3 Quick actions */}
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </span>
        <Button variant="outline" size="sm" onClick={() => openWorkbench()}>
          Start consultation
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/doctor/schedule")}>
          Open schedule
        </Button>
        <Button variant="outline" size="sm" onClick={() => toast("Pause booking is a clinic-wide setting.")}>
          Pause booking
        </Button>
      </div>

      {/* PKG-3 waiting list — select a patient to open the Consult Workbench */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-5 py-3 text-sm font-semibold text-honey-deep">
            <span className="size-1.5 rounded-full bg-honey" />
            Waiting · {waiting.length}
          </div>
          {appointments === null ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : waiting.length === 0 ? (
            <EmptyState icon={Inbox} title="No one waiting" description="Patients appear here as reception checks them in." className="border-0" />
          ) : (
            <>
              <div className="divide-y">
                {waiting.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => openWorkbench(a.id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                      #{a.queue_number ?? i + 1}
                    </span>
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs font-semibold">{getInitials(a.patient.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {a.patient.full_name}
                        {a.status === "in_consultation" && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                            In consult
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{a.patient.blood_group}</div>
                    </div>
                    <div className="hidden max-w-[45%] truncate text-right text-xs text-muted-foreground sm:block">
                      {a.notes || "—"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t py-3 text-center text-xs text-muted-foreground">
                Select a patient to open the Consult Workbench &rarr;
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
